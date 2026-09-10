import { Loader2 } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

import { cn } from '@/shared/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link'
export type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-signal-600 text-white border border-signal-600 hover:bg-signal-700 hover:border-signal-700 active:bg-signal-800 disabled:bg-signal-600/50 disabled:border-transparent',
  secondary:
    'bg-surface text-ink border border-line-strong hover:bg-surface-sunken active:bg-surface-sunken/80 disabled:text-ink-subtle',
  ghost:
    'bg-transparent text-ink-secondary border border-transparent hover:bg-surface-sunken hover:text-ink active:bg-surface-sunken/80',
  danger:
    'bg-danger text-white border border-danger hover:bg-danger-strong active:bg-danger-strong disabled:bg-danger/50',
  link: 'bg-transparent text-signal-700 border border-transparent hover:text-signal-800 hover:underline underline-offset-2 px-0',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-[13px] gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-10 px-4 text-sm gap-2',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  iconLeft?: ReactNode
  iconRight?: ReactNode
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    iconLeft,
    iconRight,
    fullWidth,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex select-none items-center justify-center rounded-md font-medium whitespace-nowrap',
        'transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-600',
        'disabled:cursor-not-allowed disabled:opacity-70',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        iconLeft && <span className="shrink-0 [&_svg]:size-4">{iconLeft}</span>
      )}
      {children}
      {iconRight && !loading && <span className="shrink-0 [&_svg]:size-4">{iconRight}</span>}
    </button>
  )
})

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only controls must expose an accessible name. */
  label: string
  variant?: Extract<ButtonVariant, 'secondary' | 'ghost' | 'danger'>
  size?: 'sm' | 'md'
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'ghost', size = 'md', className, children, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center rounded-md transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-600',
        'disabled:cursor-not-allowed disabled:opacity-60',
        size === 'sm' ? 'size-7 [&_svg]:size-4' : 'size-9 [&_svg]:size-[18px]',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
})
