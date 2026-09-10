import type { User } from '@/app/types'

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

export function formatCompact(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  )
}

export function formatCurrency(value?: number): string {
  if (value === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: value >= 1_000_000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('')
}

export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name
}

const AVATAR_TONES: Record<NonNullable<User['avatarTone']>, string> = {
  navy: 'bg-forest-800 text-white',
  teal: 'bg-signal-700 text-white',
  plum: 'bg-[#6d4f70] text-white',
  sand: 'bg-[#87663a] text-white',
  slate: 'bg-[#4d5c58] text-white',
}

const TONE_KEYS = Object.keys(AVATAR_TONES) as Array<NonNullable<User['avatarTone']>>

/** Deterministic avatar tint so the same person keeps the same color. */
export function getAvatarTone(name: string, tone?: User['avatarTone']): string {
  if (tone) return AVATAR_TONES[tone]
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 997
  }
  const key = TONE_KEYS[hash % TONE_KEYS.length]
  return AVATAR_TONES[key]
}

/** Deterministic neutral tint for company avatars — kept intentionally muted. */
export function getCompanyTone(name: string): string {
  const tones = [
    'bg-forest-50 text-forest-700 border-forest-100',
    'bg-surface-sunken text-ink-secondary border-line',
    'bg-signal-50 text-signal-700 border-signal-100',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 17 + name.charCodeAt(i)) % 499
  }
  return tones[hash % tones.length]
}

export function companyInitials(name: string): string {
  const cleaned = name.replace(/\b(inc|llc|ltd|corp|corporation|group|global|technologies)\b/gi, '')
  return initialsOf(cleaned.trim() || name)
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return count === 1 ? singular : plural
}

export function formatEmployeeCount(value?: number): string {
  if (!value) return '—'
  return `${formatNumber(value)} employees`
}

/** Turns `apexsystems.com` into a display-friendly host. */
export function displayUrl(url?: string): string {
  if (!url) return '—'
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}
