import React from 'react';
import { vi } from 'vitest';

export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
};

type SelectProps = {
  name: string;
  label?: string;
  options?: Array<{ value: string; label: string }>;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
};

function SelectMock({
  name,
  label,
  options = [],
  value = '',
  onChange,
  error,
  disabled,
}: SelectProps) {
  return (
    <div>
      {label && <label htmlFor={name}>{label}</label>}
      <select
        id={name}
        name={name}
        aria-label={label || name}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
      >
        <option value="">Select</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span role="alert">{error}</span>}
    </div>
  );
}

type ComboboxProps = {
  name: string;
  label?: string;
  list?: Array<{ value: string; label: string }>;
  selectedValue?: string;
  onChange?: (value: string | Array<{ value: string; label: string }>) => void;
};

function ComboboxMock({ name, label, list = [], selectedValue = '', onChange }: ComboboxProps) {
  const currentValue =
    list.find((item) => item.label === selectedValue || item.value === selectedValue)?.value ??
    selectedValue;

  return (
    <div>
      {label && <label htmlFor={name}>{label}</label>}
      <select
        id={name}
        name={name}
        aria-label={label || name}
        value={currentValue}
        onChange={(e) => onChange?.(e.target.value)}
      >
        <option value="">Select</option>
        {list.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

type TextFieldProps = {
  name: string;
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  readOnly?: boolean;
  multiline?: number;
};

function TextFieldMock({
  name,
  label,
  value = '',
  onChange,
  error,
  readOnly,
  multiline,
}: TextFieldProps) {
  const common = {
    id: name,
    name,
    'aria-label': label || name,
    value,
    readOnly,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange?.(e.target.value),
  };

  return (
    <div>
      {label && <label htmlFor={name}>{label}</label>}
      {multiline ? <textarea {...common} /> : <input type="text" {...common} />}
      {error && <span role="alert">{error}</span>}
    </div>
  );
}

function ButtonMock({
  children,
  onClick,
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} {...rest}>
      {children}
    </button>
  );
}

function DialogContentMock({
  title,
  children,
  footer,
}: {
  title?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div role="dialog" aria-label={title}>
      {title && <h2>{title}</h2>}
      {children}
      {footer}
    </div>
  );
}

function DialogMock({
  open,
  children,
}: {
  open?: boolean;
  children?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}) {
  if (!open) return null;
  return <>{children}</>;
}

DialogMock.Content = DialogContentMock;

function SheetContentMock({ children }: { children?: React.ReactNode }) {
  return <div role="dialog">{children}</div>;
}

function SheetMock({
  open,
  children,
}: {
  open?: boolean;
  children?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}) {
  if (!open) return null;
  return <>{children}</>;
}

SheetMock.Content = SheetContentMock;

function TextMock({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <span className={className}>{children}</span>;
}

function TagMock({ children }: { children?: React.ReactNode }) {
  return <span data-testid="tag">{children}</span>;
}

function SpinnerMock() {
  return <div role="status">Loading</div>;
}

function IconMock() {
  return <span data-testid="icon" />;
}

function DividerMock() {
  return <hr />;
}

export const opubUiMock = {
  toast: mockToast,
  Button: ButtonMock,
  Dialog: DialogMock,
  Select: SelectMock,
  Combobox: ComboboxMock,
  TextField: TextFieldMock,
  Sheet: SheetMock,
  Text: TextMock,
  Tag: TagMock,
  Spinner: SpinnerMock,
  Icon: IconMock,
  Divider: DividerMock,
};

export function getOpubUiMockModule() {
  return opubUiMock;
}
