import type { CredentialStore } from '../credentials/credential-store';
import type {
  AuthValidationResult,
  JSONValue,
  ProviderAuthMethod,
  ProviderConnection,
  UISectionSchema,
} from '../types';
import type { RegisteredProviderDefinition } from '../providers/definitions';
import type { AuthBeginResult, AuthCompleteResult } from './auth-results';

export interface AuthHandlerContext {
  provider: RegisteredProviderDefinition;
  store: CredentialStore;
  featureFlags: Record<string, boolean>;
}

export interface ProviderAuthHandler {
  getAuthMethods(): ProviderAuthMethod[];
  getUISchema(methodId: string): Promise<UISectionSchema[]>;
  beginAuth(
    methodId: string,
    payload: Record<string, JSONValue>,
  ): Promise<AuthBeginResult>;
  completeAuth(callbackParams: Record<string, string>): Promise<AuthCompleteResult>;
  refreshAuth(connection: ProviderConnection): Promise<AuthValidationResult>;
  disconnect(connection: ProviderConnection): Promise<void>;
  validateCredentials(
    methodId: string,
    payload: Record<string, JSONValue>,
  ): Promise<AuthValidationResult>;
}
