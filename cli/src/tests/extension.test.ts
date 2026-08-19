import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const extensionRoot = path.join(repoRoot, 'extensions', 'cocos-agent');
const require = createRequire(import.meta.url);
const globals = globalThis as typeof globalThis & { Editor?: unknown };

test('Cocos Creator extension manifest and panel contract are valid', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(extensionRoot, 'package.json'), 'utf8')) as {
    cocosAgentVersion?: string;
    contributions?: { panels?: Record<string, { main?: string; type?: string }> };
  };
  assert.equal(manifest.cocosAgentVersion, 'v0.0.0.2-a');
  assert.equal(manifest.contributions?.panels?.cli?.type, 'dockable');
  assert.equal(manifest.contributions?.panels?.cli?.main, './src/panel.js');
  assert.equal(manifest.contributions?.panels?.overlay?.type, 'float');
  assert.equal(manifest.contributions?.panels?.overlay?.main, './src/overlay.js');

  const previousEditor = globals.Editor;
  const opened: string[] = [];
  globals.Editor = {
    Project: { path: repoRoot },
    Panel: {
      define: (definition: unknown) => definition,
      open: (name: string) => opened.push(name),
    },
  };
  try {
    const panelPath = path.join(extensionRoot, 'src', 'panel.js');
    const mainPath = path.join(extensionRoot, 'src', 'main.js');
    delete require.cache[require.resolve(panelPath)];
    delete require.cache[require.resolve(mainPath)];
    const panel = require(panelPath) as { template?: string; ready?: () => void; run?: () => void };
    const overlayPath = path.join(extensionRoot, 'src', 'overlay.js');
    delete require.cache[require.resolve(overlayPath)];
    const overlay = require(overlayPath) as { template?: string; style?: string; ready?: () => void };
    const main = require(mainPath) as { methods?: { openCli?: () => void } };
    assert.match(panel.template ?? '', /cocos-agent>/);
    assert.equal(typeof panel.ready, 'function');
    assert.equal(typeof panel.run, 'function');
    assert.match(overlay.template ?? '', /Cocos Agent/);
    assert.match(overlay.template ?? '', /chat/);
    assert.match(overlay.style ?? '', /agent-overlay/);
    assert.equal(typeof overlay.ready, 'function');
    main.methods?.openCli?.();
    assert.deepEqual(opened, ['cocos-agent.cli']);
  } finally {
    globals.Editor = previousEditor;
  }
});
