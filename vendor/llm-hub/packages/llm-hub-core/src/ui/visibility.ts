import type {
  ConnectionStatus,
  JSONValue,
  UIVisibilityRule,
} from '../types';

export interface VisibilityContext {
  selectedAuthMethodId?: string;
  fields?: Record<string, JSONValue>;
  featureFlags?: Record<string, boolean>;
  connectionStatus?: ConnectionStatus;
}

function resolveRuleValue(
  rule: UIVisibilityRule,
  context: VisibilityContext,
): JSONValue | undefined {
  switch (rule.source) {
    case 'selected_auth_method':
      return context.selectedAuthMethodId;
    case 'field':
      return context.fields?.[rule.key];
    case 'feature_flag':
      return context.featureFlags?.[rule.key];
    case 'connection_status':
      return context.connectionStatus;
    default:
      return undefined;
  }
}

export function evaluateVisibilityRule(
  rule: UIVisibilityRule,
  context: VisibilityContext,
): boolean {
  const resolved = resolveRuleValue(rule, context);

  switch (rule.operator) {
    case 'equals':
      return resolved === rule.value;
    case 'not_equals':
      return resolved !== rule.value;
    case 'in':
      return Array.isArray(rule.value) ? rule.value.includes(String(resolved)) : false;
    case 'not_in':
      return Array.isArray(rule.value) ? !rule.value.includes(String(resolved)) : true;
    case 'truthy':
      return Boolean(resolved);
    case 'falsy':
      return !resolved;
    default:
      return true;
  }
}

export function isVisible(
  rules: UIVisibilityRule[] | undefined,
  context: VisibilityContext,
): boolean {
  if (!rules || rules.length === 0) {
    return true;
  }

  return rules.every((rule) => evaluateVisibilityRule(rule, context));
}
