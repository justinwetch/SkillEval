import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(scriptDir, '..');
const repoRoot = resolve(appDir, '..');
const llmHubRoot = resolve(repoRoot, 'vendor', 'llm-hub');

function stripOptionalQuotes(value) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const contents = readFileSync(filePath, 'utf8');

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = stripOptionalQuotes(trimmed.slice(separatorIndex + 1));

    process.env[key] ??= value;
  }
}

loadEnvFile(resolve(repoRoot, '.env.local'));
loadEnvFile(resolve(appDir, '.env.local'));
loadEnvFile(resolve(appDir, '.env'));

process.env.LLM_HUB_SERVER_PORT = '3002';
process.env.LLM_HUB_SERVER_BASE_DIR = resolve(repoRoot, '.llm-hub-skilleval');
process.env.LLM_HUB_SERVER_PUBLIC_BASE_URL = 'http://localhost:3002';

if (
  !process.env.LLM_HUB_CODEX_BRIDGE_AUTH_URL ||
  !process.env.LLM_HUB_CODEX_BRIDGE_TOKEN_URL
) {
  console.warn(
    'Codex bridge OAuth URLs are not set. Gemini API-key auth will still work; Codex OAuth will appear unavailable until LLM_HUB_CODEX_BRIDGE_AUTH_URL and LLM_HUB_CODEX_BRIDGE_TOKEN_URL are set.',
  );
}

const child = spawn('npm', ['--workspace', '@llm-hub/server', 'run', 'dev'], {
  cwd: llmHubRoot,
  env: process.env,
  shell: true,
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
