import type { ProviderSummaryContract } from '../types';
import { CapabilitiesChips } from './CapabilitiesChips';
import { ProviderStatusBadge } from './ProviderStatusBadge';

export interface ProviderCardProps {
  provider: ProviderSummaryContract;
  selected: boolean;
  onSelect: () => void;
  className?: string;
}

export function ProviderCard({
  provider,
  selected,
  onSelect,
  className,
}: ProviderCardProps) {
  return (
    <button
      type="button"
      className={`llm-hub-ui-provider-card ${
        selected ? 'llm-hub-ui-provider-card--selected' : ''
      } ${className ?? ''}`.trim()}
      onClick={onSelect}
    >
      <div className="llm-hub-ui-provider-card__header">
        <div>
          <p className="llm-hub-ui-eyebrow">{provider.category.replace(/_/g, ' ')}</p>
          <h3>{provider.name}</h3>
        </div>
        <ProviderStatusBadge
          connected={provider.connected}
          defaultProvider={provider.default}
          experimental={provider.experimental}
        />
      </div>

      <p className="llm-hub-ui-provider-card__meta">
        {provider.availableAuthMethods.length} auth method
        {provider.availableAuthMethods.length === 1 ? '' : 's'}
      </p>

      <CapabilitiesChips items={provider.capabilities} />
      <CapabilitiesChips items={provider.warningBadges} tone="warning" />

      <div className="llm-hub-ui-provider-card__footer">
        <span>{provider.connected ? 'Ready for testing' : 'Needs setup'}</span>
        <span>{provider.uiHints.preferredHostMode.replace(/_/g, ' ')}</span>
      </div>
    </button>
  );
}
