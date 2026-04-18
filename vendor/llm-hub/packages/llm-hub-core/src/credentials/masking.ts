import type {
  CredentialRecord,
  SanitizedCredentialRecord,
  SecretMask,
} from '../types';

export function maskSecret(value: string, fieldKey = 'secret'): SecretMask {
  const normalized = value.trim();

  if (normalized.length === 0) {
    return { fieldKey, maskedValue: '', isSecret: true };
  }

  const visiblePrefix = normalized.slice(0, Math.min(2, normalized.length));
  const visibleSuffix = normalized.slice(-Math.min(4, normalized.length));
  const maskedCoreLength = Math.max(normalized.length - visiblePrefix.length - visibleSuffix.length, 4);
  const maskedCore = '*'.repeat(maskedCoreLength);

  return {
    fieldKey,
    maskedValue: `${visiblePrefix}${maskedCore}${visibleSuffix}`,
    isSecret: true,
    lastFour: normalized.length >= 4 ? normalized.slice(-4) : undefined,
  };
}

export function sanitizeCredentialRecord(
  record: CredentialRecord,
): SanitizedCredentialRecord {
  const secretMasks = Object.entries(record.secrets).map(([key, value]) =>
    maskSecret(value, key),
  );

  const maskedSecrets = secretMasks.reduce<Record<string, string>>(
    (accumulator, item) => {
      accumulator[item.fieldKey] = item.maskedValue;
      return accumulator;
    },
    {},
  );

  return {
    ...record,
    secrets: maskedSecrets,
    secretMasks,
  };
}
