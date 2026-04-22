import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCREENSHOT_SERVER_PORT = Number(process.env.SCREENSHOT_SERVER_PORT || 3001);
const SCREENSHOT_SERVER_URL = `http://127.0.0.1:${SCREENSHOT_SERVER_PORT}/health`;
const NPM_COMMAND = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(scriptDir, '..');

let screenshotChild = null;
let viteChild = null;
let shuttingDown = false;

async function hasHealthyScreenshotServer() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);
    const response = await fetch(SCREENSHOT_SERVER_URL, { signal: controller.signal });
    clearTimeout(timeoutId);

    return response.ok;
  } catch {
    return false;
  }
}

function spawnChild(command, args, label, options = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: false,
    env: process.env,
    cwd: appDir,
    ...options,
  });

  child.on('error', (error) => {
    console.error(`[${label}] failed to start:`, error);
  });

  return child;
}

function terminateChild(child, signal = 'SIGINT') {
  if (!child || child.killed) {
    return;
  }

  try {
    child.kill(signal);
  } catch {
    // Ignore shutdown races.
  }
}

function shutdown(code = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  terminateChild(viteChild);
  terminateChild(screenshotChild);
  setTimeout(() => process.exit(code), 50);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

const screenshotServerRunning = await hasHealthyScreenshotServer();

if (screenshotServerRunning) {
  console.log(`[dev] Reusing screenshot server on port ${SCREENSHOT_SERVER_PORT}`);
} else {
  console.log(`[dev] Starting screenshot server on port ${SCREENSHOT_SERVER_PORT}`);
  screenshotChild = spawnChild(process.execPath, ['./scripts/screenshot-server.mjs'], 'screenshot-server');
  screenshotChild.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    console.error(`[screenshot-server] exited ${signal ? `with signal ${signal}` : `with code ${code}`}`);
    shutdown(code ?? 1);
  });
}

viteChild = spawnChild(NPM_COMMAND, ['run', 'dev:vite'], 'vite', {
  shell: process.platform === 'win32',
});
viteChild.on('exit', (code, signal) => {
  if (shuttingDown) {
    return;
  }

  console.error(`[vite] exited ${signal ? `with signal ${signal}` : `with code ${code}`}`);
  shutdown(code ?? 1);
});

await once(viteChild, 'exit');
