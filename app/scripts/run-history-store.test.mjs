import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { createRunHistoryStore } from './run-history-store.mjs';

describe('createRunHistoryStore', () => {
  it('creates, updates, lists, loads, and deletes saved runs', () => {
    const dir = mkdtempSync(join(tmpdir(), 'skilleval-runs-'));
    const store = createRunHistoryStore(join(dir, 'runs.sqlite'));

    try {
      const created = store.create({
        status: 'idle',
        config: { skillA: { filename: 'A.txt' }, skillB: { filename: 'B.txt' }, prompts: ['p1'] },
        evaluations: [],
      });

      expect(created.id).toBeTruthy();
      expect(created.name).toBe('A.txt vs B.txt');

      const updated = store.update(created.id, {
        status: 'judging',
        config: { skillA: { filename: 'A.txt' }, skillB: { filename: 'B.txt' }, prompts: ['p1'] },
        evaluations: [
          {
            resultA: { status: 'complete' },
            resultB: { status: 'complete' },
            judge: { status: 'complete' },
          },
        ],
      }, 'Custom run');

      expect(updated.name).toBe('Custom run');
      expect(updated.generatedCount).toBe(1);
      expect(updated.judgedCount).toBe(1);
      expect(store.list()).toHaveLength(1);
      expect(store.get(created.id).payload.status).toBe('judging');
      expect(store.delete(created.id)).toBe(true);
      expect(store.list()).toHaveLength(0);
    } finally {
      store.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
