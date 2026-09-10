import type { User } from '@/app/types'
import { cn } from '@/shared/cn'
import { companyInitials, getAvatarTone, getCompanyTone, initialsOf } from '@/app/utils/format'

const SIZES = {
  xs: 'size-5 text-[10px]',
  sm: 'size-6 text-[11px]',
  md: 'size-8 text-xs',
  lg: 'size-10 text-sm',
  xl: 'size-14 text-lg',
} as const

export type AvatarSize = keyof typeof SIZES

interface UserAvatarProps {
  name: string
  tone?: User['avatarTone']
  size?: AvatarSize
  className?: string
}

export function UserAvatar({ name, tone, size = 'md', className }: UserAvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        SIZES[size],
        getAvatarTone(name, tone),
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  )
}

interface OwnerAvatarProps {
  name?: string | null
  tone?: User['avatarTone']
  size?: AvatarSize
  /** Shown when the opportunity has no owner. */
  emptyLabel?: string
  className?: string
}

/** Owner cell: avatar + name, or an explicit unassigned state. */
export function OwnerAvatar({
  name,
  tone,
  size = 'sm',
  emptyLabel = 'Unassigned',
  className,
}: OwnerAvatarProps) {
  if (!name) {
    return (
      <span className={cn('inline-flex items-center gap-2 text-[13px] text-ink-muted', className)}>
        <span
          aria-hidden
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong"
        />
        {emptyLabel}
      </span>
    )
  }

  return (
    <span className={cn('inline-flex items-center gap-2 whitespace-nowrap', className)}>
      <UserAvatar name={name} tone={tone} size={size} />
      <span className="truncate text-[13px] text-ink">{name}</span>
    </span>
  )
}

export function CompanyAvatar({
  name,
  size = 'md',
  className,
}: {
  name: string
  size?: AvatarSize
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md border font-semibold',
        SIZES[size],
        getCompanyTone(name),
        className,
      )}
    >
      {companyInitials(name)}
    </span>
  )
}
