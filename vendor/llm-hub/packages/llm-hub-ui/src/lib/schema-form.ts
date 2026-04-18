import type { ProviderSchemaContract } from '../types';

export function createInitialFormState(schema: ProviderSchemaContract): Record<string, unknown> {
  return schema.fieldGroups.reduce<Record<string, unknown>>((accumulator, group) => {
    for (const field of group.fields) {
      if (field.defaultValue !== undefined) {
        accumulator[field.key] = field.defaultValue;
      } else if (field.type === 'checkbox') {
        accumulator[field.key] = false;
      } else if (field.type === 'hidden') {
        accumulator[field.key] = '';
      }
    }

    return accumulator;
  }, {});
}

export function sanitizeFormPayload(values: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(values).reduce<Record<string, unknown>>((accumulator, [key, value]) => {
    if (value === undefined) {
      return accumulator;
    }

    accumulator[key] = value;
    return accumulator;
  }, {});
}
