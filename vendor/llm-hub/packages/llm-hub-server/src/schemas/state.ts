import { z } from 'zod';

import type { ConnectionHealthRecord, DefaultModelSelection, ServerState } from '../contracts';

export const defaultModelSelectionSchema: z.ZodType<DefaultModelSelection> = z.object({
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  updatedAt: z.string(),
});

export const connectionHealthRecordSchema: z.ZodType<ConnectionHealthRecord> = z.object({
  ok: z.boolean(),
  status: z.enum(['healthy', 'unhealthy']),
  message: z.string().min(1),
  checkedAt: z.string(),
});

export const serverStateSchema: z.ZodType<ServerState> = z.object({
  defaultModel: defaultModelSelectionSchema.nullable(),
  connectionHealth: z.record(z.string(), connectionHealthRecordSchema),
});
