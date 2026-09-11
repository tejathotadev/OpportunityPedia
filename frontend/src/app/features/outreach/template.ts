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

function greetingLine(opportunity: Opportunity): string {
  const name = opportunity.contact?.name?.trim()
  return name ? `Hi ${firstNameOf(name)},` : 'Hi,'
}

function signatureBlock(sender: User): string {
  return [sender.name, sender.company, sender.phone, sender.email].filter(Boolean).join('\n')
}

function focusTeams(opportunity: Opportunity): string[] {
  const selected = opportunity.hiringFilters?.teams?.map((t) => t.trim()).filter(Boolean) ?? []
  if (selected.length) return selected
  const top = opportunity.teamBreakdown?.[0]?.name?.trim()
  return top ? [top] : []
}

/** `{requirement} for {organization}` — never invents a category or sender brand. */
export function buildSubject(opportunity: Opportunity, _sender: User): string {
  const org = opportunity.companyName.trim()
  if (opportunity.type === 'hiring') {
    return org ? `Staffing support for ${org}` : 'Staffing support'
  }
  const title = opportunity.title.trim()
  if (!org) return title || 'Staffing support'
  if (!title) return `Staffing support for ${org}`
  if (title.toLowerCase().includes(org.toLowerCase())) return title
  if (title.length > 90) return `Staffing support for ${org}`
  return `${title} for ${org}`
}

/**
 * Professional starting draft. Fills only title, organization, team, and the
 * sender profile. Deadline and source are never mentioned. Fully editable.
 */
export function buildBody(opportunity: Opportunity, sender: User): string {
  const org = opportunity.companyName.trim()
  const title = opportunity.title.trim()
  const signoff = signatureBlock(sender)

  if (opportunity.type === 'hiring') {
    const teams = focusTeams(opportunity)
    const roleBit = teams.length
      ? `, including ${teams.join(', ')} roles`
      : ''

    return [
      greetingLine(opportunity),
      '',
      `I came across hiring activity at ${org || 'your organization'} and wanted to reach out.`,
      '',
      `We help organizations source qualified professionals for open roles${roleBit}.`,
      '',
      'If you are still filling these roles, I’d be happy to understand the staffing needs and see whether we could support your team.',
      '',
      'Would you be open to a quick conversation?',
      '',
      'Best,',
      signoff,
    ].join('\n')
  }

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
    'Would you be open to a quick conversation?',
    '',
    'Best,',
    signoff,
  ].join('\n')
}
