import type { ReactNode } from 'react';

export interface WarningCalloutProps {
  title: string;
  children: ReactNode;
  tone?: 'warning' | 'danger' | 'info' | 'success';
  className?: string;
}

export function WarningCallout({
  title,
  children,
  tone = 'warning',
  className,
}: WarningCalloutProps) {
  return (
    <div className={`llm-hub-ui-warning llm-hub-ui-warning--${tone} ${className ?? ''}`.trim()}>
      <p className="llm-hub-ui-warning__title">{title}</p>
      <div className="llm-hub-ui-warning__content">{children}</div>
    </div>
  );
}
