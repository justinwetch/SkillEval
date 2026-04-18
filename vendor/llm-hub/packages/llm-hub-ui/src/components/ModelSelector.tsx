import type { ModelKind } from '@llm-hub/core';

import type { ServerModelRecord } from '../types';
import { CapabilitiesChips } from './CapabilitiesChips';

export interface ModelSelectorProps {
  label: string;
  models: ServerModelRecord[];
  selectedProviderId: string;
  selectedModelId: string;
  kind?: ModelKind;
  className?: string;
  onProviderChange: (providerId: string) => void;
  onModelChange: (modelId: string) => void;
  actionLabel?: string;
  onAction?: () => void;
}

export function ModelSelector({
  label,
  models,
  selectedProviderId,
  selectedModelId,
  kind = 'language',
  className,
  onProviderChange,
  onModelChange,
  actionLabel,
  onAction,
}: ModelSelectorProps) {
  const providerOptions = Array.from(new Set(models.map((model) => model.providerId)));
  const filteredModels = models.filter(
    (model) => model.providerId === selectedProviderId && model.kind === kind,
  );
  const selectedModel = filteredModels.find((model) => model.modelId === selectedModelId);
  const capabilityTags = selectedModel
    ? [
        selectedModel.supportsTools ? 'tools' : null,
        selectedModel.supportsVision ? 'vision' : null,
        selectedModel.supportsStreaming ? 'streaming' : null,
        selectedModel.supportsReasoning ? 'reasoning' : null,
        selectedModel.supportsEmbeddings ? 'embeddings' : null,
        selectedModel.isFree ? 'free' : null,
        selectedModel.isExperimental ? 'experimental' : null,
      ].filter(Boolean) as string[]
    : [];

  return (
    <div className={`llm-hub-ui-model-selector ${className ?? ''}`.trim()}>
      <div className="llm-hub-ui-model-selector__header">
        <h4>{label}</h4>
        {actionLabel && onAction ? (
          <button type="button" className="llm-hub-ui-link-button" onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
      </div>

      <div className="llm-hub-ui-model-selector__controls">
        <label>
          <span>Provider</span>
          <select value={selectedProviderId} onChange={(event) => onProviderChange(event.target.value)}>
            {providerOptions.map((providerId) => (
              <option key={providerId} value={providerId}>
                {providerId}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Model</span>
          <select value={selectedModelId} onChange={(event) => onModelChange(event.target.value)}>
            {filteredModels.map((model) => (
              <option key={model.modelId} value={model.modelId}>
                {model.displayName}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedModel ? (
        <>
          <p className="llm-hub-ui-model-selector__description">
            {selectedModel.description ?? 'Model metadata from the server catalog.'}
          </p>
          <CapabilitiesChips items={capabilityTags} />
        </>
      ) : (
        <p className="llm-hub-ui-muted">No model available for this provider and kind.</p>
      )}
    </div>
  );
}
