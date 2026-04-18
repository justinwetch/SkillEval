import type { ZodType } from 'zod';

import type {
  JSONValue,
  ProviderAuthMethod,
  ProviderDefinition,
  UISectionSchema,
} from '../types';

export interface ProviderMethodDefinition {
  method: ProviderAuthMethod;
  inputSchema: ZodType<Record<string, JSONValue>>;
  sections: UISectionSchema[];
  secretFieldKeys: string[];
}

export interface RegisteredProviderDefinition {
  provider: ProviderDefinition;
  methods: Record<string, ProviderMethodDefinition>;
}

export function createProviderIndex(
  providers: RegisteredProviderDefinition[],
): Map<string, RegisteredProviderDefinition> {
  return new Map(providers.map((provider) => [provider.provider.id, provider]));
}

export function getEnabledAuthMethods(
  provider: RegisteredProviderDefinition,
  featureFlags: Record<string, boolean>,
): ProviderAuthMethod[] {
  return provider.provider.authMethods.filter((method) => {
    if (!method.featureFlag) {
      return true;
    }

    return featureFlags[method.featureFlag] === true;
  });
}
