import { MemoryCredentialStore } from '@llm-hub/core';

import { createLlmHubServerApp } from '../src/app';
import { MemoryServerStateStore } from '../src/lib/server-state-store';

export function createTestServer() {
  const credentialStore = new MemoryCredentialStore();
  const stateStore = new MemoryServerStateStore();
  const { app, service } = createLlmHubServerApp({
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
