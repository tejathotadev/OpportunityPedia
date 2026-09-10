import type { IsoDateTime } from '@/app/types'

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function toDate(value: IsoDateTime | Date | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** `Sep 6, 2026` */
export function formatDate(value?: IsoDateTime | Date | null): string {
  const date = toDate(value)
  if (!date) return '—'
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

/** `Sep 6` — for dense columns where the year is implied. */
export function formatDayMonth(value?: IsoDateTime | Date | null): string {
  const date = toDate(value)
  if (!date) return '—'
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`
}

/** `4:48 AM` */
export function formatTime(value?: IsoDateTime | Date | null): string {
  const date = toDate(value)
  if (!date) return '—'
  const hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 === 0 ? 12 : hours % 12
  return `${hour12}:${minutes} ${suffix}`
}

/** `Sep 6 · 4:48 AM` */
export function formatDateTimeShort(value?: IsoDateTime | Date | null): string {
  const date = toDate(value)
  if (!date) return '—'
  return `${formatDayMonth(date)} · ${formatTime(date)}`
}

/** `Sep 6, 2026 · 4:48 AM` — used in tooltips where precision matters. */
export function formatDateTimeFull(value?: IsoDateTime | Date | null): string {
  const date = toDate(value)
  if (!date) return '—'
  return `${formatDate(date)} · ${formatTime(date)}`
}

/** `12 min ago`, `2 hours ago`, `Sep 2` once older than a week. */
export function formatRelative(value?: IsoDateTime | Date | null, now: Date = new Date()): string {
  const date = toDate(value)
  if (!date) return '—'

  const diff = now.getTime() - date.getTime()
  if (diff < 0) return formatDayMonth(date)
  if (diff < MINUTE) return 'just now'
  if (diff < HOUR) {
    const mins = Math.floor(diff / MINUTE)
    return `${mins} min ago`
  }
  if (diff < DAY) {
    const hours = Math.floor(diff / HOUR)
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  }
  if (diff < 7 * DAY) {
    const days = Math.floor(diff / DAY)
    return `${days} ${days === 1 ? 'day' : 'days'} ago`
  }
  return formatDayMonth(date)
}

/** Whole days between now and a deadline. Negative once overdue. */
export function daysUntil(value?: IsoDateTime | Date | null, now: Date = new Date()): number | null {
  const date = toDate(value)
  if (!date) return null
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((startOfTarget.getTime() - startOfNow.getTime()) / DAY)
}

export interface DeadlineUrgency {
  days: number
  label: string
  /** Text color; neutral unless the deadline is genuinely close. */
  className: string
  overdue: boolean
}

export function getDeadlineUrgency(
  value?: IsoDateTime | Date | null,
  now: Date = new Date(),
): DeadlineUrgency | null {
  const days = daysUntil(value, now)
  if (days === null) return null

  if (days < 0) {
    return {
      days,
      label: `${Math.abs(days)}d overdue`,
      className: 'text-veryhot-strong',
      overdue: true,
    }
  }
  if (days === 0) {
    return { days, label: 'Due today', className: 'text-veryhot-strong', overdue: false }
  }
  if (days <= 3) {
    return {
      days,
      label: `${days} ${days === 1 ? 'day' : 'days'} left`,
      className: 'text-veryhot-strong',
      overdue: false,
    }
  }
  if (days <= 10) {
    return { days, label: `${days} days left`, className: 'text-hot-strong', overdue: false }
  }
  return { days, label: `${days} days left`, className: 'text-ink-muted', overdue: false }
}

/** Local timezone abbreviation, e.g. `GMT+5:30`. */
export function getTimezoneLabel(): string {
  const offsetMinutes = -new Date().getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const abs = Math.abs(offsetMinutes)
  const hours = Math.floor(abs / 60)
  const minutes = abs % 60
  return `GMT${sign}${hours}${minutes ? `:${minutes.toString().padStart(2, '0')}` : ''}`
}

export function isWithinDays(
  value: IsoDateTime | null | undefined,
  days: number,
  now: Date = new Date(),
): boolean {
  const date = toDate(value)
  if (!date) return false
  const diff = now.getTime() - date.getTime()
  return diff >= 0 && diff <= days * DAY
}

export function isSameDay(a?: IsoDateTime | Date | null, b: Date = new Date()): boolean {
  const date = toDate(a)
  if (!date) return false
  return (
    date.getFullYear() === b.getFullYear() &&
    date.getMonth() === b.getMonth() &&
    date.getDate() === b.getDate()
  )
}

/** Groups timeline entries under `Today`, `Yesterday` or a date heading. */
export function getDayGroupLabel(value: IsoDateTime, now: Date = new Date()): string {
  const days = daysUntil(value, now)
  if (days === 0) return 'Today'
  if (days === -1) return 'Yesterday'
  return formatDate(value)
}
