import { useId, type SelectHTMLAttributes } from 'react';
import styles from './SelectField.module.css';

export interface SelectOption<T extends string | number> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string | number> extends Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'id' | 'value' | 'onChange'
> {
  label: string;
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Labelled native <select>. Option values keep their type (numbers stay numbers). */
export function SelectField<T extends string | number>({
  label,
  options,
  value,
  onChange,
  className,
  ...selectProps
}: SelectFieldProps<T>) {
  const id = useId();
  return (
    <div className={[styles.field, className].filter(Boolean).join(' ')}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <select
        {...selectProps}
        id={id}
        className={styles.select}
        value={options.findIndex((option) => option.value === value)}
        onChange={(event) => onChange(options[Number(event.target.value)].value)}
      >
        {options.map((option, index) => (
          <option key={String(option.value)} value={index}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
