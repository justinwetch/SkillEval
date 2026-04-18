import fs from 'node:fs/promises';
import path from 'node:path';

import { DEFAULT_FEATURE_FLAGS } from '../constants/feature-flags';
import { hubConfigSchema, credentialStoreFileSchema } from '../schemas';
import type {
  CredentialRecord,
  HubConfig,
  SanitizedCredentialRecord,
} from '../types';
import { resolveHubPaths, type HubPaths } from '../utils/paths';
import { sanitizeCredentialRecord } from './masking';

export interface CredentialStore {
  getConfig(): Promise<HubConfig>;
  saveConfig(config: HubConfig): Promise<void>;
  listCredentialRecordsUnsafe(): Promise<CredentialRecord[]>;
  getCredentialRecordUnsafe(id: string): Promise<CredentialRecord | undefined>;
  setCredentialRecord(record: CredentialRecord): Promise<void>;
  deleteCredentialRecord(id: string): Promise<void>;
  listPublicCredentials(): Promise<SanitizedCredentialRecord[]>;
  getPublicCredential(id: string): Promise<SanitizedCredentialRecord | undefined>;
}

export function createDefaultHubConfig(): HubConfig {
  return {
    featureFlags: { ...DEFAULT_FEATURE_FLAGS },
    connections: [],
    oauthSessions: [],
  };
}

export class MemoryCredentialStore implements CredentialStore {
  private config: HubConfig;
  private credentials = new Map<string, CredentialRecord>();

  constructor(options?: {
    config?: HubConfig;
    credentials?: CredentialRecord[];
  }) {
    this.config = options?.config ?? createDefaultHubConfig();

    for (const credential of options?.credentials ?? []) {
      this.credentials.set(credential.id, credential);
    }
  }

  async getConfig(): Promise<HubConfig> {
    return structuredClone(this.config);
  }

  async saveConfig(config: HubConfig): Promise<void> {
    this.config = structuredClone(config);
  }

  async listCredentialRecordsUnsafe(): Promise<CredentialRecord[]> {
    return [...this.credentials.values()].map((record) => structuredClone(record));
  }

  async getCredentialRecordUnsafe(
    id: string,
  ): Promise<CredentialRecord | undefined> {
    const record = this.credentials.get(id);
    return record ? structuredClone(record) : undefined;
  }

  async setCredentialRecord(record: CredentialRecord): Promise<void> {
    this.credentials.set(record.id, structuredClone(record));
  }

  async deleteCredentialRecord(id: string): Promise<void> {
    this.credentials.delete(id);
  }

  async listPublicCredentials(): Promise<SanitizedCredentialRecord[]> {
    return [...this.credentials.values()].map((record) =>
      sanitizeCredentialRecord(structuredClone(record)),
    );
  }

  async getPublicCredential(
    id: string,
  ): Promise<SanitizedCredentialRecord | undefined> {
    const record = this.credentials.get(id);
    return record ? sanitizeCredentialRecord(structuredClone(record)) : undefined;
  }
}

export class FileJsonCredentialStore implements CredentialStore {
  readonly paths: HubPaths;

  constructor(baseDir = process.cwd()) {
    this.paths = resolveHubPaths(baseDir);
  }

  async getConfig(): Promise<HubConfig> {
    await this.ensureFiles();
    const file = await fs.readFile(this.paths.configFile, 'utf8');
    return hubConfigSchema.parse(JSON.parse(file));
  }

  async saveConfig(config: HubConfig): Promise<void> {
    await this.ensureFiles();
    hubConfigSchema.parse(config);
    await fs.writeFile(
      this.paths.configFile,
      `${JSON.stringify(config, null, 2)}\n`,
      'utf8',
    );
  }

  async listCredentialRecordsUnsafe(): Promise<CredentialRecord[]> {
    const file = await this.readCredentialFile();
    return file.credentials;
  }

  async getCredentialRecordUnsafe(
    id: string,
  ): Promise<CredentialRecord | undefined> {
    const file = await this.readCredentialFile();
    return file.credentials.find((record) => record.id === id);
  }

  async setCredentialRecord(record: CredentialRecord): Promise<void> {
    const file = await this.readCredentialFile();
    const nextCredentials = file.credentials.filter((item) => item.id !== record.id);
    nextCredentials.push(record);

    await fs.writeFile(
      this.paths.credentialsFile,
      `${JSON.stringify({ credentials: nextCredentials }, null, 2)}\n`,
      'utf8',
    );
  }

  async deleteCredentialRecord(id: string): Promise<void> {
    const file = await this.readCredentialFile();
    const nextCredentials = file.credentials.filter((record) => record.id !== id);

    await fs.writeFile(
      this.paths.credentialsFile,
      `${JSON.stringify({ credentials: nextCredentials }, null, 2)}\n`,
      'utf8',
    );
  }

  async listPublicCredentials(): Promise<SanitizedCredentialRecord[]> {
    const credentials = await this.listCredentialRecordsUnsafe();
    return credentials.map((record) => sanitizeCredentialRecord(record));
  }

  async getPublicCredential(
    id: string,
  ): Promise<SanitizedCredentialRecord | undefined> {
    const credential = await this.getCredentialRecordUnsafe(id);
    return credential ? sanitizeCredentialRecord(credential) : undefined;
  }

  private async ensureFiles(): Promise<void> {
    await fs.mkdir(this.paths.hubDir, { recursive: true });

    await Promise.all([
      this.ensureFile(this.paths.credentialsFile, { credentials: [] }),
      this.ensureFile(this.paths.configFile, createDefaultHubConfig()),
    ]);
  }

  private async ensureFile(filePath: string, initialValue: object): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `${JSON.stringify(initialValue, null, 2)}\n`, 'utf8');
    }
  }

  private async readCredentialFile(): Promise<{ credentials: CredentialRecord[] }> {
    await this.ensureFiles();
    const file = await fs.readFile(this.paths.credentialsFile, 'utf8');
    return credentialStoreFileSchema.parse(JSON.parse(file));
  }
}
