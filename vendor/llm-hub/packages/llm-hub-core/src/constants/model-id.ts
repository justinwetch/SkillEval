export const MODEL_ID_SEPARATOR = ':';

export function createNamespacedModelId(
  providerId: string,
  modelId: string,
): string {
  return `${providerId}${MODEL_ID_SEPARATOR}${modelId}`;
}

export function parseNamespacedModelId(value: string): {
  providerId: string;
  modelId: string;
} {
  const separatorIndex = value.indexOf(MODEL_ID_SEPARATOR);

  if (separatorIndex <= 0 || separatorIndex === value.length - 1) {
    throw new Error(
      `Invalid namespaced model id \"${value}\". Expected providerId:modelId.`,
    );
  }

  return {
    providerId: value.slice(0, separatorIndex),
    modelId: value.slice(separatorIndex + 1),
  };
}
