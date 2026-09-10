import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

import { cn } from '@/shared/cn'

const CONTROL_BASE =
  'w-full rounded-md border border-line-strong bg-surface text-sm text-ink placeholder:text-ink-subtle ' +
  'transition-colors duration-150 focus:border-signal-500 focus:outline-none focus:ring-2 focus:ring-signal-600/20 ' +
  'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-ink-muted'

/**
 * `<select>` always matches `:read-only`, so this lives on the text controls
 * only rather than in the shared base.
 */
const READ_ONLY_CONTROL =
  'read-only:bg-surface-sunken read-only:text-ink-secondary ' +
  'read-only:focus:border-line-strong read-only:focus:ring-0'

interface FieldProps {
  label: string
  htmlFor?: string
  hint?: ReactNode
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
  /** Hides the visual label while keeping it available to screen readers. */
  labelHidden?: boolean
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
  labelHidden,
}: FieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label
        htmlFor={htmlFor}
        className={cn(
          'block text-[13px] font-medium text-ink-secondary',
          labelHidden && 'sr-only',
        )}
      >
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p className="text-[12.5px] text-danger">{error}</p>
      ) : hint ? (
        <p className="text-[12.5px] text-ink-muted">{hint}</p>
      ) : null}
    </div>
  )
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
  iconLeft?: ReactNode
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { className, invalid, iconLeft, ...props },
  ref,
) {
  const input = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        CONTROL_BASE,
        READ_ONLY_CONTROL,
        'h-9 px-2.5',
        iconLeft && 'pl-8',
        invalid && 'border-danger focus:border-danger focus:ring-danger/20',
        className,
      )}
      {...props}
    />
  )

  if (!iconLeft) return input

  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-subtle [&_svg]:size-4">
        {iconLeft}
      </span>
      {input}
    </div>
  )
})

export const TextArea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function TextArea({ className, invalid, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        CONTROL_BASE,
        READ_ONLY_CONTROL,
        'min-h-24 resize-y px-2.5 py-2 leading-relaxed',
        invalid && 'border-danger focus:border-danger focus:ring-danger/20',
        className,
      )}
      {...props}
    />
  )
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(CONTROL_BASE, 'h-9 cursor-pointer appearance-none px-2.5 pr-8', className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b788e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
        }}
        {...props}
      >
        {children}
      </select>
    )
  },
)

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode
  description?: string
}

export function Checkbox({ label, description, className, id, ...props }: CheckboxProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <input
        id={inputId}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 cursor-pointer rounded-[4px] border-line-strong text-signal-600 accent-signal-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-600"
        {...props}
      />
      <label htmlFor={inputId} className="cursor-pointer select-none">
        <span className="block text-[13px] text-ink">{label}</span>
        {description && <span className="block text-[12.5px] text-ink-muted">{description}</span>}
      </label>
    </div>
  )
}
