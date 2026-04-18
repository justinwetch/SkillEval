import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(scriptDir, '..');
const repoRoot = resolve(appDir, '..');
const llmHubRoot = resolve(repoRoot, 'vendor', 'llm-hub');

process.env.LLM_HUB_SERVER_PORT = '3002';
process.env.LLM_HUB_SERVER_BASE_DIR = resolve(repoRoot, '.llm-hub-skilleval');
process.env.LLM_HUB_SERVER_PUBLIC_BASE_URL = 'http://localhost:3002';

if (
  !process.env.LLM_HUB_CODEX_BRIDGE_AUTH_URL ||
  !process.env.LLM_HUB_CODEX_BRIDGE_TOKEN_URL
) {
  throw new Error(
    'Set LLM_HUB_CODEX_BRIDGE_AUTH_URL and LLM_HUB_CODEX_BRIDGE_TOKEN_URL before starting the SkillEval llm-hub sidecar.',
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
