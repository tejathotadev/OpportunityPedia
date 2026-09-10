import type { ReactNode } from 'react';
import { cn } from '@/shared/cn';

type EditorialHeadingProps = {
  as?: 'h1' | 'h2' | 'h3';
  size?: 'hero' | 'display' | 'title';
  children: ReactNode;
  className?: string;
  id?: string;
};

const sizes = {
  hero: 'text-hero font-semibold',
  display: 'text-display font-semibold',
  title: 'text-title font-semibold',
} as const;

export function EditorialHeading({
  as: Tag = 'h2',
  size = 'display',
  children,
  className,
  id,
}: EditorialHeadingProps) {
  return (
    <Tag id={id} className={cn(sizes[size], className)}>
      {children}
    </Tag>
  );
}

/**
 * Serif emphasis for occasional large statements. Used sparingly — never for
 * body copy, and at most once per section.
 */
export function SerifAccent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <em className={cn('font-serif font-normal not-italic tracking-[-0.01em]', className)}>
      {children}
    </em>
  );
}
