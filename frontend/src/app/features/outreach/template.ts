import { opportunityDisplayType } from '@/app/constants/opportunity'
import type { Opportunity, OpportunityCompanyRow, User } from '@/app/types'
import { firstNameOf } from '@/app/utils/format'

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

function hiringFilterLabel(opportunity: Opportunity): string | null {
  const filters = opportunity.hiringFilters
  if (!filters) return null
  const bits: string[] = []
  if (filters.teams.length) bits.push(`Team: ${filters.teams.join(', ')}`)
  if (filters.locations.length) bits.push(`Location: ${filters.locations.join(', ')}`)
  if (filters.flexibilities.length) {
    bits.push(`Flexibility: ${filters.flexibilities.join(', ')}`)
  }
  return bits.length ? bits.join(' · ') : null
}

/** `Regarding {title} — {sender company}` */
export function buildSubject(opportunity: Opportunity, sender: User): string {
  if (opportunity.type === 'hiring' && (opportunity.signalCount || opportunity.teamBreakdown)) {
    return `Supporting your open roles at ${opportunity.companyName} — ${sender.company}`
  }
  return `Regarding ${opportunity.title} — ${sender.company}`
}

/**
 * Professional default body. Deliberately claims nothing about capabilities
 * that was not supplied by the workspace, and is fully editable before send.
 */
export function buildBody(opportunity: Opportunity, sender: User): string {
  const contactName = opportunity.contact?.name
  const greeting = contactName ? firstNameOf(contactName) : 'team'
  const signature = [sender.name, sender.jobTitle, sender.company, sender.phone ?? sender.email]
    .filter(Boolean)
    .join('\n')

  if (opportunity.type === 'hiring') {
    const matched = opportunity.signalCount ?? 0
    const total = opportunity.totalOpeningCount ?? matched
    const teams = opportunity.teamBreakdown ?? []
    const focus = teams[0]
    const filterLabel = hiringFilterLabel(opportunity)
    const teamLine = teams.length
      ? `Looking across those roles, the strongest concentrations appear in ${teams
          .slice(0, 3)
          .map((t) => `${t.name} (${t.count})`)
          .join(', ')}.`
      : null

    const countLine = filterLabel
      ? matched > 0
        ? `I noticed ${opportunity.companyName} currently has about ${total} open role${total === 1 ? '' : 's'}, with ${matched} matching ${filterLabel}, and wanted to reach out.`
        : `I noticed ${opportunity.companyName} is actively hiring and wanted to reach out.`
      : matched > 0
        ? `I noticed ${opportunity.companyName} currently has about ${matched} open role${matched === 1 ? '' : 's'} and wanted to reach out.`
        : `I noticed ${opportunity.companyName} is actively hiring and wanted to reach out.`

    return [
      `Hi ${greeting},`,
      '',
      countLine,
      '',
      teamLine,
      '',
      focus
        ? `If helpful, our team can help source and screen candidates for requirements like ${focus.name} — aligned to the roles you already have open.`
        : 'If helpful, our team can help source and screen candidates aligned to the roles you already have open.',
      '',
      'Would you be open to a brief conversation about where support would be most useful?',
      '',
      'Best regards,',
      '',
      signature,
    ]
      .filter((line) => line !== null)
      .join('\n')
  }

  const typeLabel = opportunityDisplayType(opportunity).toLowerCase()
  return [
    `Hi ${greeting},`,
    '',
    `I came across your ${typeLabel} regarding ${opportunity.title} at ${opportunity.companyName} and wanted to reach out.`,
    '',
    'Based on the requirements outlined, I believe our team may be able to support you with the initiative.',
    '',
    'I’d be happy to share relevant capabilities, experience, and examples of how we could help. If it makes sense, would you be open to a brief conversation?',
    '',
    'Best regards,',
    '',
    signature,
  ].join('\n')
}
