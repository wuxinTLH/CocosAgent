import fs from 'node:fs';
import path from 'node:path';
import { resolveInside } from './sandbox.js';

export type MathFindingCategory = 'transform' | 'ray' | 'vector' | 'performance';

export interface MathFinding {
  line: number;
  category: MathFindingCategory;
  severity: 'info' | 'warning';
  message: string;
  suggestion: string;
}

export interface MathAnalysisFile {
  path: string;
  language: 'typescript' | 'javascript' | 'cpp' | 'c';
  findings: MathFinding[];
}

export interface MathAnalysisResult {
  files: MathAnalysisFile[];
  findingCount: number;
  scannedAtUtc8: string;
}

const SOURCE_EXTENSIONS = new Map<string, MathAnalysisFile['language']>([
  ['.ts', 'typescript'], ['.tsx', 'typescript'], ['.js', 'javascript'], ['.jsx', 'javascript'],
  ['.cpp', 'cpp'], ['.cc', 'cpp'], ['.cxx', 'cpp'], ['.h', 'c'], ['.hpp', 'cpp'], ['.c', 'c'],
]);
const SCAN_DIRS = ['assets', 'native', 'plugins'];
const SKIP_DIRS = new Set(['library', 'temp', 'build', 'node_modules', '.git']);

function nowUtc8(): string {
  const value = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, '');
  return `${value}+08:00`;
}

function languageFor(file: string): MathAnalysisFile['language'] | undefined {
  return SOURCE_EXTENSIONS.get(path.extname(file).toLowerCase());
}

function collectFiles(root: string, requested?: string): string[] {
  if (requested) {
    const file = resolveInside(root, requested);
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new Error(`MATH_SOURCE_NOT_FOUND: ${requested}`);
    if (!languageFor(file)) throw new Error(`MATH_SOURCE_EXTENSION_NOT_SUPPORTED: ${requested}`);
    return [file];
  }
  const files: string[] = [];
  const walk = (dir: string): void => {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && languageFor(full)) files.push(full);
    }
  };
  for (const directory of SCAN_DIRS) walk(path.join(root, directory));
  return files.sort();
}

function findingsFor(text: string): MathFinding[] {
  const findings: MathFinding[] = [];
  const patterns: Array<[RegExp, MathFindingCategory, MathFinding['severity'], string, string]> = [
    [/\b(?:transform|Transform)\s*\(/, 'transform', 'info', '发现变换调用', '在循环中缓存 Mat4/Transform，避免重复构造临时对象'],
    [/\b(?:Mat4|mat4)\.(?:invert|inverse)|\binvert\s*\(/, 'transform', 'warning', '发现矩阵求逆操作', '确认矩阵未在每帧重复求逆，并缓存可复用的逆矩阵'],
    [/\b(?:Ray|ray)\b.*(?:intersect|hit)|(?:intersect|hit).*\b(?:Ray|ray)\b/, 'ray', 'info', '发现 Ray 相交计算', '复用 Ray、法线化方向并优先使用 AABB/平面快速剔除'],
    [/\b(?:Vec3|Vec4|Vector3|Vector4)\s*\(/, 'vector', 'info', '发现向量临时对象构造', '在热路径复用 Vec3/Vec4，减少逐帧分配和垃圾回收压力'],
    [/\b(?:normalize|normalized)\s*\(/, 'vector', 'info', '发现向量归一化', '确认长度可缓存，避免重复 sqrt/normalize；批量计算时评估 SIMD'],
    [/\b(?:sqrt|Math\.sqrt)\s*\(/, 'performance', 'info', '发现平方根计算', '优先比较平方距离，只有需要真实长度时才执行 sqrt'],
  ];
  text.split(/\r?\n/).forEach((line, index) => {
    for (const [pattern, category, severity, message, suggestion] of patterns) {
      if (pattern.test(line)) findings.push({ line: index + 1, category, severity, message, suggestion });
    }
  });
  return findings;
}

export function analyzeMath(root: string, requested?: string): MathAnalysisResult {
  const files = collectFiles(root, requested).map((file): MathAnalysisFile => ({
    path: path.relative(root, file).replace(/\\/g, '/'),
    language: languageFor(file) as MathAnalysisFile['language'],
    findings: findingsFor(fs.readFileSync(file, 'utf8')),
  }));
  return { files, findingCount: files.reduce((total, file) => total + file.findings.length, 0), scannedAtUtc8: nowUtc8() };
}
