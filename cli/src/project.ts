import fs from 'node:fs';
import path from 'node:path';
import { nowUtc8 } from './memory.js';

export function initProjectConstraints(
  agentRoot: string,
  name: string,
  targetProjectRoot = agentRoot,
  creatorVersion = '3.8.x',
): string {
  const safeName = name.trim().replace(/[\\/:*?"<>|]/g, '-');
  if (!safeName) {
    throw new Error('MISSING_ARG: project name');
  }
  const templateFile = path.join(agentRoot, 'templates', 'PROJECT_CONSTRAINTS.md');
  if (!fs.existsSync(templateFile)) {
    throw new Error(`TEMPLATE_NOT_FOUND: ${templateFile}`);
  }
  const template = fs.readFileSync(templateFile, 'utf8');
  const targetDir = path.join(agentRoot, 'docs', 'constraints');
  fs.mkdirSync(targetDir, { recursive: true });
  const target = path.join(targetDir, `PROJECT-${safeName}.md`);
  const content = template
    .replaceAll('<项目名>', name)
    .replaceAll('<绝对路径>', targetProjectRoot.replace(/\\/g, '/'))
    .replaceAll('<YYYY-MM-DDTHH:mm:ss+08:00>', nowUtc8())
    .replaceAll('<3.8.x>', creatorVersion);
  fs.writeFileSync(target, content, 'utf8');
  return target;
}
