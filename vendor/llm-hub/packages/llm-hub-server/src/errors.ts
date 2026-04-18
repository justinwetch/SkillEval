import { ZodError } from 'zod';

export class LlmHubServerError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'LlmHubServerError';
  }
}

export function validationServerError(error: ZodError): LlmHubServerError {
  const fieldErrors = error.issues.reduce<Record<string, string>>((accumulator, issue) => {
    const key = String(issue.path[0] ?? '_root');
    accumulator[key] = issue.message;
    return accumulator;
  }, {});

  return new LlmHubServerError(400, 'VALIDATION_ERROR', 'Request validation failed.', {
    fieldErrors,
  });
}

export function normalizeServerError(error: unknown): LlmHubServerError {
  if (error instanceof LlmHubServerError) {
    return error;
  }

  if (error instanceof ZodError) {
    return validationServerError(error);
  }

  if (error instanceof Error) {
    if (error.name === 'ProviderNotFoundError') {
      return new LlmHubServerError(404, 'PROVIDER_NOT_FOUND', error.message);
    }

    if (error.name === 'AuthMethodNotFoundError') {
      return new LlmHubServerError(404, 'AUTH_METHOD_NOT_FOUND', error.message);
    }

    if (error.name === 'ProviderNotConnectedError') {
      return new LlmHubServerError(400, 'PROVIDER_NOT_CONNECTED', error.message);
    }

    if (error.name === 'OAuthSessionError') {
      return new LlmHubServerError(400, 'OAUTH_ERROR', error.message);
    }

    if (error.name === 'SecretAccessError') {
      return new LlmHubServerError(500, 'SECRET_ACCESS_ERROR', error.message);
    }

    return new LlmHubServerError(500, 'INTERNAL_ERROR', error.message);
  }

  return new LlmHubServerError(500, 'INTERNAL_ERROR', 'Unexpected server error.');
}
