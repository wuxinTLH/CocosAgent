import fs from 'node:fs';
import path from 'node:path';

export interface ExecutionRecord {
  id: string;
  hash: string;
  startUtc8: string;
  endUtc8: string;
  request: string;
  reasoning: string;
  plan: string[];
  timeline: Array<{ time: string; event: string }>;
  result: string;
  files: string[];
  nextSteps: string[];
  status?: string;
}

interface ShortRow {
  hash: string;
  startUtc8: string;
  request: string;
}

export function nowUtc8(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const pick = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${pick('year')}-${pick('month')}-${pick('day')}T${pick('hour')}:${pick('minute')}:${pick('second')}+08:00`;
}

const LONG_HEADER = `# LONG_MEMORY 长期记忆

规则：

- 每一次 Agent 执行完成后必须追加一条记录。
- 每条记录包含：请求、推理、计划、时间线（UTC+8）、任务 hash、结果。
- 记录只追加、不删除；修正错误时追加修正记录。
- 任务 hash 按 [HASH.md](HASH.md) 计算。

## 执行记录
`;

const SHORT_HEADER = `# SHORT_MEMORY 短期记忆

规则：

- 只保留最近 10 次 Agent 执行，最新在前。
- 每次执行必须携带任务 hash 与 UTC+8 时间。
- 详细内容见 [LONG_MEMORY.md](LONG_MEMORY.md)。

## 最近执行记录
`;

export function ensureMemoryFiles(root: string): void {
  const longFile = path.join(root, 'LONG_MEMORY.md');
  const shortFile = path.join(root, 'SHORT_MEMORY.md');
  if (!fs.existsSync(longFile)) {
    fs.writeFileSync(longFile, LONG_HEADER, 'utf8');
  }
  if (!fs.existsSync(shortFile)) {
    fs.writeFileSync(shortFile, `${SHORT_HEADER}\n\n_暂无执行记录_\n`, 'utf8');
  }
}

export function countLongMemory(root: string): number {
  const file = path.join(root, 'LONG_MEMORY.md');
  if (!fs.existsSync(file)) {
    return 0;
  }
  const text = fs.readFileSync(file, 'utf8');
  const matches = text.match(/^### AGT-\d+/gm);
  return matches?.length ?? 0;
}

export function nextAgentId(root: string): string {
  const stamp = nowUtc8().slice(0, 10).replace(/-/g, '');
  const sequence = countLongMemory(root) + 1;
  return `AGT-${stamp}-${String(sequence).padStart(3, '0')}`;
}

function escapePipe(value: string): string {
  return value.replace(/\|/g, '\\|');
}

function readShortRows(file: string): ShortRow[] {
  if (!fs.existsSync(file)) {
    return [];
  }
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const rows: ShortRow[] = [];
  for (const line of lines) {
    const parts = line.split('|').map((part) => part.trim());
    if (parts.length < 6) {
      continue;
    }
    const hashMatch = parts[2]?.match(/[0-9a-f]{64}/);
    if (!hashMatch) {
      continue;
    }
    rows.push({
      hash: hashMatch[0],
      startUtc8: parts[3] ?? '',
      request: parts[4] ?? '',
    });
  }
  return rows;
}

export function updateShortMemory(root: string, record: ExecutionRecord): void {
  const file = path.join(root, 'SHORT_MEMORY.md');
  const rows: ShortRow[] = [
    { hash: record.hash, startUtc8: record.startUtc8, request: record.request },
    ...readShortRows(file),
  ].slice(0, 10);
  const lines: string[] = [
    SHORT_HEADER,
    '',
    '| # | TaskHash | UTC+8 | 摘要 | 状态 |',
    '| --- | --- | --- | --- | --- |',
  ];
  rows.forEach((row, index) => {
    const number = 10 - index;
    lines.push(
      `| ${number} | \`sha256:${row.hash.slice(0, 12)}...\` | ${row.startUtc8} | ${escapePipe(row.request)} | 完成 |`,
    );
  });
  fs.writeFileSync(file, `${lines.join('\n')}\n`, 'utf8');
}

function renderLongEntry(record: ExecutionRecord): string {
  const plan = record.plan.map((step, index) => `${index + 1}. ${step}`).join('\n');
  const timeline = record.timeline
    .map((item) => `| ${item.time} | ${item.event} |`)
    .join('\n');
  const files = record.files.map((file) => `- ${file}`).join('\n') || '- 无';
  const nextSteps = record.nextSteps.map((step) => `- ${step}`).join('\n') || '- 无';
  return `
### ${record.id}

- TaskHash：\`sha256:${record.hash}\`
- 开始：\`${record.startUtc8}\`
- 结束：\`${record.endUtc8}\`
- 请求：${record.request}
- 推理：${record.reasoning}
- 计划：
${plan}
- 时间线：

| 时间（UTC+8） | 事件 |
| --- | --- |
${timeline}

- 结果：${record.result}
- 文件：
${files}
- 后续：
${nextSteps}
`;
}

export function writeExecution(
  root: string,
  record: ExecutionRecord,
): { id: string; hash: string; longFile: string; shortFile: string } {
  ensureMemoryFiles(root);
  const id = record.id || nextAgentId(root);
  const fullRecord: ExecutionRecord = { ...record, id };
  const longFile = path.join(root, 'LONG_MEMORY.md');
  fs.appendFileSync(longFile, renderLongEntry(fullRecord), 'utf8');
  updateShortMemory(root, fullRecord);
  return {
    id,
    hash: fullRecord.hash,
    longFile,
    shortFile: path.join(root, 'SHORT_MEMORY.md'),
  };
}
