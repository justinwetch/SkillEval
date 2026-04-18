import { useEffect, useRef } from 'react';

import { useAsyncData } from '../hooks/useAsyncData';
import type { LLMHubUIAdapter } from '../lib/adapter';
import type { AuthMethodContract } from '../types';
import { WarningCallout } from './WarningCallout';

export interface AuthMethodSelectorProps {
  adapter: LLMHubUIAdapter;
  providerId: string;
  selectedMethodId: string | null;
  onSelect: (methodId: string) => void;
  onMethodsLoaded?: (methods: AuthMethodContract[]) => void;
  className?: string;
}

export function AuthMethodSelector({
  adapter,
  providerId,
  selectedMethodId,
  onSelect,
  onMethodsLoaded,
  className,
}: AuthMethodSelectorProps) {
  const methodsState = useAsyncData(() => adapter.getAuthMethods(providerId), [adapter, providerId]);
  const onMethodsLoadedRef = useRef(onMethodsLoaded);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onMethodsLoadedRef.current = onMethodsLoaded;
  }, [onMethodsLoaded]);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    const methods = methodsState.data?.authMethods ?? [];

    if (methods.length === 0) {
      return;
    }

    onMethodsLoadedRef.current?.(methods);

    if (!selectedMethodId || !methods.some((method) => method.id === selectedMethodId)) {
      onSelectRef.current(methods[0].id);
    }
  }, [methodsState.data, selectedMethodId]);

  if (methodsState.loading) {
    return <div className="llm-hub-ui-muted">Loading auth methods...</div>;
  }

  if (methodsState.error) {
    return (
      <WarningCallout title="Auth methods failed to load" tone="danger">
        {methodsState.error}
      </WarningCallout>
    );
  }

  return (
    <div className={`llm-hub-ui-auth-method-selector ${className ?? ''}`.trim()}>
      {(methodsState.data?.authMethods ?? []).map((method) => {
        const selected = method.id === selectedMethodId;

        return (
          <button
            key={method.id}
            type="button"
            className={`llm-hub-ui-auth-method-card ${
              selected ? 'llm-hub-ui-auth-method-card--selected' : ''
            }`}
            onClick={() => onSelect(method.id)}
          >
            <div className="llm-hub-ui-auth-method-card__header">
              <div>
                <strong>{method.label}</strong>
                <p>{method.description}</p>
              </div>
              <span className="llm-hub-ui-chip llm-hub-ui-chip--neutral">
                {method.uxMode.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="llm-hub-ui-chip-list">
              {method.experimental ? (
                <span className="llm-hub-ui-chip llm-hub-ui-chip--warning">experimental</span>
              ) : null}
              {!method.available ? (
                <span className="llm-hub-ui-chip llm-hub-ui-chip--warning">unavailable</span>
              ) : null}
              {method.badges.map((badge) => (
                <span key={badge} className="llm-hub-ui-chip llm-hub-ui-chip--neutral">
                  {badge}
                </span>
              ))}
            </div>

            {method.warning ? (
              <p className="llm-hub-ui-auth-method-card__warning">{method.warning}</p>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
