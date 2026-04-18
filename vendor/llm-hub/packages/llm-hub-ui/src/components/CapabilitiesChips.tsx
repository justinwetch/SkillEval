import type { ReactNode } from 'react';

export interface CapabilitiesChipsProps {
  items: string[];
  tone?: 'neutral' | 'warning' | 'success';
  className?: string;
  renderIcon?: (item: string) => ReactNode;
}

export function CapabilitiesChips({
  items,
  tone = 'neutral',
  className,
  renderIcon,
}: CapabilitiesChipsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className={`llm-hub-ui-chip-list ${className ?? ''}`.trim()}>
      {items.map((item) => (
        <span key={item} className={`llm-hub-ui-chip llm-hub-ui-chip--${tone}`}>
          {renderIcon?.(item)}
          <span>{item}</span>
        </span>
      ))}
    </div>
  );
}
