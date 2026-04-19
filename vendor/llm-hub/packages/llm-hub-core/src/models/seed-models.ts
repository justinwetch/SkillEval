import { createNamespacedModelId } from '../constants/model-id';
import type { ModelDefinition } from '../types';

function languageModel(
  providerId: string,
  modelId: string,
  displayName: string,
  capabilities: Partial<ModelDefinition>,
): ModelDefinition {
  return {
    providerId,
    modelId,
    fullModelId: createNamespacedModelId(providerId, modelId),
    displayName,
    kind: 'language',
    supportsStreaming: false,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsEmbeddings: false,
    isFree: false,
    isExperimental: false,
    tags: [],
    ...capabilities,
  };
}

function embeddingModel(
  providerId: string,
  modelId: string,
  displayName: string,
  capabilities: Partial<ModelDefinition> = {},
): ModelDefinition {
  return {
    providerId,
    modelId,
    fullModelId: createNamespacedModelId(providerId, modelId),
    displayName,
    kind: 'embedding',
    supportsStreaming: false,
    supportsTools: false,
    supportsVision: false,
    supportsReasoning: false,
    supportsEmbeddings: true,
    isFree: false,
    isExperimental: false,
    tags: ['embeddings'],
    ...capabilities,
  };
}

export const seedModels: ModelDefinition[] = [
  languageModel('openai', 'gpt-4o-mini', 'GPT-4o Mini', {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    tags: ['balanced'],
  }),
  languageModel('openai', 'gpt-5', 'GPT-5', {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    tags: ['reasoning'],
  }),
  embeddingModel('openai', 'text-embedding-3-small', 'Text Embedding 3 Small'),

  languageModel('codex-bridge', 'gpt-5', 'Codex Bridge - GPT-5', {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    tags: ['bridge', 'reasoning'],
  }),
  languageModel('codex-bridge', 'gpt-5-mini', 'Codex Bridge - GPT-5 Mini', {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    tags: ['bridge', 'fast'],
  }),
  languageModel('codex-bridge', 'gpt-5-codex', 'Codex Bridge - GPT-5-Codex', {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    tags: ['bridge', 'coding'],
  }),
  languageModel('codex-bridge', 'gpt-5.1-codex', 'Codex Bridge - GPT-5.1-Codex', {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    tags: ['bridge', 'coding'],
  }),
  languageModel(
    'codex-bridge',
    'gpt-5.1-codex-mini',
    'Codex Bridge - GPT-5.1-Codex Mini',
    {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsReasoning: true,
      tags: ['bridge', 'coding', 'fast'],
    },
  ),
  languageModel(
    'codex-bridge',
    'gpt-5.1-codex-max',
    'Codex Bridge - GPT-5.1-Codex Max',
    {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsReasoning: true,
      tags: ['bridge', 'coding', 'reasoning'],
    },
  ),
  languageModel('codex-bridge', 'gpt-5.2-codex', 'Codex Bridge - GPT-5.2-Codex', {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    tags: ['bridge', 'coding', 'reasoning'],
  }),

  languageModel('anthropic', 'claude-haiku-3-5', 'Claude Haiku 3.5', {
    supportsStreaming: true,
    supportsTools: true,
    tags: ['fast'],
  }),
  languageModel('anthropic', 'claude-sonnet-4-5-20250929', 'Claude Sonnet 4.5', {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    tags: ['reasoning'],
  }),

  languageModel('gemini', 'gemini-2.5-flash', 'Gemini 2.5 Flash', {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    tags: ['fast'],
  }),
  languageModel('gemini', 'gemini-2.5-pro', 'Gemini 2.5 Pro', {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    tags: ['reasoning'],
  }),
  languageModel('gemini', 'gemini-3-flash-preview', 'Gemini 3 Flash Preview', {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    isExperimental: true,
    tags: ['fast', 'preview'],
  }),
  languageModel('gemini', 'gemini-3-pro-preview', 'Gemini 3 Pro Preview', {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    isExperimental: true,
    tags: ['reasoning', 'preview'],
  }),
  languageModel('gemini', 'gemini-3.1-pro-preview', 'Gemini 3.1 Pro Preview', {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    isExperimental: true,
    tags: ['reasoning', 'preview'],
  }),
  languageModel('gemini', 'gemini-3.1-flash-lite-preview', 'Gemini 3.1 Flash Lite Preview', {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    isExperimental: true,
    tags: ['fast', 'preview'],
  }),
  embeddingModel('gemini', 'text-embedding-004', 'Text Embedding 004'),

  languageModel('github-models', 'openai/gpt-5.4', 'GitHub Models - GPT-5.4', {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    tags: ['github', 'reasoning'],
  }),
  languageModel('github-models', 'openai/gpt-5.2-codex', 'GitHub Models - GPT-5.2-Codex', {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    tags: ['github', 'coding', 'reasoning'],
  }),
  languageModel('github-models', 'openai/gpt-5.3-codex', 'GitHub Models - GPT-5.3-Codex', {
    supportsStreaming: true,
    supportsTools: true,
    supportsVision: true,
    supportsReasoning: true,
    tags: ['github', 'coding', 'reasoning'],
  }),
  languageModel(
    'github-models',
    'anthropic/claude-sonnet-4.5',
    'GitHub Models - Claude Sonnet 4.5',
    {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsReasoning: true,
      tags: ['github', 'balanced'],
    },
  ),
  languageModel(
    'github-models',
    'anthropic/claude-opus-4.5',
    'GitHub Models - Claude Opus 4.5',
    {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsReasoning: true,
      tags: ['github', 'reasoning'],
    },
  ),

  languageModel('deepinfra', 'zai-org/GLM-5.1', 'DeepInfra - GLM-5.1', {
    supportsStreaming: true,
    supportsTools: true,
    supportsReasoning: true,
    tags: ['coding', 'reasoning'],
  }),
  languageModel('deepinfra', 'Qwen/Qwen3.5-397B-A17B', 'DeepInfra - Qwen3.5 397B', {
    supportsStreaming: true,
    supportsTools: true,
    supportsReasoning: true,
    tags: ['reasoning'],
  }),
  languageModel('deepinfra', 'deepseek-ai/DeepSeek-V3', 'DeepInfra - DeepSeek V3', {
    supportsStreaming: true,
    supportsTools: true,
    supportsReasoning: true,
    tags: ['coding', 'reasoning'],
  }),
  languageModel('deepinfra', 'meta-llama/Llama-3.3-70B-Instruct', 'DeepInfra - Llama 3.3 70B', {
    supportsStreaming: true,
    supportsTools: true,
    tags: ['balanced'],
  }),
  languageModel('deepinfra', 'Qwen/Qwen2.5-Coder-32B-Instruct', 'DeepInfra - Qwen2.5 Coder 32B', {
    supportsStreaming: true,
    supportsTools: true,
    tags: ['coding', 'fast'],
  }),

  languageModel('openrouter', 'openai/gpt-5-mini', 'OpenRouter - GPT-5 Mini', {
    supportsStreaming: true,
    supportsTools: true,
    tags: ['router'],
  }),
  languageModel(
    'openrouter',
    'deepseek/deepseek-r1:free',
    'OpenRouter - DeepSeek R1 Free',
    {
      supportsStreaming: true,
      supportsReasoning: true,
      isFree: true,
      isExperimental: true,
      tags: ['free', 'reasoning'],
    },
  ),
  languageModel(
    'openrouter',
    'anthropic/claude-sonnet-4.5',
    'OpenRouter - Claude Sonnet 4.5',
    {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      supportsReasoning: true,
      tags: ['router'],
    },
  ),

  languageModel('ollama', 'llama3.2', 'Ollama - Llama 3.2', {
    supportsStreaming: true,
    isFree: true,
    tags: ['local'],
  }),
  languageModel('ollama', 'qwen3:4b', 'Ollama - Qwen3 4B', {
    supportsStreaming: true,
    supportsReasoning: true,
    isFree: true,
    tags: ['local', 'reasoning'],
  }),
  embeddingModel('ollama', 'nomic-embed-text', 'Ollama - Nomic Embed Text', {
    isFree: true,
    tags: ['local', 'embeddings'],
  }),

  languageModel(
    'custom-openai-compatible',
    'gpt-4o-mini',
    'Custom OpenAI-Compatible - GPT-4o Mini',
    {
      supportsStreaming: true,
      supportsTools: true,
      supportsVision: true,
      tags: ['custom-endpoint'],
    },
  ),
  languageModel(
    'custom-openai-compatible',
    'gpt-5-mini',
    'Custom OpenAI-Compatible - GPT-5 Mini',
    {
      supportsStreaming: true,
      supportsTools: true,
      supportsReasoning: true,
      tags: ['custom-endpoint'],
    },
  ),
  embeddingModel(
    'custom-openai-compatible',
    'text-embedding-3-small',
    'Custom OpenAI-Compatible - Text Embedding 3 Small',
    {
      tags: ['custom-endpoint', 'embeddings'],
    },
  ),
];
