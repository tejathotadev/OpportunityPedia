import type { Opportunity, OpportunityCompanyRow, User } from '@/app/types'
import { firstNameOf } from '@/app/utils/format'

/** Centralized outreach draft styles — one registry for subject + body. */
export type OutreachDraftStyle =
  | 'hiring_signal'
  | 'role_focused'
  | 'partnership'
  | 'follow_up'
  | 'custom'

export interface OutreachDraftStyleMeta {
  id: OutreachDraftStyle
  label: string
  description: string
}

export const OUTREACH_DRAFT_STYLES: OutreachDraftStyleMeta[] = [
  {
    id: 'hiring_signal',
    label: 'Hiring signal',
    description: 'Soft first touch from openings',
  },
  {
    id: 'role_focused',
    label: 'Role-focused',
    description: 'Tied to selected teams / locations',
  },
  {
    id: 'partnership',
    label: 'Partnership',
    description: 'Ongoing staffing capacity',
  },
  {
    id: 'follow_up',
    label: 'Follow-up',
    description: 'After a prior outreach',
  },
  {
    id: 'custom',
    label: 'Custom',
    description: 'Blank draft you write',
  },
]

export function defaultOutreachDraftStyle(opportunity: Opportunity): OutreachDraftStyle {
  if (opportunity.outreachStatus && opportunity.outreachStatus !== 'not_contacted') {
    return 'follow_up'
  }
  const teams = opportunity.hiringFilters?.teams?.filter(Boolean) ?? []
  if (opportunity.type === 'hiring' && teams.length > 0) {
    return 'role_focused'
  }
  if (opportunity.type === 'hiring') {
    return 'hiring_signal'
  }
  return 'hiring_signal'
}

/** Build a company-level opportunity for commercial outreach (no openings list). */
export function companyRowToOpportunity(row: OpportunityCompanyRow): Opportunity {
  const teams = row.teamBreakdown ?? []
  const teamBits = teams
    .slice(0, 3)
    .map((t) => `${t.name} (${t.count})`)
    .join(', ')
  const count = row.matchingCount
  const summary = teamBits
    ? `${row.companyName} has ${count} open roles. Top teams: ${teamBits}.`
    : `${row.companyName} has ${count} open role${count === 1 ? '' : 's'}.`

  return {
    id: `company:${row.companyId}`,
    title: `Hiring activity at ${row.companyName}`,
    companyId: row.companyId,
    companyName: row.companyName,
    type: 'hiring',
    temperature: row.highestTemperature,
    confidenceScore: 0,
    summary,
    rationale: summary,
    signals: [`${count} openings`, ...teams.slice(0, 3).map((t) => t.name)],
    teamBreakdown: teams,
    signalCount: count,
    totalOpeningCount: count,
    industry: row.industry || 'Hiring',
    location: row.location || '—',
    country: row.country || 'OTHER',
    companySize: 'mid_market',
    detectedAt: row.lastDetectedAt ?? new Date().toISOString(),
    sourceId: 'job_board',
    sourceSignal: summary,
    outreachStatus: 'not_contacted',
    createdAt: row.lastDetectedAt ?? new Date().toISOString(),
    updatedAt: row.lastDetectedAt ?? new Date().toISOString(),
  }
}

function greetingLine(opportunity: Opportunity): string {
  const name = opportunity.contact?.name?.trim()
  return name ? `Hi ${firstNameOf(name)},` : 'Hi,'
}

function signatureBlock(sender: User): string {
  return [sender.name, sender.company, sender.email].filter(Boolean).join('\n')
}

function focusTeams(opportunity: Opportunity): string[] {
  const selected = opportunity.hiringFilters?.teams?.map((t) => t.trim()).filter(Boolean) ?? []
  if (selected.length) return selected
  const top = opportunity.teamBreakdown?.[0]?.name?.trim()
  return top ? [top] : []
}

function focusLocations(opportunity: Opportunity): string[] {
  return opportunity.hiringFilters?.locations?.map((t) => t.trim()).filter(Boolean) ?? []
}

function focusFlex(opportunity: Opportunity): string[] {
  return opportunity.hiringFilters?.flexibilities?.map((t) => t.trim()).filter(Boolean) ?? []
}

function matchedCount(opportunity: Opportunity): number | null {
  const n = opportunity.signalCount ?? opportunity.totalOpeningCount
  return typeof n === 'number' && n > 0 ? n : null
}

function filterFocusPhrase(opportunity: Opportunity): string {
  const parts: string[] = []
  const teams = focusTeams(opportunity)
  const locations = focusLocations(opportunity)
  const flex = focusFlex(opportunity)
  if (teams.length) parts.push(teams.join(', '))
  if (locations.length) parts.push(locations.join(', '))
  if (flex.length) parts.push(flex.join(', '))
  return parts.join(' · ')
}

function closeOut(signoff: string): string[] {
  return ['Would you be open to a quick conversation?', '', 'Best,', signoff]
}

function governmentSubject(opportunity: Opportunity): string {
  const org = opportunity.companyName.trim()
  const title = opportunity.title.trim()
  if (!org) return title || 'Staffing support'
  if (!title) return `Staffing support for ${org}`
  if (title.toLowerCase().includes(org.toLowerCase())) return title
  if (title.length > 90) return `Staffing support for ${org}`
  return `${title} for ${org}`
}

function governmentBody(opportunity: Opportunity, sender: User): string {
  const org = opportunity.companyName.trim()
  const title = opportunity.title.trim()
  const signoff = signatureBlock(sender)
  const requirement = title || 'staffing'
  const requirementPhrase = /requirement/i.test(requirement)
    ? requirement
    : `${requirement} requirement`
  const forOrg = org ? ` for ${org}` : ''

  return [
    greetingLine(opportunity),
    '',
    `I came across the ${requirementPhrase}${forOrg} and wanted to reach out.`,
    '',
    'We help organizations source qualified professionals for staffing requirements, including specialized roles such as this.',
    '',
    'If this requirement is still active, I’d be happy to understand the staffing needs and see whether we could support your team.',
    '',
    ...closeOut(signoff),
  ].join('\n')
}

function hiringSignalDraft(opportunity: Opportunity, sender: User): { subject: string; body: string } {
  const org = opportunity.companyName.trim() || 'your organization'
  const signoff = signatureBlock(sender)
  const focus = filterFocusPhrase(opportunity)
  const count = matchedCount(opportunity)
  const countBit =
    count != null ? ` (${count} matching open role${count === 1 ? '' : 's'})` : ''
  const focusBit = focus ? ` — specifically around ${focus}` : ''

  return {
    subject: `Staffing support for ${org}`,
    body: [
      greetingLine(opportunity),
      '',
      `I came across hiring activity at ${org}${focusBit}${countBit} and wanted to reach out.`,
      '',
      'We help organizations source qualified professionals for open roles, with a focus on speed and role fit.',
      '',
      'If you are still filling these roles, I’d be happy to understand the staffing needs and see whether we could support your team.',
      '',
      ...closeOut(signoff),
    ].join('\n'),
  }
}

function roleFocusedDraft(opportunity: Opportunity, sender: User): { subject: string; body: string } {
  const org = opportunity.companyName.trim() || 'your organization'
  const signoff = signatureBlock(sender)
  const teams = focusTeams(opportunity)
  const locations = focusLocations(opportunity)
  const flex = focusFlex(opportunity)
  const count = matchedCount(opportunity)

  const teamLabel = teams.length ? teams.join(', ') : 'priority'
  const whereBits = [...locations, ...flex].filter(Boolean)
  const whereBit = whereBits.length ? ` in ${whereBits.join(' / ')}` : ''
  const countBit =
    count != null ? ` across ${count} matching opening${count === 1 ? '' : 's'}` : ''

  return {
    subject: teams.length
      ? `${teamLabel} staffing support for ${org}`
      : `Role staffing support for ${org}`,
    body: [
      greetingLine(opportunity),
      '',
      `I wanted to reach out regarding ${teamLabel} hiring at ${org}${whereBit}${countBit}.`,
      '',
      `We specialize in sourcing qualified professionals for ${teamLabel.toLowerCase()} roles and can move quickly when profiles need to match a clear brief.`,
      '',
      'If these openings are still active, I’d welcome a short conversation to align on must-haves, timeline, and how we could support your hiring team.',
      '',
      ...closeOut(signoff),
    ].join('\n'),
  }
}

function partnershipDraft(opportunity: Opportunity, sender: User): { subject: string; body: string } {
  const org = opportunity.companyName.trim() || 'your organization'
  const signoff = signatureBlock(sender)
  const count = matchedCount(opportunity)
  const volumeBit =
    count != null && count >= 10
      ? ` With ${count} open roles in view, a steadier staffing channel may help.`
      : ''

  return {
    subject: `Staffing partnership with ${org}`,
    body: [
      greetingLine(opportunity),
      '',
      `I’m reaching out to explore whether ${org} would benefit from a reliable staffing partner for ongoing and surge hiring needs.${volumeBit}`,
      '',
      'We support teams with qualified professionals across functions, and we work as an extension of internal recruiting — clear briefs, curated shortlists, and accountable follow-through.',
      '',
      'If a light conversation would be useful, I’m happy to share how we typically engage and where we add the most value.',
      '',
      ...closeOut(signoff),
    ].join('\n'),
  }
}

function followUpDraft(opportunity: Opportunity, sender: User): { subject: string; body: string } {
  const org = opportunity.companyName.trim() || 'your organization'
  const signoff = signatureBlock(sender)
  const focus = filterFocusPhrase(opportunity)
  const focusBit = focus ? ` regarding ${focus}` : ''

  return {
    subject: `Following up — staffing support for ${org}`,
    body: [
      greetingLine(opportunity),
      '',
      `I wanted to follow up on my earlier note about staffing support for ${org}${focusBit}.`,
      '',
      'I know priorities shift quickly. If helpful, I’m still available to discuss open roles, timelines, and how we could support your team — even with a brief reply.',
      '',
      'Happy to work around your schedule.',
      '',
      'Best,',
      signoff,
    ].join('\n'),
  }
}

function customDraft(opportunity: Opportunity, sender: User): { subject: string; body: string } {
  const org = opportunity.companyName.trim()
  const signoff = signatureBlock(sender)
  return {
    subject: org ? `Staffing support for ${org}` : 'Staffing support',
    body: [
      greetingLine(opportunity),
      '',
      '[Write your message here]',
      '',
      'Best,',
      signoff,
    ].join('\n'),
  }
}

/**
 * Single entry point for outreach drafts. Never invents deadline or source names.
 * Filter context (teams / locations / flexibility / counts) shapes commercial copy.
 */
export function buildOutreachDraft(
  opportunity: Opportunity,
  sender: User,
  style: OutreachDraftStyle = defaultOutreachDraftStyle(opportunity),
): { subject: string; body: string } {
  if (opportunity.type !== 'hiring') {
    if (style === 'custom') {
      return customDraft(opportunity, sender)
    }
    if (style === 'follow_up') {
      const org = opportunity.companyName.trim() || 'your organization'
      const signoff = signatureBlock(sender)
      return {
        subject: `Following up — ${governmentSubject(opportunity)}`,
        body: [
          greetingLine(opportunity),
          '',
          `I wanted to follow up on my earlier note about staffing support for ${org}.`,
          '',
          'If the requirement is still active, I’d be glad to reconnect and see whether we could support your team.',
          '',
          'Best,',
          signoff,
        ].join('\n'),
      }
    }
    if (style === 'partnership') {
      const draft = partnershipDraft(opportunity, sender)
      return { subject: draft.subject, body: draft.body }
    }
    return {
      subject: governmentSubject(opportunity),
      body: governmentBody(opportunity, sender),
    }
  }

  switch (style) {
    case 'role_focused':
      return roleFocusedDraft(opportunity, sender)
    case 'partnership':
      return partnershipDraft(opportunity, sender)
    case 'follow_up':
      return followUpDraft(opportunity, sender)
    case 'custom':
      return customDraft(opportunity, sender)
    case 'hiring_signal':
    default:
      return hiringSignalDraft(opportunity, sender)
  }
}

/** @deprecated Prefer buildOutreachDraft — kept for call-site compatibility. */
export function buildSubject(opportunity: Opportunity, sender: User): string {
  return buildOutreachDraft(opportunity, sender).subject
}

/** @deprecated Prefer buildOutreachDraft — kept for call-site compatibility. */
export function buildBody(opportunity: Opportunity, sender: User): string {
  return buildOutreachDraft(opportunity, sender).body
}
