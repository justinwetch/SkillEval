import type { UIActionSchema } from '@llm-hub/core';

export interface ActionBarProps {
  actions: UIActionSchema[];
  disabled?: boolean;
  pendingActionId?: string | null;
  placement?: 'inline' | 'footer' | 'sticky_footer';
  className?: string;
  onAction: (action: UIActionSchema) => void;
}

export function ActionBar({
  actions,
  disabled,
  pendingActionId,
  placement = 'footer',
  className,
  onAction,
}: ActionBarProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className={`llm-hub-ui-action-bar llm-hub-ui-action-bar--${placement} ${className ?? ''}`.trim()}>
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className={`llm-hub-ui-action-button llm-hub-ui-action-button--${action.variant}`}
          disabled={disabled}
          onClick={() => onAction(action)}
        >
          {pendingActionId === action.id ? 'Working...' : action.label}
        </button>
      ))}
    </div>
  );
}
