import { parseNamespacedModelId } from '../constants/model-id';
import type { ModelDefinition } from '../types';

export function listCatalogModels(
  models: ModelDefinition[],
  providerId?: string,
): ModelDefinition[] {
  return models.filter((model) => !providerId || model.providerId === providerId);
}

export function findCatalogModel(
  models: ModelDefinition[],
  providerId: string,
  modelId: string,
): ModelDefinition | undefined {
  return models.find(
    (model) => model.providerId === providerId && model.modelId === modelId,
  );
}

export function findCatalogModelByFullId(
  models: ModelDefinition[],
  fullModelId: string,
): ModelDefinition | undefined {
  const { providerId, modelId } = parseNamespacedModelId(fullModelId);
  return findCatalogModel(models, providerId, modelId);
}
