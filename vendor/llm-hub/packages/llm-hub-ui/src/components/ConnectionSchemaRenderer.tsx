import { useEffect, useMemo, useState } from 'react';
import type { UIActionSchema } from '@llm-hub/core';

import { useAsyncData } from '../hooks/useAsyncData';
import type { LLMHubUIAdapter } from '../lib/adapter';
import { LLMHubUIRequestError } from '../lib/adapter';
import { getErrorMessage, getValidationErrors } from '../lib/error-utils';
import { createInitialFormState, sanitizeFormPayload } from '../lib/schema-form';
import { isVisible } from '../lib/visibility';
import type {
  AuthMethodContract,
  LLMHubUIActionCompleteEvent,
  LLMHubUIFeedback,
  LLMHubUIHostMode,
  LLMHubUIDensity,
  ProviderSummaryContract,
} from '../types';
import { ActionBar } from './ActionBar';
import { DynamicFieldRenderer } from './DynamicFieldRenderer';
import { WarningCallout } from './WarningCallout';

async function launchOauthPopup(options: {
  start: () => Promise<{ launchUrl?: string }>;
}): Promise<void> {
  const popup = window.open('', 'llm-hub-oauth', 'width=680,height=760,resizable=yes,scrollbars=yes');

  if (!popup) {
    throw new Error('Popup blocked. Please allow popups to continue the OAuth flow.');
  }

  const result = await options.start();

  if (!result.launchUrl) {
    popup.close();
    throw new Error('OAuth launch URL was not returned by the server.');
  }

  popup.location.href = result.launchUrl;

  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error('OAuth flow timed out.'));
    }, 120000);

    const poll = window.setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error('OAuth flow was closed before it completed.'));
      }
    }, 500);

    const onMessage = (event: MessageEvent) => {
      const payload = event.data as { source?: string; payload?: unknown };

      if (payload?.source !== 'llm-hub-server') {
        return;
      }

      cleanup();
      popup.close();
      resolve();
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      window.clearInterval(poll);
      window.removeEventListener('message', onMessage);
    };

    window.addEventListener('message', onMessage);
  });
}

export interface ConnectionSchemaRendererProps {
  adapter: LLMHubUIAdapter;
  provider: ProviderSummaryContract;
  authMethod: AuthMethodContract;
  hostMode: LLMHubUIHostMode;
  onMutation: () => Promise<void>;
  onClose?: () => void;
  className?: string;
  density?: LLMHubUIDensity;
  feedbackMode?: 'inline' | 'external';
  onFeedback?: (feedback: LLMHubUIFeedback) => void;
  onActionComplete?: (event: LLMHubUIActionCompleteEvent) => void;
  onActionError?: (error: unknown) => void;
}

export function ConnectionSchemaRenderer({
  adapter,
  provider,
  authMethod,
  hostMode,
  onMutation,
  onClose,
  className,
  density = 'auto',
  feedbackMode = 'inline',
  onFeedback,
  onActionComplete,
  onActionError,
}: ConnectionSchemaRendererProps) {
  const schemaState = useAsyncData(
    () => adapter.getUISchema(provider.id, authMethod.id, hostMode),
    [adapter, provider.id, authMethod.id, hostMode],
  );
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<LLMHubUIFeedback | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);

  useEffect(() => {
    const schema = schemaState.data;

    if (!schema) {
      return;
    }

    setFormValues((current) => ({
      ...createInitialFormState(schema),
      ...current,
    }));
    setValidationErrors(schema.validationErrors);
  }, [schemaState.data]);

  const visibleSections = useMemo(() => {
    if (!schemaState.data) {
      return [];
    }

    return schemaState.data.fieldGroups
      .filter((section) =>
        isVisible(section.visibility, {
          selectedAuthMethodId: authMethod.id,
          fields: formValues,
          connectionStatus: schemaState.data?.schema.status,
        }),
      )
      .map((section) => ({
        ...section,
        fields: section.fields.filter((field) =>
          isVisible(field.visibility, {
            selectedAuthMethodId: authMethod.id,
            fields: formValues,
            connectionStatus: schemaState.data?.schema.status,
          }),
        ),
      }));
  }, [authMethod.id, formValues, schemaState.data]);

  const effectiveActions = useMemo(() => {
    if (!schemaState.data) {
      return [] as UIActionSchema[];
    }

    if (authMethod.uxMode === 'oauth_redirect') {
      return [
        {
          id: `oauth-${authMethod.id}`,
          kind: 'oauth_launch' as const,
          label: authMethod.ctaMetadata?.buttonLabel ?? 'Continue with OAuth',
          variant: 'primary' as const,
          helperText: authMethod.availabilityMessage,
        },
        ...schemaState.data.schema.actions.filter((action) => action.kind === 'disconnect'),
      ];
    }

    return schemaState.data.schema.actions.filter((action) =>
      isVisible(action.visibility, {
        selectedAuthMethodId: authMethod.id,
        fields: formValues,
        connectionStatus: schemaState.data?.schema.status,
      }),
    );
  }, [authMethod, formValues, schemaState.data]);

  const pushFeedback = (feedback: LLMHubUIFeedback) => {
    onFeedback?.(feedback);
    if (feedbackMode === 'inline') {
      setBanner(feedback);
    }
  };

  const handleFieldChange = (fieldKey: string, value: unknown) => {
    setFormValues((current) => ({ ...current, [fieldKey]: value }));
  };

  const handleAction = async (action: UIActionSchema) => {
    setBanner(null);
    setPendingActionId(action.id);

    try {
      if (action.kind === 'disconnect') {
        const result = await adapter.disconnect(provider.id);
        pushFeedback({ tone: 'success', text: `${provider.name} disconnected.`, actionId: action.id });
        onActionComplete?.({ action, result, providerId: provider.id, authMethodId: authMethod.id });
        await onMutation();
        return;
      }

      if (action.kind === 'test_connection') {
        const result = await adapter.testConnection(provider.id);
        pushFeedback({
          tone: result.result.ok ? 'success' : 'danger',
          text: result.result.message,
          actionId: action.id,
        });
        onActionComplete?.({ action, result, providerId: provider.id, authMethodId: authMethod.id });
        await onMutation();
        return;
      }

      if (authMethod.uxMode === 'oauth_redirect') {
        if (!authMethod.available) {
          throw new Error(
            authMethod.availabilityMessage ?? 'This OAuth method is not yet available.',
          );
        }

        const callbackUrl = adapter.createOAuthCallbackUrl(provider.id);
        const result = await adapter.startOAuth(provider.id, callbackUrl);

        await launchOauthPopup({
          start: async () => result,
        });

        pushFeedback({ tone: 'success', text: `${provider.name} connected.`, actionId: action.id });
        onActionComplete?.({ action, result, providerId: provider.id, authMethodId: authMethod.id });
        await onMutation();
        return;
      }

      const payload = sanitizeFormPayload(formValues);
      const defaultModelId = typeof payload.modelId === 'string' ? payload.modelId : undefined;
      const result = await adapter.connect(provider.id, {
        method: authMethod.id,
        payload,
        defaultModelId,
      });

      pushFeedback({
        tone: 'success',
        text: result.validation?.message ?? `${provider.name} connected.`,
        actionId: action.id,
      });
      setValidationErrors({});
      onActionComplete?.({ action, result, providerId: provider.id, authMethodId: authMethod.id });
      await onMutation();
    } catch (error) {
      onActionError?.(error);
      pushFeedback({ tone: 'danger', text: getErrorMessage(error), actionId: action.id });
      setValidationErrors(getValidationErrors(error));

      if (error instanceof LLMHubUIRequestError) {
        const nextSchema = error.details?.uiSchema;

        if (nextSchema && typeof nextSchema === 'object') {
          schemaState.setData(nextSchema as typeof schemaState.data);
        }
      }
    } finally {
      setPendingActionId(null);
    }
  };

  if (schemaState.loading) {
    return <div className="llm-hub-ui-muted">Loading provider schema...</div>;
  }

  if (schemaState.error || !schemaState.data) {
    return (
      <WarningCallout title="Setup schema failed to load" tone="danger">
        {schemaState.error ?? 'Unknown error'}
      </WarningCallout>
    );
  }

  const dense = density === 'auto' ? schemaState.data.layoutHints.density === 'compact' : density === 'compact';

  return (
    <section
      className={`llm-hub-ui-schema-renderer llm-hub-ui-schema-renderer--${hostMode} ${
        className ?? ''
      }`.trim()}
    >
      <div className="llm-hub-ui-schema-renderer__header">
        <div>
          <p className="llm-hub-ui-eyebrow">{hostMode.replace(/_/g, ' ')}</p>
          <h3>{provider.name} setup</h3>
          <p className="llm-hub-ui-muted">{schemaState.data.emptyStateText}</p>
        </div>
        {onClose ? (
          <button type="button" className="llm-hub-ui-link-button" onClick={onClose}>
            Close
          </button>
        ) : null}
      </div>

      {feedbackMode === 'inline' && banner ? (
        <WarningCallout
          title={banner.tone === 'success' ? 'Success' : 'Needs attention'}
          tone={banner.tone === 'success' ? 'success' : 'danger'}
        >
          {banner.text}
        </WarningCallout>
      ) : null}

      {schemaState.data.experimentalWarnings.map((warning) => (
        <WarningCallout key={warning} title="Experimental flow" tone="warning">
          {warning}
        </WarningCallout>
      ))}

      {!authMethod.available ? (
        <WarningCallout title="Unavailable method" tone="warning">
          {authMethod.availabilityMessage ??
            'This method is intentionally visible as a future placeholder.'}
        </WarningCallout>
      ) : null}

      <div className="llm-hub-ui-schema-renderer__sections">
        {visibleSections.map((section) => (
          <div key={section.id} className="llm-hub-ui-schema-section">
            {!(section.fields.length === 1 &&
              section.title === section.fields[0]?.label &&
              !section.description) ? (
              <div className="llm-hub-ui-schema-section__header">
                <div>
                  <h4>{section.title}</h4>
                  {section.description ? <p>{section.description}</p> : null}
                </div>
              </div>
            ) : null}

            {section.warnings.map((warning) => (
              <WarningCallout key={warning} title="Heads up" tone="warning">
                {warning}
              </WarningCallout>
            ))}

            {section.fields.length > 0 ? (
              <div className="llm-hub-ui-field-grid">
                {section.fields.map((field) => (
                  <DynamicFieldRenderer
                    key={field.key}
                    field={field}
                    value={formValues[field.key]}
                    error={validationErrors[field.key]}
                    dense={dense}
                    onChange={handleFieldChange}
                  />
                ))}
              </div>
            ) : (
              <p className="llm-hub-ui-muted">No manual fields are required for this method.</p>
            )}
          </div>
        ))}
      </div>

      <ActionBar
        actions={effectiveActions}
        disabled={Boolean(pendingActionId) || !authMethod.available}
        pendingActionId={pendingActionId}
        placement={schemaState.data.layoutHints.actionsPlacement}
        onAction={handleAction}
      />

      <p className="llm-hub-ui-muted">{schemaState.data.successStateText}</p>
    </section>
  );
}
