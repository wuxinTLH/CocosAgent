import crypto from 'node:crypto';
import { normalizeRoot } from './context.js';

export interface TaskHashInput {
  projectRoot: string;
  request: string;
  utc8Start: string;
  workflowVersion?: string;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function normalizeRequest(request: string): string {
  return request.normalize('NFC').trim().replace(/\s+/g, ' ');
}

export function computeTaskHash(input: TaskHashInput): string {
  const payload = {
    workflowVersion: input.workflowVersion ?? 'WF-1.0',
    projectRoot: normalizeRoot(input.projectRoot),
    request: normalizeRequest(input.request),
    utc8Start: input.utc8Start,
  };
  return crypto.createHash('sha256').update(canonicalJson(payload)).digest('hex');
}
