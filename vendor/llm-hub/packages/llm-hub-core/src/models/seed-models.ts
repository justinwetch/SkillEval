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
  embeddingModel('gemini', 'text-embedding-004', 'Text Embedding 004'),

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
