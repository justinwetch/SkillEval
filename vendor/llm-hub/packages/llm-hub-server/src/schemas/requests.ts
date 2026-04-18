import { z } from 'zod';

import { hostModeValues } from '../contracts';

export const hostModeSchema = z.enum(hostModeValues);

export const providerUiSchemaQuerySchema = z.object({
  method: z.string().min(1).optional(),
  hostMode: hostModeSchema.optional(),
});

export const connectRequestSchema = z.object({
  method: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
  defaultModelId: z.string().min(1).optional(),
});

export const defaultModelRequestSchema = z.object({
  providerId: z.string().min(1),
  modelId: z.string().min(1),
});

export const modelsQuerySchema = z.object({
  providerId: z.string().min(1).optional(),
});

export const oauthStartQuerySchema = z.object({
  callbackUrl: z.string().url().optional(),
  redirect: z.enum(['true', 'false']).optional(),
});

export const oauthCallbackQuerySchema = z.object({
  format: z.enum(['json', 'html']).optional(),
  code: z.string().optional(),
  state: z.string().optional(),
}).catchall(z.string());

export const chatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.any(),
});

export const chatRequestSchema = z.object({
  providerId: z.string().min(1).optional(),
  modelId: z.string().min(1).optional(),
  prompt: z.string().min(1).optional(),
  messages: z.array(chatMessageSchema).optional(),
  system: z.string().min(1).optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
}).refine((value) => Boolean(value.prompt || value.messages?.length), {
  message: 'Either prompt or messages must be provided.',
  path: ['prompt'],
});

export const embedRequestSchema = z.object({
  providerId: z.string().min(1).optional(),
  modelId: z.string().min(1).optional(),
  value: z.string().min(1).optional(),
  values: z.array(z.string().min(1)).min(1).optional(),
}).refine((value) => Boolean(value.value || value.values?.length), {
  message: 'Either value or values must be provided.',
  path: ['value'],
});
