import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from 'react'

import { Tooltip } from '@/app/components/common/Tooltip'
import { cn } from '@/shared/cn'

interface TruncatedTextProps extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> {
  /** Full string shown in the tooltip when the visible text overflows. */
  text: string
  className?: string
  /** Element tag for the truncated text node. */
  as?: 'span' | 'p'
  /** Optional secondary line under the truncated title. */
  subtitle?: ReactNode
  /** Optional trailing control (e.g. Shared badge) beside the title. */
  trailing?: ReactNode
}

/**
 * Single-line truncated text. Hover title appears only when CSS ellipsis is active
 * (`scrollWidth > clientWidth`).
 */
export function TruncatedText({
  text,
  className,
  as: Tag = 'span',
  subtitle,
  trailing,
  ...rest
}: TruncatedTextProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [truncated, setTruncated] = useState(false)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    // 1px slack avoids false positives from subpixel rounding.
    setTruncated(el.scrollWidth - el.clientWidth > 1)
  }, [])

  useLayoutEffect(() => {
    measure()
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [measure, text])

  const textNode = (
    <Tag
      ref={ref as never}
      className={cn('block min-w-0 truncate', className)}
      {...rest}
    >
      {text}
    </Tag>
  )

  let body: ReactNode = textNode
  if (trailing != null) {
    body = (
      <span className="flex min-w-0 items-center gap-1.5">
        {textNode}
        {trailing}
      </span>
    )
  } else if (subtitle != null) {
    body = (
      <span className="block min-w-0">
        {textNode}
        {subtitle}
      </span>
    )
  }

  return (
    <Tooltip content={text} enabled={truncated}>
      {body}
    </Tooltip>
  )
}
