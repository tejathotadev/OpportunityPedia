import { isVisibleTemperature, temperatureMeta } from '@/app/constants/opportunity'
import type { Opportunity, OpportunityFilters, SortState, User } from '@/app/types'

import { daysUntil, isWithinDays } from './date'

export type OpportunitySortKey =
  | 'title'
  | 'type'
  | 'temperature'
  | 'detectedAt'
  | 'deadline'
  | 'assignedToName'
  | 'outreachStatus'
  | 'lastContactedAt'

function matchesSearch(opportunity: Opportunity, term: string): boolean {
  const needle = term.trim().toLowerCase()
  if (!needle) return true
  return (
    opportunity.title.toLowerCase().includes(needle) ||
    opportunity.companyName.toLowerCase().includes(needle) ||
    opportunity.industry.toLowerCase().includes(needle) ||
    opportunity.location.toLowerCase().includes(needle) ||
    opportunity.summary.toLowerCase().includes(needle)
  )
}

export function filterOpportunities(
  items: Opportunity[],
  filters: OpportunityFilters,
): Opportunity[] {
  return items.filter((opportunity) => {
    if (!isVisibleTemperature(opportunity.temperature)) return false
    if (filters.search && !matchesSearch(opportunity, filters.search)) return false
    if (
      filters.titleMatch &&
      !opportunity.title.toLowerCase().includes(filters.titleMatch.trim().toLowerCase())
    )
      return false
    if (filters.temperature?.length && !filters.temperature.includes(opportunity.temperature))
      return false
    if (filters.type?.length && !filters.type.includes(opportunity.type)) return false
    if (filters.industry?.length && !filters.industry.includes(opportunity.industry)) return false
    if (filters.country?.length && !filters.country.includes(opportunity.country)) return false
    if (filters.companyId && opportunity.companyId !== filters.companyId) return false
    if (filters.detectedWithinDays && !isWithinDays(opportunity.detectedAt, filters.detectedWithinDays))
      return false
    if (filters.deadlineWithinDays) {
      const days = daysUntil(opportunity.deadline)
      if (days === null || days < 0 || days > filters.deadlineWithinDays) return false
    }
    if (filters.source?.length && !filters.source.includes(opportunity.sourceId)) return false
    return true
  })
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0
  if (a === null || a === undefined) return 1
  if (b === null || b === undefined) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b))
}

export function sortOpportunities(
  items: Opportunity[],
  sort: SortState<OpportunitySortKey>,
): Opportunity[] {
  const factor = sort.direction === 'asc' ? 1 : -1
  return [...items].sort((a, b) => {
    if (sort.key === 'temperature') {
      const delta = temperatureMeta(a.temperature).order - temperatureMeta(b.temperature).order
      return delta * (sort.direction === 'asc' ? 1 : -1)
    }
    if (sort.key === 'detectedAt' || sort.key === 'deadline' || sort.key === 'lastContactedAt') {
      const aTime = a[sort.key] ? new Date(a[sort.key] as string).getTime() : null
      const bTime = b[sort.key] ? new Date(b[sort.key] as string).getTime() : null
      return compareValues(aTime, bTime) * factor
    }
    return compareValues(a[sort.key], b[sort.key]) * factor
  })
}

/** Default ordering: hottest first, then most recently detected. */
export function byPriority(a: Opportunity, b: Opportunity): number {
  const delta = temperatureMeta(a.temperature).order - temperatureMeta(b.temperature).order
  if (delta !== 0) return delta
  return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
}

export function countActiveFilters(filters: OpportunityFilters): number {
  let count = 0
  if (filters.titleMatch?.trim()) count += 1
  if (filters.temperature?.length) count += filters.temperature.length
  if (filters.type?.length) count += filters.type.length
  if (filters.industry?.length) count += filters.industry.length
  if (filters.country?.length) count += filters.country.length
  if (filters.companyId) count += 1
  if (filters.source?.length) count += filters.source.length
  if (filters.detectedWithinDays) count += 1
  if (filters.deadlineWithinDays) count += 1
  return count
}

export function isFilterEmpty(filters: OpportunityFilters): boolean {
  return countActiveFilters(filters) === 0 && !filters.search
}

/**
 * Derives the factual signal chips shown on the detail panel. Only facts backed
 * by a field on the record are surfaced — nothing is inferred or invented.
 */
export function deriveSignals(opportunity: Opportunity): string[] {
  const derived = [...opportunity.signals]
  const days = daysUntil(opportunity.deadline)
  if (days !== null && days >= 0 && days <= 14) {
    derived.push(days === 0 ? 'Deadline today' : `Deadline in ${days} days`)
  }
  if (opportunity.companySize === 'enterprise' || opportunity.companySize === 'strategic') {
    derived.push('Enterprise company')
  }
  if (opportunity.confidenceScore >= 85) {
    derived.push('High confidence')
  }
  return Array.from(new Set(derived))
}

export interface AttentionReason {
  label: string
  tone: 'critical' | 'warning' | 'neutral'
}

/**
 * Why an opportunity is on the "Needs Attention" list. Returns null when there
 * is nothing actionable, which keeps the section short and trustworthy.
 */
export function getAttentionReason(
  opportunity: Opportunity,
  currentUserId: string,
): AttentionReason | null {
  const deadlineDays = daysUntil(opportunity.deadline)

  if (deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 7) {
    return {
      label: deadlineDays === 0 ? 'Deadline today' : `Deadline in ${deadlineDays} days`,
      tone: 'critical',
    }
  }
  if (opportunity.temperature === 'very_hot' && !opportunity.assignedToId) {
    return { label: 'No owner', tone: 'critical' }
  }
  if (
    opportunity.assignedToId === currentUserId &&
    opportunity.outreachStatus === 'not_contacted'
  ) {
    return { label: 'Awaiting your outreach', tone: 'warning' }
  }
  if (opportunity.outreachStatus === 'follow_up_required') {
    return { label: 'Follow-up required', tone: 'warning' }
  }
  if (
    opportunity.temperature === 'very_hot' &&
    isWithinDays(opportunity.detectedAt, 2) &&
    opportunity.outreachStatus === 'not_contacted'
  ) {
    return { label: 'Newly discovered', tone: 'neutral' }
  }
  if (opportunity.temperature === 'hot' && !opportunity.assignedToId) {
    return { label: 'No owner', tone: 'neutral' }
  }
  return null
}

/**
 * The single next step an owner should take. Drives the "Next action" column so
 * an assignment list reads as a to-do list rather than a status dump.
 */
export function getNextAction(opportunity: Opportunity): { label: string; urgent: boolean } {
  const deadlineDays = daysUntil(opportunity.deadline)
  const deadlineSoon = deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 7

  switch (opportunity.outreachStatus) {
    case 'not_contacted':
      return { label: 'Send outreach', urgent: true }
    case 'follow_up_required':
      return { label: 'Send follow-up', urgent: true }
    case 'contacted':
      return { label: 'Awaiting reply', urgent: deadlineSoon }
    case 'replied':
      return { label: 'Reply received', urgent: true }
    default:
      return { label: '—', urgent: false }
  }
}

export function canSendOutreach(opportunity: Opportunity): boolean {
  // Recipient can be typed in the composer when no published contact exists
  // (typical for commercial company-level outreach).
  return opportunity.type === 'hiring' || Boolean(opportunity.contact?.email)
}

/**
 * True when someone other than the current user already reached out. Drives the
 * duplicate-outreach notice on the detail panel.
 */
export function hasOtherTeamOutreach(opportunity: Opportunity, currentUser: User): boolean {
  return Boolean(
    opportunity.lastContactedAt &&
      opportunity.lastContactedById &&
      opportunity.lastContactedById !== currentUser.id,
  )
}
