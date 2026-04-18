import { describe, expect, it } from 'vitest';

import { createTestServer } from './test-helpers';

describe('/providers/:id/ui-schema', () => {
  it('returns host-aware schema and layout metadata', async () => {
    const { app } = createTestServer();
    const response = await app.request(
      '/providers/custom-openai-compatible/ui-schema?method=openai_compatible&hostMode=sidebar',
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.hostMode).toBe('sidebar');
    expect(body.layoutHints.chrome).toBe('sidebar_panel');
    expect(body.fieldGroups).toEqual(expect.any(Array));
    expect(body.primaryAction).toMatchObject({ kind: 'connect' });
    expect(body.conditionalVisibility).toEqual(expect.any(Array));
    expect(body.successStateText).toEqual(expect.any(String));
    expect(body.emptyStateText).toEqual(expect.any(String));
  });
});
