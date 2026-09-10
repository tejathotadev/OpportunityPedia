import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/shared/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'inverse-outline';
export type ButtonSize = 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-control font-medium transition-[background-color,border-color,color,box-shadow] duration-200 disabled:pointer-events-none disabled:opacity-55';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-forest text-paper hover:bg-forest-deep',
  secondary: 'border border-ink/20 bg-transparent text-ink hover:border-ink/45 hover:bg-ink/[0.03]',
  tertiary:
    'group/tertiary h-auto rounded-none px-0 text-ink underline-offset-4 hover:text-signal-deep',
  inverse: 'bg-paper text-forest hover:bg-white',
  'inverse-outline':
    'border border-white/40 bg-transparent text-white hover:border-white/70 hover:bg-white/[0.08]',
};

/** 44px / 52px — both meet the minimum touch target. */
const sizes: Record<ButtonSize, string> = {
  md: 'h-11 px-5 text-[0.9375rem]',
  lg: 'h-[3.25rem] px-7 text-base',
};

type SharedProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
  className?: string;
  /** Trailing arrow. `diagonal` signals an off-site destination. */
  arrow?: false | 'right' | 'diagonal';
};

function content({ children, arrow }: Pick<SharedProps, 'children' | 'arrow'>) {
  return (
    <>
      <span>{children}</span>
      {arrow === 'right' ? (
        <ArrowRight
          aria-hidden="true"
          className="size-4 shrink-0 transition-transform duration-200 group-hover/tertiary:translate-x-1"
        />
      ) : null}
      {arrow === 'diagonal' ? <ArrowUpRight aria-hidden="true" className="size-4 shrink-0" /> : null}
    </>
  );
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className,
  arrow = false,
  ...rest
}: SharedProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(base, variants[variant], variant !== 'tertiary' && sizes[size], className)}
      {...rest}
    >
      {content({ children, arrow })}
    </button>
  );
}

type LinkButtonProps = SharedProps & {
  to: string;
  onClick?: () => void;
  'aria-label'?: string;
};

/** Router-aware button. Absolute `to` values render as external anchors. */
export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  children,
  className,
  arrow = false,
  onClick,
  'aria-label': ariaLabel,
}: LinkButtonProps) {
  const classes = cn(
    base,
    variants[variant],
    variant !== 'tertiary' && sizes[size],
    variant === 'tertiary' && 'group/tertiary',
    className,
  );
  const isExternal = /^(https?:)?\/\//.test(to) || to.startsWith('mailto:');

  if (isExternal) {
    return (
      <a
        href={to}
        className={classes}
        onClick={onClick}
        aria-label={ariaLabel}
        target="_blank"
        rel="noreferrer noopener"
      >
        {content({ children, arrow })}
      </a>
    );
  }

  return (
    <Link to={to} className={classes} onClick={onClick} aria-label={ariaLabel}>
      {content({ children, arrow })}
    </Link>
  );
}
