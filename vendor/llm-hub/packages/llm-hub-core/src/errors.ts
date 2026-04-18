export class LlmHubError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmHubError';
  }
}

export class ProviderNotFoundError extends LlmHubError {
  constructor(providerId: string) {
    super(`Unknown provider: ${providerId}`);
    this.name = 'ProviderNotFoundError';
  }
}

export class AuthMethodNotFoundError extends LlmHubError {
  constructor(providerId: string, authMethodId: string) {
    super(`Unknown auth method \"${authMethodId}\" for provider \"${providerId}\".`);
    this.name = 'AuthMethodNotFoundError';
  }
}

export class ProviderNotConnectedError extends LlmHubError {
  constructor(providerId: string) {
    super(`Provider \"${providerId}\" is not connected.`);
    this.name = 'ProviderNotConnectedError';
  }
}

export class OAuthSessionError extends LlmHubError {
  constructor(message: string) {
    super(message);
    this.name = 'OAuthSessionError';
  }
}

export class SecretAccessError extends LlmHubError {
  constructor(message: string) {
    super(message);
    this.name = 'SecretAccessError';
  }
}
