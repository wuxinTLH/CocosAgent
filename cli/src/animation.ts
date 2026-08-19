import fs from 'node:fs';
import path from 'node:path';
import { runOcr, type OcrEngine } from './ocr.js';
import { resolveInside } from './sandbox.js';

export interface AnimationSummary {
  path: string;
  name: string;
  duration: number | null;
  sample: number | null;
  trackCount: number;
  eventCount: number;
}

export interface AnimationTransition {
  from: string;
  to: string;
  trigger: string;
}

export interface AnimationStateMachine {
  initial: string;
  states: string[];
  transitions: AnimationTransition[];
}

interface JsonObject { [key: string]: unknown; }

function asObject(value: unknown): JsonObject | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : undefined;
}

function requireAnimPath(root: string, relPath: string): string {
  if (!relPath.endsWith('.anim')) throw new Error('ANIMATION_EXTENSION_REQUIRED: .anim');
  const file = resolveInside(root, relPath);
  if (!fs.existsSync(file)) throw new Error(`ANIMATION_NOT_FOUND: ${relPath}`);
  return file;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function countCollections(value: unknown, predicate: (key: string) => boolean): number {
  if (!value || typeof value !== 'object') return 0;
  if (Array.isArray(value)) return value.reduce((total, item) => total + countCollections(item, predicate), 0);
  return Object.entries(value as JsonObject).reduce((total, [key, child]) => {
    const own = predicate(key) && Array.isArray(child) ? child.length : 0;
    return total + own + countCollections(child, predicate);
  }, 0);
}

/** Read a Cocos Creator animation asset without modifying its editor-managed JSON. */
export function analyzeAnimation(root: string, relPath: string): AnimationSummary {
  const file = requireAnimPath(root, relPath);
  const parsed: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  const source = asObject(parsed);
  if (!source) throw new Error('ANIMATION_FORMAT_INVALID: expected JSON object');
  const name = typeof source._name === 'string' ? source._name : path.basename(relPath, '.anim');
  return {
    path: relPath,
    name,
    duration: numberValue(source._duration),
    sample: numberValue(source._sample),
    trackCount: countCollections(source, (key) => key === '_tracks' || key === 'tracks'),
    eventCount: countCollections(source, (key) => key === '_events' || key === 'events'),
  };
}

function normalizedState(value: unknown): string {
  if (typeof value !== 'string') throw new Error('ANIMATION_STATE_INVALID');
  const state = value.trim();
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(state)) throw new Error(`ANIMATION_STATE_INVALID: ${value}`);
  return state;
}

/** Validate a state transition definition such as idle -> run -> jump. */
export function validateStateMachine(value: unknown): AnimationStateMachine {
  const source = asObject(value);
  if (!source || !Array.isArray(source.states) || !Array.isArray(source.transitions)) {
    throw new Error('ANIMATION_STATE_MACHINE_INVALID');
  }
  const states = [...new Set(source.states.map(normalizedState))];
  if (!states.length) throw new Error('ANIMATION_STATE_MACHINE_EMPTY');
  const initial = normalizedState(source.initial ?? states[0]);
  if (!states.includes(initial)) throw new Error(`ANIMATION_INITIAL_STATE_UNKNOWN: ${initial}`);
  const transitions = source.transitions.map((item) => {
    const transition = asObject(item);
    if (!transition) throw new Error('ANIMATION_TRANSITION_INVALID');
    const from = normalizedState(transition.from);
    const to = normalizedState(transition.to);
    const trigger = normalizedState(transition.trigger ?? to);
    if (!states.includes(from) || !states.includes(to)) throw new Error('ANIMATION_TRANSITION_STATE_UNKNOWN');
    return { from, to, trigger };
  });
  return { initial, states, transitions };
}

/** Build non-destructive optimization suggestions for an analyzed animation. */
export function optimizeAnimation(summary: AnimationSummary): { summary: AnimationSummary; suggestions: string[] } {
  const suggestions: string[] = [];
  if (summary.duration === null || summary.duration <= 0) suggestions.push('动画时长缺失或为零；请在 Cocos Creator Animation 编辑器中设置有效时长。');
  if (summary.sample !== null && summary.sample < 24) suggestions.push('采样率低于 24 FPS；确认是否会造成可见抖动。');
  if (summary.trackCount === 0) suggestions.push('未发现轨道；确认该 .anim 是由 Cocos Creator 生成且绑定了目标属性。');
  if (summary.eventCount === 0) suggestions.push('未定义动画事件；如需落地、攻击命中等时机，可在编辑器中添加 AnimationEvent。');
  if (!suggestions.length) suggestions.push('未发现静态结构问题；继续在编辑器预览中检查混合、循环和根节点位移。');
  return { summary, suggestions };
}

/** OCR a project-local screenshot and return valid animation state candidates. */
export async function recognizeAnimationStates(root: string, image: string, region?: string, engine?: OcrEngine): Promise<{ states: string[]; engine: OcrEngine }> {
  const result = await runOcr(root, image, region, engine);
  const states = [...new Set(result.items.map((item) => item.text.trim()).filter((item) => /^[A-Za-z][A-Za-z0-9_]*$/.test(item)))];
  return { states, engine: result.engine };
}

/** Generate a Cocos Creator Animation component using only public engine APIs. */
export function createAnimationController(root: string, relPath: string, className: string, definition: unknown): { file: string; machine: AnimationStateMachine } {
  if (!/^[A-Z][A-Za-z0-9_]*$/.test(className)) throw new Error(`ANIMATION_CLASS_NAME_INVALID: ${className}`);
  const file = resolveInside(root, relPath);
  if (!file.endsWith('.ts')) throw new Error('ANIMATION_CONTROLLER_EXTENSION_REQUIRED: .ts');
  const machine = validateStateMachine(definition);
  const stateUnion = machine.states.map((state) => `'${state}'`).join(' | ');
  const code = `import { _decorator, Animation, Component } from 'cc';\n\nconst { ccclass, property } = _decorator;\n\nexport type ${className}State = ${stateUnion};\n\n@ccclass('${className}')\nexport class ${className} extends Component {\n  @property(Animation)\n  public animation: Animation | null = null;\n\n  private currentState: ${className}State = '${machine.initial}';\n\n  public playState(next: ${className}State): void {\n    if (next === this.currentState) return;\n    this.currentState = next;\n    this.animation?.crossFade(next, 0.12);\n  }\n\n  public trigger(triggerName: string): void {\n    switch (this.currentState + ':' + triggerName) {\n${machine.transitions.map((item) => `      case '${item.from}:${item.trigger}':\n        this.playState('${item.to}');\n        break;`).join('\n')}\n      default:\n        break;\n    }\n  }\n}\n`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, code, 'utf8');
  return { file, machine };
}
