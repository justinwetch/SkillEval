import { AuthMethodNotFoundError, OAuthSessionError } from '../errors';
import { safeParseJsonRecord } from '../utils/json';
import { createCodeChallenge, createCodeVerifier, createRandomId } from '../utils/pkce';
import { nowIso } from '../utils/time';
import type {
  AuthValidationResult,
  JSONValue,
  ProviderConnection,
  ProviderAuthMethod,
  StoredOAuthSession,
  UISectionSchema,
} from '../types';
import { createValidatedResult, createPendingOAuthResult, type AuthBeginResult, type AuthCompleteResult } from './auth-results';
import type { AuthHandlerContext, ProviderAuthHandler } from './auth-method-handler';

function buildFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof Error) || !('issues' in error)) {
    return { _root: error instanceof Error ? error.message : 'Validation failed.' };
  }

  const issues = (error as { issues: Array<{ path: Array<string | number>; message: string }> }).issues;

  return issues.reduce<Record<string, string>>((accumulator, issue) => {
    const key = String(issue.path[0] ?? '_root');
    accumulator[key] = issue.message;
    return accumulator;
  }, {});
}

function mergeWarnings(method: ProviderAuthMethod): string[] {
  const warnings: string[] = [];

  if (method.warning) {
    warnings.push(method.warning);
  }

  if (method.experimental) {
    warnings.push('This authentication method is experimental.');
  }

  return warnings;
}

function createValidationResult(
  method: ProviderAuthMethod,
  options: {
    valid: boolean;
    status: 'success' | 'warning' | 'error';
    message?: string;
    fieldErrors?: Record<string, string>;
    normalizedPayload?: Record<string, JSONValue>;
    secretFieldKeys?: string[];
  },
): AuthValidationResult {
  const normalizedPayload = options.normalizedPayload;
  const secretMasks = Object.entries(normalizedPayload ?? {}).reduce(
    (accumulator, [fieldKey, value]) => {
      if (!options.secretFieldKeys?.includes(fieldKey) || typeof value !== 'string') {
        return accumulator;
      }

      accumulator.push({
        fieldKey,
        isSecret: true as const,
        maskedValue: `${value.slice(0, 2)}****${value.slice(-4)}`,
        lastFour: value.slice(-4),
      });

      return accumulator;
    },
    [] as AuthValidationResult['secretMasks'],
  );

  return {
    valid: options.valid,
    status: options.status,
    message: options.message,
    fieldErrors: options.fieldErrors ?? {},
    warnings: mergeWarnings(method),
    secretMasks,
    normalizedPayload,
  };
}

export function createProviderAuthHandler(
  context: AuthHandlerContext,
): ProviderAuthHandler {
  const getMethodDefinition = (methodId: string) => {
    const methodDefinition = context.provider.methods[methodId];

    if (!methodDefinition) {
      throw new AuthMethodNotFoundError(context.provider.provider.id, methodId);
    }

    return methodDefinition;
  };

  const normalizePayload = async (
    methodId: string,
    payload: Record<string, JSONValue>,
  ): Promise<AuthValidationResult> => {
    const methodDefinition = getMethodDefinition(methodId);
    const { method } = methodDefinition;

    if (method.featureFlag && context.featureFlags[method.featureFlag] !== true) {
      return createValidationResult(method, {
        valid: false,
        status: 'error',
        message: `Feature flag \"${method.featureFlag}\" is disabled.`,
      });
    }

    try {
      const parsed = methodDefinition.inputSchema.parse(payload);
      const normalizedPayload = { ...parsed };

      if ('headersJson' in normalizedPayload) {
        const parsedHeaders = safeParseJsonRecord(
          typeof normalizedPayload.headersJson === 'string'
            ? normalizedPayload.headersJson
            : undefined,
        );

        if (!parsedHeaders.ok) {
          return createValidationResult(method, {
            valid: false,
            status: 'error',
            fieldErrors: { headersJson: parsedHeaders.error },
          });
        }

        normalizedPayload.headers = parsedHeaders.value;
        delete normalizedPayload.headersJson;
      }

      return createValidationResult(method, {
        valid: true,
        status: method.experimental ? 'warning' : 'success',
        normalizedPayload,
        secretFieldKeys: methodDefinition.secretFieldKeys,
      });
    } catch (error) {
      return createValidationResult(method, {
        valid: false,
        status: 'error',
        fieldErrors: buildFieldErrors(error),
      });
    }
  };

  return {
    getAuthMethods() {
      return context.provider.provider.authMethods.filter((method) => {
        if (!method.featureFlag) {
          return true;
        }

        return context.featureFlags[method.featureFlag] === true;
      });
    },

    async getUISchema(methodId: string): Promise<UISectionSchema[]> {
      return getMethodDefinition(methodId).sections;
    },

    async beginAuth(
      methodId: string,
      payload: Record<string, JSONValue>,
    ): Promise<AuthBeginResult> {
      const methodDefinition = getMethodDefinition(methodId);

      if (methodDefinition.method.kind !== 'oauth_pkce') {
        return createValidatedResult(methodId, await normalizePayload(methodId, payload));
      }

      const validation = await normalizePayload(methodId, payload);

      if (!validation.valid) {
        return createValidatedResult(methodId, validation);
      }

      if (!methodDefinition.method.oauth?.authorizationUrl) {
        throw new OAuthSessionError('OAuth authorization URL is missing.');
      }

      const callbackUrl = String(validation.normalizedPayload?.callbackUrl ?? '');
      const config = await context.store.getConfig();
      const codeVerifier = createCodeVerifier();
      const codeChallengeMethod = methodDefinition.method.oauth.codeChallengeMethod ?? 'S256';
      const codeChallenge =
        codeChallengeMethod === 'S256'
          ? createCodeChallenge(codeVerifier)
          : codeVerifier;
      const state = createRandomId(12);
      const createdAt = nowIso();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const session: StoredOAuthSession = {
        id: createRandomId(12),
        providerId: context.provider.provider.id,
        authMethodId: methodId,
        callbackUrl,
        state,
        codeVerifier,
        codeChallengeMethod,
        createdAt,
        expiresAt,
      };

      config.oauthSessions = config.oauthSessions.filter(
        (item) =>
          !(
            item.providerId === session.providerId &&
            item.authMethodId === session.authMethodId
          ),
      );
      config.oauthSessions.push(session);
      await context.store.saveConfig(config);

      const launchUrl = new URL(methodDefinition.method.oauth.authorizationUrl);
      launchUrl.searchParams.set('callback_url', callbackUrl);
      launchUrl.searchParams.set('code_challenge', codeChallenge);
      launchUrl.searchParams.set('code_challenge_method', codeChallengeMethod);
      launchUrl.searchParams.set('state', state);

      return createPendingOAuthResult(methodId, launchUrl.toString(), expiresAt);
    },

    async completeAuth(
      callbackParams: Record<string, string>,
    ): Promise<AuthCompleteResult> {
      const oauthMethod = Object.values(context.provider.methods).find(
        (method) => method.method.kind === 'oauth_pkce',
      );

      if (!oauthMethod) {
        throw new OAuthSessionError('No OAuth PKCE method registered for this provider.');
      }

      const config = await context.store.getConfig();
      const state = callbackParams.state;
      const session = config.oauthSessions.find((item) => {
        if (item.providerId !== context.provider.provider.id) {
          return false;
        }

        if (!state) {
          return true;
        }

        return item.state === state;
      });

      if (!session) {
        throw new OAuthSessionError('OAuth session not found or expired.');
      }

      if (new Date(session.expiresAt).getTime() < Date.now()) {
        throw new OAuthSessionError('OAuth session expired before completion.');
      }

      const code = callbackParams.code;

      if (!code) {
        throw new OAuthSessionError('Missing OAuth callback code.');
      }

      const tokenExchangeUrl = oauthMethod.method.oauth?.tokenExchangeUrl;

      if (!tokenExchangeUrl) {
        throw new OAuthSessionError('Missing OAuth token exchange URL.');
      }

      const response = await fetch(tokenExchangeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          code_verifier: session.codeVerifier,
          code_challenge_method: session.codeChallengeMethod,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new OAuthSessionError(
          `OAuth exchange failed with status ${response.status}: ${body}`,
        );
      }

      const payload = (await response.json()) as { key?: string; apiKey?: string };
      const apiKey = payload.key ?? payload.apiKey;

      if (!apiKey) {
        throw new OAuthSessionError('OAuth exchange succeeded but no API key was returned.');
      }

      config.oauthSessions = config.oauthSessions.filter((item) => item.id !== session.id);
      await context.store.saveConfig(config);

      return createValidatedResult(
        oauthMethod.method.id,
        createValidationResult(oauthMethod.method, {
          valid: true,
          status: 'success',
          normalizedPayload: { apiKey },
          secretFieldKeys: oauthMethod.secretFieldKeys,
        }),
      );
    },

    async refreshAuth(connection: ProviderConnection): Promise<AuthValidationResult> {
      if (!connection.credentialId) {
        return {
          valid: false,
          status: 'error',
          message: 'Connection has no credential record.',
          fieldErrors: { credentialId: 'Missing credential record.' },
          warnings: [],
          secretMasks: [],
        };
      }

      const credential = await context.store.getCredentialRecordUnsafe(connection.credentialId);

      if (!credential) {
        return {
          valid: false,
          status: 'error',
          message: 'Credential record could not be found.',
          fieldErrors: { credentialId: 'Credential record not found.' },
          warnings: [],
          secretMasks: [],
        };
      }

      return normalizePayload(connection.authMethodId, {
        ...credential.values,
        ...credential.secrets,
      });
    },

    async disconnect(): Promise<void> {
      return;
    },

    async validateCredentials(
      methodId: string,
      payload: Record<string, JSONValue>,
    ): Promise<AuthValidationResult> {
      return normalizePayload(methodId, payload);
    },
  };
}
