import { MemoryCredentialStore } from '@llm-hub/core';

import { createLlmHubServerApp } from '../src/app';
import type { LlmHubServerServiceOptions } from '../src/lib/llm-hub-server-service';
import { MemoryServerStateStore } from '../src/lib/server-state-store';

export function createTestServer(options: LlmHubServerServiceOptions = {}) {
  const credentialStore = new MemoryCredentialStore();
  const stateStore = new MemoryServerStateStore();
  const { app, service } = createLlmHubServerApp({
    ...options,
    credentialStore,
    stateStore,
    publicBaseUrl: 'http://localhost:3001',
  });

  return {
    app,
    service,
    credentialStore,
    stateStore,
  };
}
