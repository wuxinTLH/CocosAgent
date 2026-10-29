import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadAgentConfig, saveAgentConfig, updateProvider, storedProviderCredential, saveProviderCredential } from '../config.js';
import { chatWithProvider, providerCatalog } from '../providers.js';
import { dispatchTool } from '../tools.js';

function tempRoot(): string { return fs.mkdtempSync(path.join(os.tmpdir(), 'cocos-agent-providers-')); }

test('custom providers and encrypted credentials round trip through bridge tools without project plaintext', { skip: process.platform !== 'win32' }, async () => {
  const root = tempRoot();
  const credentials = tempRoot();
  const originalDir = process.env.COCOS_AGENT_CREDENTIAL_DIR;
  process.env.COCOS_AGENT_CREDENTIAL_DIR = credentials;
  const ctx = { root, cwd: root };
  const key = 'test-private-' + Date.now().toString(36);
  try {
    const created = await dispatchTool(ctx, 'provider_create', { name: 'Local Test', endpoint: 'http://localhost:8787/v1', model: 'test-model', protocol: 'responses', apiKey: key }) as { id: `custom-${string}`; configured: boolean; modelProtocol: string };
    assert.match(created.id, /^custom-[a-f0-9]{24}$/);
    assert.equal(created.configured, true);
    assert.equal(created.modelProtocol, 'responses');
    assert.equal(storedProviderCredential(root, created.id), key);
    assert.ok(!fs.readFileSync(path.join(root, '.cocos-agent', 'config.json'), 'utf8').includes(key));
    const encrypted = fs.readFileSync(path.join(credentials, 'credentials.json'), 'utf8');
    assert.ok(!encrypted.includes(key));
    assert.equal(loadAgentConfig(root).customProviders[0]?.label, 'Local Test');
    saveAgentConfig(root, { activeProvider: created.id, fallbackProviders: ['openai'] });
    assert.equal(loadAgentConfig(root).activeProvider, created.id);
    const configured = await dispatchTool(ctx, 'provider_configure', { provider: created.id, model: 'next-model', protocol: 'chat-completions', apiKey: key + '2' }) as { model: string; configured: boolean };
    assert.equal(configured.model, 'next-model');
    assert.equal(configured.configured, true);
    assert.equal(storedProviderCredential(root, created.id), key + '2');
    assert.ok(!JSON.stringify(configured).includes(key));
    assert.ok(!fs.readFileSync(path.join(root, '.cocos-agent', 'config.json'), 'utf8').includes(key));
    const cleared = await dispatchTool(ctx, 'provider_credential_clear', { provider: created.id }) as { configured: boolean };
    assert.equal(cleared.configured, false);
    assert.equal(storedProviderCredential(root, created.id), undefined);
    await assert.rejects(dispatchTool(ctx, 'provider_configure', { provider: created.id, apiKey: key, endpoint: 'http://example.org/v1' }), /PROVIDER_ENDPOINT_INVALID/);
    assert.equal(storedProviderCredential(root, created.id), undefined);
    await assert.rejects(dispatchTool(ctx, 'provider_create', { name: 'bad', endpoint: 'https://example.org/v1?key=' + key, model: 'x', protocol: 'responses', apiKey: key }), (error: Error) => !error.message.includes(key));
  } finally {
    if (originalDir === undefined) delete process.env.COCOS_AGENT_CREDENTIAL_DIR; else process.env.COCOS_AGENT_CREDENTIAL_DIR = originalDir;
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(credentials, { recursive: true, force: true });
  }
});

test('non-Windows credential storage rejects safely without plaintext or provider changes', { skip: process.platform === 'win32' }, async () => {
  const root = tempRoot();
  const credentials = tempRoot();
  const originalDir = process.env.COCOS_AGENT_CREDENTIAL_DIR;
  process.env.COCOS_AGENT_CREDENTIAL_DIR = credentials;
  const ctx = { root, cwd: root };
  const key = 'test-private-' + Date.now().toString(36);
  const options = { name: 'Local Test', endpoint: 'http://localhost:8787/v1', model: 'test-model', protocol: 'responses' };
  const storageUnavailable = (error: Error) => error.message.startsWith('PROVIDER_CREDENTIAL_STORAGE_UNAVAILABLE') && !error.message.includes(key);
  try {
    await assert.rejects(dispatchTool(ctx, 'provider_create', { ...options, apiKey: key }), storageUnavailable);
    assert.equal(loadAgentConfig(root).customProviders.length, 0);
    assert.equal(fs.existsSync(path.join(root, '.cocos-agent', 'config.json')), false);
    assert.deepEqual(fs.readdirSync(credentials), []);

    // Credential-free custom providers remain usable on every supported platform.
    const created = await dispatchTool(ctx, 'provider_create', options) as { id: `custom-${string}`; configured: boolean; modelProtocol: string };
    assert.match(created.id, /^custom-[a-f0-9]{24}$/);
    assert.equal(created.configured, false);
    assert.equal(created.modelProtocol, 'responses');
    assert.equal(loadAgentConfig(root).customProviders[0]?.label, 'Local Test');
    const configured = await dispatchTool(ctx, 'provider_configure', { provider: created.id, model: 'next-model', protocol: 'chat-completions' }) as { model: string; configured: boolean };
    assert.equal(configured.model, 'next-model');
    assert.equal(configured.configured, false);
    const configFile = path.join(root, '.cocos-agent', 'config.json');
    const before = fs.readFileSync(configFile, 'utf8');
    await assert.rejects(dispatchTool(ctx, 'provider_configure', { provider: created.id, model: 'must-not-persist', apiKey: key }), storageUnavailable);
    assert.equal(fs.readFileSync(configFile, 'utf8'), before);
    assert.throws(() => saveProviderCredential(root, created.id, key), storageUnavailable);
    assert.equal(storedProviderCredential(root, created.id), undefined);
    assert.deepEqual(fs.readdirSync(credentials), []);
    assert.ok(!fs.readFileSync(configFile, 'utf8').includes(key));
    assert.ok(!JSON.stringify({ created, configured }).includes(key));
  } finally {
    if (originalDir === undefined) delete process.env.COCOS_AGENT_CREDENTIAL_DIR; else process.env.COCOS_AGENT_CREDENTIAL_DIR = originalDir;
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(credentials, { recursive: true, force: true });
  }
});

test('OpenAI-compatible protocol persists; invalid protocols and unsafe endpoints are rejected', () => {
  const root = tempRoot();
  try {
    assert.equal(providerCatalog(root).find((item) => item.id === 'openai')?.modelProtocol, 'chat-completions');
    updateProvider(root, 'openai', { protocol: 'responses', endpoint: 'http://127.0.0.1:8787/v1' });
    assert.equal(loadAgentConfig(root).providers.openai?.protocol, 'responses');
    assert.equal(providerCatalog(root).find((item) => item.id === 'openai')?.modelProtocol, 'responses');
    assert.equal(providerCatalog(root).find((item) => item.id === 'openai')?.protocol, 'openai');
    assert.throws(() => updateProvider(root, 'anthropic', { protocol: 'responses' }), /PROVIDER_PROTOCOL_NOT_SUPPORTED/);
    assert.throws(() => updateProvider(root, 'gateway', { protocol: 'chat-completions' }), /PROVIDER_PROTOCOL_NOT_SUPPORTED/);
    assert.throws(() => updateProvider(root, 'deepseek', { protocol: 'unknown' as never }), /PROVIDER_PROTOCOL_NOT_SUPPORTED/);
    for (const endpoint of ['http://example.com/v1', 'http://192.168.1.2/v1', 'http://10.0.0.1/v1', 'https://user:pass@example.com/v1', 'https://example.com/v1?key=secret', 'file:///tmp/test', '//example.com/v1']) {
      assert.throws(() => updateProvider(root, 'openai', { endpoint }), /PROVIDER_ENDPOINT_INVALID/, endpoint);
    }
    updateProvider(root, 'qwen', { endpoint: 'http://localhost:8787/v1', protocol: 'responses' });
    updateProvider(root, 'kimi', { endpoint: 'http://[::1]:8787/v1' });
    assert.throws(() => saveAgentConfig(root, { providers: { anthropic: { protocol: 'responses' } } }), /PROVIDER_PROTOCOL_NOT_SUPPORTED/);
    fs.writeFileSync(path.join(root, '.cocos-agent', 'config.json'), JSON.stringify({ providers: { openai: { endpoint: 'http://example.com/v1' } } }));
    assert.throws(() => loadAgentConfig(root), /CONFIG_INVALID/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('provider chat uses selected API and parses assistant output without leaking credentials on redirect', async () => {
  const root = tempRoot();
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.COCOS_AGENT_OPENAI_API_KEY;
  process.env.COCOS_AGENT_OPENAI_API_KEY = 'provider-test-secret';
  try {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    let payload: Record<string, unknown> = {};
    globalThis.fetch = async (input, init) => {
      calls.push({ url: String(input), init: init ?? {} });
      return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });
    };
    updateProvider(root, 'openai', { endpoint: 'http://127.0.0.1:8787/v1', protocol: 'responses' });
    payload = { status: 'completed', output: [{ type: 'reasoning', content: [{ type: 'output_text', text: 'hidden' }] }, { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'hello' }, { type: 'output_text', text: ' world' }] }] };
    const options = { root, provider: 'openai' as const, chat: 'hi', memoryContext: 'context', locale: 'en-US' as const };
    assert.equal((await chatWithProvider(options)).content, 'hello world');
    assert.equal(calls[0]?.url, 'http://127.0.0.1:8787/v1/responses');
    assert.equal(calls[0]?.init.redirect, 'error');
    assert.equal(JSON.parse(String(calls[0]?.init.body)).input[0].content, 'hi');
    assert.equal(JSON.parse(String(calls[0]?.init.body)).instructions.includes('context'), true);
    payload = { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output_text: 'partial' };
    await assert.rejects(chatWithProvider(options), /PROVIDER_INCOMPLETE_RESPONSE/);
    payload = { status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'refusal', refusal: 'no' }] }] };
    await assert.rejects(chatWithProvider(options), /PROVIDER_REFUSAL/);
    payload = { status: 'completed', output: [] };
    await assert.rejects(chatWithProvider(options), /PROVIDER_INVALID_RESPONSE/);
    payload = { status: 'completed', output: [{ type: 'message', role: 'assistant', status: 'incomplete', content: [{ type: 'output_text', text: 'partial' }] }] };
    await assert.rejects(chatWithProvider(options), /PROVIDER_INCOMPLETE_RESPONSE/);
    payload = { status: 'completed', output: [{ type: 'message', role: 'assistant', status: 'failed', content: [{ type: 'output_text', text: 'partial' }] }] };
    await assert.rejects(chatWithProvider(options), /PROVIDER_RESPONSE_FAILED/);
    payload = { status: 'failed', error: { message: 'provider-test-secret' } };
    await assert.rejects(chatWithProvider(options), (error: Error) => error.message.startsWith('PROVIDER_RESPONSE_FAILED:') && !error.message.includes('provider-test-secret'));
    payload = { output_text: 'not complete' };
    await assert.rejects(chatWithProvider(options), /PROVIDER_RESPONSE_FAILED/);
    payload = { status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'refusal', refusal: 'provider-test-secret' }] }] };
    await assert.rejects(chatWithProvider(options), (error: Error) => error.message === 'PROVIDER_REFUSAL');
    updateProvider(root, 'openai', { protocol: 'chat-completions' });
    payload = { choices: [{ message: { content: 'legacy' }, finish_reason: 'stop' }] };
    assert.equal((await chatWithProvider(options)).content, 'legacy');
    assert.equal(calls.at(-1)?.url, 'http://127.0.0.1:8787/v1/chat/completions');
    payload = { choices: [{ message: { content: 'partial' }, finish_reason: 'length' }] };
    await assert.rejects(chatWithProvider(options), /PROVIDER_INCOMPLETE_RESPONSE/);
    payload = { choices: [{ message: { refusal: 'provider-test-secret' } }] };
    await assert.rejects(chatWithProvider(options), (error: Error) => error.message === 'PROVIDER_REFUSAL');
    globalThis.fetch = async () => new Response(JSON.stringify({ error: { message: 'model missing provider-test-secret', code: 'model_not_found', request_key: 'request-private', headers: { Authorization: 'Bearer auth-private', 'x-api-key': 'header-private' } } }), { status: 401 });
    await assert.rejects(chatWithProvider(options), (error: Error) => error.message.startsWith('PROVIDER_HTTP_401:') && error.message.includes('model_not_found') && error.message.includes('[REDACTED]') && !['provider-test-secret', 'request-private', 'auth-private', 'header-private'].some(secret => error.message.includes(secret)));
    globalThis.fetch = async () => new Response('upstream malformed payload Authorization: Bearer auth-private; token=provider-test-secret', { status: 200 });
    await assert.rejects(chatWithProvider(options), (error: Error) => error.message.includes('PROVIDER_INVALID_RESPONSE: HTTP 200: upstream malformed payload') && !error.message.includes('auth-private') && !error.message.includes('provider-test-secret'));
    globalThis.fetch = async () => { throw new Error('provider-test-secret'); };
    await assert.rejects(chatWithProvider(options), (error: Error) => error.message === 'PROVIDER_NETWORK_ERROR: [REDACTED]');
    const oldAnthropicToken = process.env.COCOS_AGENT_ANTHROPIC_API_KEY;
    process.env.COCOS_AGENT_ANTHROPIC_API_KEY = 'provider-test-secret';
    try {
      globalThis.fetch = async () => new Response(JSON.stringify({ content: [] }), { status: 200 });
      await assert.rejects(chatWithProvider({ ...options, provider: 'anthropic' }), /PROVIDER_INVALID_RESPONSE/);
      globalThis.fetch = async () => new Response(JSON.stringify({ content: [{ type: 'text', text: 'partial' }], stop_reason: 'max_tokens' }), { status: 200 });
      await assert.rejects(chatWithProvider({ ...options, provider: 'anthropic' }), /PROVIDER_INCOMPLETE_RESPONSE/);
    } finally {
      if (oldAnthropicToken === undefined) delete process.env.COCOS_AGENT_ANTHROPIC_API_KEY; else process.env.COCOS_AGENT_ANTHROPIC_API_KEY = oldAnthropicToken;
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.COCOS_AGENT_OPENAI_API_KEY; else process.env.COCOS_AGENT_OPENAI_API_KEY = originalToken;
    fs.rmSync(root, { recursive: true, force: true });
  }
});
