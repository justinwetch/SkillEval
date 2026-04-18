import type { ProviderSummaryContract } from '../types';
import { CapabilitiesChips } from './CapabilitiesChips';
import { ProviderStatusBadge } from './ProviderStatusBadge';

export interface ConnectionSummaryProps {
  provider: ProviderSummaryContract;
  onDisconnect: () => void;
  className?: string;
}

export function ConnectionSummary({
  provider,
  onDisconnect,
  className,
}: ConnectionSummaryProps) {
  const connection = provider.connection;

  if (!connection) {
    return null;
  }

  return (
    <div className={`llm-hub-ui-connection-summary ${className ?? ''}`.trim()}>
      <div className="llm-hub-ui-connection-summary__header">
        <div>
          <h4>{provider.name}</h4>
          <p>{connection.authMethodId.replace(/_/g, ' ')}</p>
        </div>
        <ProviderStatusBadge connected={provider.connected} defaultProvider={provider.default} />
      </div>

      <CapabilitiesChips items={provider.capabilities} />

      {connection.secretMasks.length > 0 ? (
        <ul className="llm-hub-ui-connection-summary__secrets">
          {connection.secretMasks.map((mask) => (
            <li key={mask.fieldKey}>
              <span>{mask.fieldKey}</span>
              <code>{mask.maskedValue}</code>
            </li>
          ))}
        </ul>
      ) : (
        <p className="llm-hub-ui-muted">No stored secrets were needed for this connection.</p>
      )}

      {connection.health ? (
        <p
          className={`llm-hub-ui-connection-summary__health ${
            connection.health.ok ? 'is-healthy' : 'is-unhealthy'
          }`}
        >
          {connection.health.message}
        </p>
      ) : null}

      <button type="button" className="llm-hub-ui-link-button" onClick={onDisconnect}>
        Disconnect
      </button>
    </div>
  );
}
