import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const extensionRoot = path.join(repoRoot, 'extensions', 'cocos-agent');
const launcherRoot = path.join(repoRoot, 'launcher');
const require = createRequire(import.meta.url);
const globals = globalThis as typeof globalThis & { Editor?: unknown };

test('Cocos Creator extension manifest and panel contract are valid', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(extensionRoot, 'package.json'), 'utf8')) as {
    package_version?: number;
    cocosAgentVersion?: string;
    panels?: Record<string, { main?: string; type?: string }>;
    contributions?: {
      menu?: Array<{ path?: string; label?: string; message?: string }>;
      messages?: Record<string, unknown>;
    };
  };
  assert.equal(manifest.cocosAgentVersion, 'v0.0.0.2-a');
  assert.equal(manifest.package_version, 2);
  assert.equal(manifest.panels?.cli?.type, 'dockable');
  assert.equal(manifest.panels?.cli?.main, './src/panel.js');
  assert.equal(manifest.panels?.overlay?.type, 'dockable');
  assert.equal(manifest.panels?.overlay?.main, './src/overlay.js');
  assert.equal('panels' in (manifest.contributions ?? {}), false);
  const menu = manifest.contributions?.menu ?? [];
  assert.ok(menu.length >= 2);
  for (const item of menu) {
    assert.ok(item.path?.startsWith('Cocos Agent/'));
    assert.ok(item.label && item.label.length > 0);
    assert.ok(item.message && Object.keys(manifest.contributions?.messages ?? {}).includes(item.message));
  }
  assert.equal(menu.find((item) => item.message === 'open-cli')?.label, 'Open CLI');
  assert.equal(menu.find((item) => item.message === 'open-overlay')?.label, 'Overlay');

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
    const mainSource = fs.readFileSync(mainPath, 'utf8');
    const launcherSource = fs.readFileSync(path.join(launcherRoot, 'Program.cs'), 'utf8');
    const launchScript = fs.readFileSync(path.join(repoRoot, 'scripts', 'launch-cocos-agent.ps1'), 'utf8');
    assert.match(panel.template ?? '', /模型渠道/);
    assert.match(panel.template ?? '', /id="locale"/);
    assert.match(panel.template ?? '', /cc-switch \/ ccs/);
    assert.match(panel.template ?? '', /id="save-provider"/);
    assert.match(panel.template ?? '', /id="ccs-doctor"/);
    assert.equal(typeof panel.ready, 'function');
    assert.equal(typeof panel.run, 'function');
    assert.match(fs.readFileSync(panelPath, 'utf8'), /queryPanelElement/);
    assert.match(fs.readFileSync(panelPath, 'utf8'), /const panelDefinition =/);
    assert.match(fs.readFileSync(panelPath, 'utf8'), /panelDefinition\[name\]\.apply\(this, args\)/);
    assert.doesNotMatch(fs.readFileSync(panelPath, 'utf8'), /document\.getElementById/);
    assert.match(overlay.template ?? '', /Cocos Agent/);
    assert.match(overlay.template ?? '', /chat/);
    assert.match(overlay.style ?? '', /agent-overlay/);
    assert.equal(typeof overlay.ready, 'function');
    assert.match(fs.readFileSync(overlayPath, 'utf8'), /queryPanelElement/);
    assert.match(fs.readFileSync(overlayPath, 'utf8'), /const panelDefinition =/);
    assert.match(fs.readFileSync(overlayPath, 'utf8'), /panelDefinition\[name\]\.apply\(this, args\)/);
    assert.doesNotMatch(fs.readFileSync(overlayPath, 'utf8'), /document\.getElementById/);
    assert.match(mainSource, /ELECTRON_RUN_AS_NODE/);
    assert.match(mainSource, /overlay-status\.json/);
    assert.match(mainSource, /Editor\.Panel\.open\('cocos-agent\.overlay'\)/);
    assert.match(launcherSource, /-ProjectRoot/);
    assert.match(launcherSource, /MessageBoxW/);
    assert.match(launcherSource, /FolderBrowserDialog/);
    assert.match(launcherSource, /DRY_RUN project=selection-required/);
    assert.match(launcherSource, /IsCocosProject/);
    assert.match(launcherSource, /LooksLikeCreatorInstallation/);
    assert.match(launchScript, /creatorPath/);
    assert.match(launchScript, /cocos editor/);
    assert.match(launchScript, /ExtensionTimeoutSeconds/);
    assert.match(launchScript, /overlay-status\.json/);
    assert.match(launchScript, /projectCliRoot/);
    assert.match(launchScript, /npm run build/);
    assert.match(launchScript, /VERSION/);
    const localProjectTest = fs.readFileSync(path.join(repoRoot, 'scripts', 'test-local-project.ps1'), 'utf8');
    assert.match(localProjectTest, /COCOS_AGENT_PROJECT_ROOT/);
    assert.match(localProjectTest, /status/);
    assert.match(localProjectTest, /Project-local CLI version mismatch/);
    assert.match(mainSource, /\.cocos-agent', 'cli', 'dist', 'index\.js/);
    main.methods?.openCli?.();
    assert.deepEqual(opened, ['cocos-agent.cli']);
  } finally {
    globals.Editor = previousEditor;
  }
});
