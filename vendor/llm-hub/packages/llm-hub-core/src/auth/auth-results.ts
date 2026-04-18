import type { AuthValidationResult, JSONValue } from '../types';

export interface AuthValidatedResult {
  kind: 'validated';
  authMethodId: string;
  validation: AuthValidationResult;
  normalizedPayload: Record<string, JSONValue>;
}

export interface AuthPendingOAuthResult {
  kind: 'oauth_pending';
  authMethodId: string;
  launchUrl: string;
  expiresAt: string;
}

export type AuthBeginResult = AuthValidatedResult | AuthPendingOAuthResult;
export type AuthCompleteResult = AuthValidatedResult;

export function createValidatedResult(
  authMethodId: string,
  validation: AuthValidationResult,
): AuthValidatedResult {
  return {
    kind: 'validated',
    authMethodId,
    validation,
    normalizedPayload: validation.normalizedPayload ?? {},
  };
}

export function createPendingOAuthResult(
  authMethodId: string,
  launchUrl: string,
  expiresAt: string,
): AuthPendingOAuthResult {
  return {
    kind: 'oauth_pending',
    authMethodId,
    launchUrl,
    expiresAt,
  };
}
