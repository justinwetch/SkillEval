import { LLMHubUIRequestError } from './adapter';

export function getErrorMessage(error: unknown): string {
  if (error instanceof LLMHubUIRequestError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong.';
}

export function getValidationErrors(error: unknown): Record<string, string> {
  if (!(error instanceof LLMHubUIRequestError) || !error.details) {
    return {};
  }

  const validation = error.details.validation as
    | { fieldErrors?: Record<string, string> }
    | undefined;
  const fieldErrors = validation?.fieldErrors;

  if (fieldErrors && typeof fieldErrors === 'object') {
    return fieldErrors;
  }

  return {};
}
