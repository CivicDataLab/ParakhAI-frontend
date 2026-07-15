import React from 'react';
import { vi } from 'vitest';

export const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  dismiss: vi.fn(),
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
  onBlur?: () => void;
  error?: string;
  readOnly?: boolean;
  multiline?: number;
  labelHidden?: boolean;
};

function TextFieldMock({
  name,
  label,
  value = '',
  onChange,
  onBlur,
  error,
  readOnly,
  multiline,
  labelHidden,
}: TextFieldProps) {
  const common = {
    id: name,
    name,
    'aria-label': label || name,
    value,
    readOnly,
    onBlur,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange?.(e.target.value),
  };

  return (
    <div>
      {label && !labelHidden && <label htmlFor={name}>{label}</label>}
      {multiline ? <textarea {...common} /> : <input type="text" {...common} />}
      {error && <span role="alert">{error}</span>}
    </div>
  );
}

function ButtonMock({
  children,
  onClick,
  disabled,
  type = 'button',
  // Strip opub-only props so they never hit the DOM
  kind: _kind,
  size: _size,
  fullWidth: _fullWidth,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  kind?: string;
  size?: string;
  fullWidth?: boolean;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} {...rest}>
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
  onOpenChange,
}: {
  open?: boolean;
  children?: React.ReactNode;
  onOpenChange?: (open: boolean) => void;
}) {
  if (!open) return null;
  return (
    <>
      {children}
      {onOpenChange && (
        <button type="button" data-testid="dialog-open-change" onClick={() => onOpenChange(true)}>
          Dialog open change
        </button>
      )}
    </>
  );
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

function LabelMock({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}

function TextMock({
  children,
  className,
  as: Component = 'span',
}: {
  children?: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}) {
  return <Component className={className}>{children}</Component>;
}

function TagMock({ children }: { children?: React.ReactNode }) {
  return <span data-testid="tag">{children}</span>;
}

function TooltipMock({
  children,
  content,
}: {
  children?: React.ReactNode;
  content?: React.ReactNode;
}) {
  return (
    <span data-testid="tooltip" title={typeof content === 'string' ? content : undefined}>
      {children}
    </span>
  );
}

function SpinnerMock() {
  return <div role="status">Loading</div>;
}

function IconMock({
  source: Source,
}: {
  source?: React.ComponentType | string;
  size?: number | string;
  color?: string;
  className?: string;
}) {
  // Icons are often stubbed as strings (e.g. 'cross') in tests — never render those as tags
  if (typeof Source === 'function') {
    return <Source data-testid="icon" />;
  }
  return <span data-testid="icon" data-icon={typeof Source === 'string' ? Source : undefined} />;
}

function IconButtonMock({
  children,
  icon,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: string;
  size?: string;
}) {
  return (
    <button type="button" {...rest}>
      {icon ? <img src={icon} alt="" /> : null}
      {children}
    </button>
  );
}

function AvatarMock({ name }: { name?: string; showInitials?: boolean; size?: string }) {
  return <span data-testid="avatar">{name}</span>;
}

function PopoverContentMock({ children }: { children?: React.ReactNode }) {
  return <div data-testid="popover-content">{children}</div>;
}

function PopoverTriggerMock({
  children,
  onOpenChange,
  isOpen,
}: {
  children?: React.ReactNode;
  asChild?: boolean;
  onOpenChange?: (open: boolean) => void;
  isOpen?: boolean;
}) {
  const child = React.Children.only(children);

  if (!React.isValidElement(child)) {
    return <>{children}</>;
  }

  return React.cloneElement(child as React.ReactElement<{ onClick?: () => void }>, {
    onClick: () => {
      child.props.onClick?.();
      onOpenChange?.(!isOpen);
    },
  });
}

function PopoverMock({
  children,
  open,
  onOpenChange,
}: {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  modal?: boolean;
}) {
  return (
    <div data-testid="popover" data-open={open}>
      {React.Children.map(children, (child) => {
        if (!React.isValidElement(child) || child.type !== PopoverTriggerMock) {
          return child;
        }

        return React.cloneElement(child, {
          onOpenChange,
          isOpen: open,
        });
      })}
    </div>
  );
}

PopoverMock.Trigger = PopoverTriggerMock;
PopoverMock.Content = PopoverContentMock;

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
  Label: LabelMock,
  Text: TextMock,
  Tag: TagMock,
  Tooltip: TooltipMock,
  Spinner: SpinnerMock,
  Icon: IconMock,
  IconButton: IconButtonMock,
  Avatar: AvatarMock,
  Popover: PopoverMock,
  Divider: DividerMock,
};

export function getOpubUiMockModule() {
  return opubUiMock;
}
