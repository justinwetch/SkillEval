import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export interface CodexCliRunInput {
  modelId: string;
  system?: string;
  prompt?: string;
  messages?: Array<{ role: string; content: unknown }>;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface CodexCliRunResult {
  text: string;
  warnings?: string[];
}

function stringifyContent(content: unknown): string {
  return typeof content === 'string' ? content : JSON.stringify(content);
}

export function buildCodexCliPrompt(input: CodexCliRunInput): string {
  const sections: string[] = [];

  if (input.system) {
    sections.push(`System instructions:\n${input.system}`);
  }

  if (input.messages?.length) {
    sections.push(
      input.messages
        .map((message) => `${message.role.toUpperCase()}:\n${stringifyContent(message.content)}`)
        .join('\n\n'),
    );
  } else {
    sections.push(input.prompt ?? '');
  }

  sections.push(
    [
      'Return only the final answer needed by the caller.',
      'Do not modify files.',
      'Do not run commands unless required to answer.',
    ].join('\n'),
  );

  return sections.filter(Boolean).join('\n\n');
}

export async function runCodexCli(input: CodexCliRunInput): Promise<CodexCliRunResult> {
  const tempDir = await mkdtemp(join(tmpdir(), 'llm-hub-codex-cli-'));
  const outputPath = join(tempDir, 'last-message.txt');
  const codexCommand =
    process.env.LLM_HUB_CODEX_CLI_COMMAND ??
    (process.platform === 'win32' ? 'codex.cmd' : 'codex');
  const args = [
    'exec',
    '--model',
    input.modelId,
    '--sandbox',
    'read-only',
    '--skip-git-repo-check',
    '--ephemeral',
    '--output-last-message',
    outputPath,
    '-',
  ];

  try {
    const prompt = buildCodexCliPrompt(input);
    await spawnCodex(codexCommand, args, prompt);
    const text = (await readFile(outputPath, 'utf8')).trim();

    if (!text) {
      throw new Error('Codex CLI completed without a final message.');
    }

    return {
      text,
      warnings: ['Generated through the local Codex CLI ChatGPT login.'],
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function spawnCodex(
  command: string,
  args: string[],
  stdin: string,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      shell: process.platform === 'win32',
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Codex CLI timed out after 180 seconds.'));
    }, 180_000);

    child.stdout.on('data', (chunk) => stdoutChunks.push(Buffer.from(chunk)));
    child.stderr.on('data', (chunk) => stderrChunks.push(Buffer.from(chunk)));
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      const stdout = Buffer.concat(stdoutChunks).toString('utf8');
      const stderr = Buffer.concat(stderrChunks).toString('utf8');

      if (code !== 0) {
        reject(
          new Error(
            `Codex CLI exited with code ${code}.\n${stderr || stdout || 'No output.'}`,
          ),
        );
        return;
      }

      resolve({ stdout, stderr });
    });

    child.stdin.end(stdin);
  });
}
