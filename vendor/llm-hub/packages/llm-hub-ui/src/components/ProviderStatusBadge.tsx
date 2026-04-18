export interface ProviderStatusBadgeProps {
  connected: boolean;
  defaultProvider?: boolean;
  experimental?: boolean;
  className?: string;
}

export function ProviderStatusBadge({
  connected,
  defaultProvider,
  experimental,
  className,
}: ProviderStatusBadgeProps) {
  return (
    <div className={`llm-hub-ui-status-badges ${className ?? ''}`.trim()}>
      <span
        className={`llm-hub-ui-status-badge ${
          connected ? 'llm-hub-ui-status-badge--connected' : 'llm-hub-ui-status-badge--idle'
        }`}
      >
        {connected ? 'Connected' : 'Disconnected'}
      </span>
      {defaultProvider ? (
        <span className="llm-hub-ui-status-badge llm-hub-ui-status-badge--default">Default</span>
      ) : null}
      {experimental ? (
        <span className="llm-hub-ui-status-badge llm-hub-ui-status-badge--experimental">
          Experimental
        </span>
      ) : null}
    </div>
  );
}
