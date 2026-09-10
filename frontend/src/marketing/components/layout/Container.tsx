import type { ElementType, ReactNode } from 'react';
import { cn } from '@/shared/cn';

type ContainerProps = {
  as?: ElementType;
  children: ReactNode;
  className?: string;
  /** `wide` unlocks the 1440px navbar/stage width; `default` is the 1360px reading grid. */
  width?: 'default' | 'wide' | 'narrow';
};

const widths = {
  narrow: 'max-w-[820px]',
  default: 'max-w-[1360px]',
  wide: 'max-w-[1440px]',
} as const;

export function Container({
  as: Tag = 'div',
  children,
  className,
  width = 'default',
}: ContainerProps) {
  return (
    <Tag className={cn('mx-auto w-full px-gutter', widths[width], className)}>{children}</Tag>
  );
}
