import type { UIFieldSchema } from '@llm-hub/core';

export interface DynamicFieldRendererProps {
  field: UIFieldSchema;
  value: unknown;
  error?: string;
  dense?: boolean;
  className?: string;
  onChange: (fieldKey: string, value: unknown) => void;
}

export function DynamicFieldRenderer({
  field,
  value,
  error,
  dense,
  className,
  onChange,
}: DynamicFieldRendererProps) {
  if (field.type === 'hidden') {
    return null;
  }

  const commonProps = {
    id: field.key,
    name: field.key,
    placeholder: field.placeholder,
    required: field.required,
    'aria-invalid': Boolean(error),
  };

  return (
    <label
      className={`llm-hub-ui-field ${
        dense ? 'llm-hub-ui-field--dense' : ''
      } ${className ?? ''}`.trim()}
      htmlFor={field.key}
    >
      <span className="llm-hub-ui-field__header">
        <span>{field.label}</span>
        {field.required ? (
          <span className="llm-hub-ui-field__required">required</span>
        ) : (
          <span className="llm-hub-ui-field__optional">optional</span>
        )}
      </span>
      {field.description ? (
        <span className="llm-hub-ui-field__description">{field.description}</span>
      ) : null}

      {field.type === 'textarea' ? (
        <textarea
          {...commonProps}
          className="llm-hub-ui-field__control"
          rows={dense ? 3 : 4}
          value={String(value ?? '')}
          onChange={(event) => onChange(field.key, event.target.value)}
        />
      ) : field.type === 'checkbox' ? (
        <span className="llm-hub-ui-checkbox-field">
          <input
            {...commonProps}
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => onChange(field.key, event.target.checked)}
          />
          <span>{field.helperText ?? 'Toggle this option'}</span>
        </span>
      ) : field.type === 'select' ? (
        <select
          {...commonProps}
          className="llm-hub-ui-field__control"
          value={String(value ?? '')}
          onChange={(event) => onChange(field.key, event.target.value)}
        >
          <option value="">Select an option</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : field.type === 'radio' ? (
        <div className="llm-hub-ui-radio-group">
          {(field.options ?? []).map((option) => (
            <label key={option.value} className="llm-hub-ui-radio-option">
              <input
                type="radio"
                name={field.key}
                checked={String(value ?? '') === option.value}
                onChange={() => onChange(field.key, option.value)}
              />
              <span>
                <strong>{option.label}</strong>
                {option.description ? <small>{option.description}</small> : null}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <input
          {...commonProps}
          className="llm-hub-ui-field__control"
          type={field.type === 'password' ? 'password' : 'text'}
          value={String(value ?? '')}
          onChange={(event) => onChange(field.key, event.target.value)}
        />
      )}

      {field.helperText ? (
        <span className="llm-hub-ui-field__helper">{field.helperText}</span>
      ) : null}
      {field.warning ? <span className="llm-hub-ui-field__warning">{field.warning}</span> : null}
      {error ? <span className="llm-hub-ui-field__error">{error}</span> : null}
    </label>
  );
}
