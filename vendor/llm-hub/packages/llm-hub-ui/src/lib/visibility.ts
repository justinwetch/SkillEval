import type { UIVisibilityRule } from '@llm-hub/core';

export interface VisibilityContext {
  selectedAuthMethodId?: string;
  fields?: Record<string, unknown>;
  connectionStatus?: string;
}

function resolveValue(rule: UIVisibilityRule, context: VisibilityContext): unknown {
  switch (rule.source) {
    case 'selected_auth_method':
      return context.selectedAuthMethodId;
    case 'field':
      return context.fields?.[rule.key];
    case 'connection_status':
      return context.connectionStatus;
    case 'feature_flag':
      return undefined;
    default:
      return undefined;
  }
}

export function isVisible(
  rules: UIVisibilityRule[] | undefined,
  context: VisibilityContext,
): boolean {
  if (!rules?.length) {
    return true;
  }

  return rules.every((rule) => {
    const current = resolveValue(rule, context);

    switch (rule.operator) {
      case 'equals':
        return current === rule.value;
      case 'not_equals':
        return current !== rule.value;
      case 'in':
        return Array.isArray(rule.value) ? rule.value.includes(String(current)) : false;
      case 'not_in':
        return Array.isArray(rule.value) ? !rule.value.includes(String(current)) : true;
      case 'truthy':
        return Boolean(current);
      case 'falsy':
        return !current;
      default:
        return true;
    }
  });
}
