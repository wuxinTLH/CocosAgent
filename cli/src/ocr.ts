import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { resolveInside } from './sandbox.js';

export type OcrEngine = 'external' | 'tesseract-js';

export interface OcrItem {
  text: string;
  box: { x: number; y: number; w: number; h: number };
  confidence: number;
}

export interface OcrResult {
  items: OcrItem[];
  engine: OcrEngine;
}

export interface OcrRegion {
  left: number;
  top: number;
  width: number;
  height: number;
}

export function parseRegion(region?: string): OcrRegion | undefined {
  if (!region || !region.trim()) {
    return undefined;
  }
  const parts = region.split(',').map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    throw new Error(`INVALID_REGION: ${region}`);
  }
  return { left: parts[0], top: parts[1], width: parts[2], height: parts[3] };
}

function defaultEngine(): OcrEngine {
  const configured = process.env.COCOS_AGENT_OCR_ENGINE;
  return configured === 'external' ? 'external' : 'tesseract-js';
}

export async function runOcr(
  root: string,
  image: string,
  region?: string,
  engine: OcrEngine = defaultEngine(),
): Promise<OcrResult> {
  const imagePath = resolveInside(root, image);
  if (!fs.existsSync(imagePath)) {
    throw new Error(`IMAGE_NOT_FOUND: ${imagePath}`);
  }
  const parsedRegion = parseRegion(region);
  if (engine === 'external') {
    return runExternalEngine(root, imagePath, parsedRegion);
  }
  if (engine === 'tesseract-js') {
    return runTesseractJs(imagePath, parsedRegion);
  }
  throw new Error(`UNKNOWN_OCR_ENGINE: ${engine}`);
}

function runExternalEngine(
  root: string,
  imagePath: string,
  region: OcrRegion | undefined,
): OcrResult {
  const commandTemplate = process.env.COCOS_AGENT_OCR_CMD;
  if (!commandTemplate) {
    throw new Error('OCR engine not configured: set COCOS_AGENT_OCR_CMD');
  }
  const outputDir = resolveInside(root, 'temp/agent-ocr');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputBase = path.join(outputDir, `ocr-${Date.now()}`);
  const regionText = region
    ? `${region.left},${region.top},${region.width},${region.height}`
    : '';
  const command = commandTemplate
    .replaceAll('{image}', imagePath)
    .replaceAll('{output}', outputBase)
    .replaceAll('{region}', regionText);
  const stdout = execFileSync(process.env.COMSPEC ?? 'cmd.exe', ['/d', '/s', '/c', command], {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 120_000,
  });
  const items: OcrItem[] = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => ({
      text: line,
      box: { x: 0, y: index * 16, w: 0, h: 16 },
      confidence: 0,
    }));
  return { items, engine: 'external' };
}

async function runTesseractJs(imagePath: string, region: OcrRegion | undefined): Promise<OcrResult> {
  const { createWorker } = await import('tesseract.js');
  const lang = process.env.COCOS_AGENT_TESSERACT_LANG ?? 'eng';
  const worker = await createWorker(lang, 1, { logger: () => undefined });
  try {
    const { data } = await worker.recognize(
      fs.readFileSync(imagePath),
      region ? { rectangle: region } : undefined,
    );
    const items: OcrItem[] = (data.words ?? []).map((word) => ({
      text: word.text,
      box: {
        x: word.bbox.x0,
        y: word.bbox.y0,
        w: word.bbox.x1 - word.bbox.x0,
        h: word.bbox.y1 - word.bbox.y0,
      },
      confidence: word.confidence,
    }));
    return { items, engine: 'tesseract-js' };
  } finally {
    await worker.terminate();
  }
}
