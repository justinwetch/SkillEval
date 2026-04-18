import fs from 'node:fs/promises';
import path from 'node:path';

import { resolveHubPaths } from '@llm-hub/core';

import type { ServerState } from '../contracts';
import { serverStateSchema } from '../schemas/state';

export interface ServerStateStore {
  getState(): Promise<ServerState>;
  saveState(state: ServerState): Promise<void>;
}

export function createDefaultServerState(): ServerState {
  return {
    defaultModel: null,
    connectionHealth: {},
  };
}

export class MemoryServerStateStore implements ServerStateStore {
  constructor(private state: ServerState = createDefaultServerState()) {}

  async getState(): Promise<ServerState> {
    return structuredClone(this.state);
  }

  async saveState(state: ServerState): Promise<void> {
    this.state = structuredClone(state);
  }
}

export class FileJsonServerStateStore implements ServerStateStore {
  private readonly filePath: string;

  constructor(baseDir = process.cwd()) {
    const hubPaths = resolveHubPaths(baseDir);
    this.filePath = path.join(hubPaths.hubDir, 'server-state.json');
  }

  async getState(): Promise<ServerState> {
    await this.ensureFile();
    const content = await fs.readFile(this.filePath, 'utf8');
    return serverStateSchema.parse(JSON.parse(content));
  }

  async saveState(state: ServerState): Promise<void> {
    await this.ensureFile();
    const parsed = serverStateSchema.parse(state);
    await fs.writeFile(this.filePath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  }

  private async ensureFile(): Promise<void> {
    try {
      await fs.access(this.filePath);
    } catch {
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });
      await fs.writeFile(
        this.filePath,
        `${JSON.stringify(createDefaultServerState(), null, 2)}\n`,
        'utf8',
      );
    }
  }
}
