/**
 * Domain models for Opportunity Pedia.
 *
 * These mirror the shapes the FastAPI backend is expected to return. Adapters
 * live in `src/services/*` so a field rename on the server only requires a
 * change there, never inside a page or component.
 */

/** ISO-8601 timestamp string, e.g. `2026-09-06T04:48:00Z`. */
export type IsoDateTime = string

export type OpportunityTemperature = 'very_hot' | 'hot' | 'warm' | 'watch' | 'cold'

export type OpportunityType =
  | 'rfp'
  | 'leadership'
  | 'hiring'
  | 'expansion'
  | 'procurement'
  | 'partnership'
  | 'technology_investment'
  | 'funding'
  | 'vendor_requirement'
  | 'other'

export type OutreachStatus =
  | 'not_contacted'
  | 'contacted'
  | 'replied'
  | 'follow_up_required'
  | 'completed'

export type CompanySize = 'smb' | 'mid_market' | 'enterprise' | 'strategic'

export type OutreachChannel = 'email' | 'call' | 'linkedin' | 'meeting'

export type ActivityType =
  | 'discovered'
  | 'assigned'
  | 'unassigned'
  | 'reassigned'
  | 'contacted'
  | 'replied'
  | 'follow_up'
  | 'completed'
  | 'temperature_changed'
  | 'note'

export interface User {
  id: string
  name: string
  initials: string
  email: string
  jobTitle: string
  company: string
  phone?: string
  /** Tailwind-independent avatar tint key, resolved by `getAvatarTone`. */
  avatarTone?: 'navy' | 'teal' | 'plum' | 'sand' | 'slate'
}

export interface Vendor {
  id: string
  name: string
  website?: string
  domain?: string
  industry: string
  location: string
  headquarters: string
  employeeCount?: number
  companySize: CompanySize
  /** Whether the company is already an approved vendor of record. */
  vendorStatus: 'approved_vendor' | 'prospective' | 'former_vendor' | 'not_a_vendor'
  existingRelationship?: string
  description?: string
  foundedYear?: number
  lastActivityAt?: IsoDateTime
}

export interface OpportunityContact {
  name?: string
  jobTitle?: string
  email?: string
  linkedinUrl?: string
  phone?: string
}

/** SAM notice facts captured at scan (Plan A — no extra SAM description fetch). */
export interface OpportunityNoticeFacts {
  noticeId?: string | null
  solicitationNumber?: string | null
  noticeType?: string | null
  department?: string | null
  subTier?: string | null
  office?: string | null
  setAside?: string | null
  psc?: string | null
  naics?: string | null
  category?: string | null
  officeAddress?: string | null
  archiveDate?: string | null
  agencyPath?: string | null
}

/** Attachment listed from SAM search resourceLinks; open via the notice page. */
export interface OpportunityAttachment {
  id: string
  name: string
  viewUrl?: string | null
}

export interface OpportunitySource {
  id: string
  name: string
  url?: string
  publishedAt?: IsoDateTime
  /** Verbatim signal text captured at ingestion time. */
  signalDescription: string
}

export interface OpportunityActivity {
  id: string
  opportunityId: string
  type: ActivityType
  /** Null for system-generated events such as discovery. */
  actorId: string | null
  actorName: string
  /** Short human-readable description rendered in timelines. */
  message: string
  detail?: string
  createdAt: IsoDateTime
  channel?: OutreachChannel
  /** Stored on the activity row — avoids loading a full opportunity list. */
  opportunityTitle?: string | null
}

export interface Outreach {
  id: string
  opportunityId: string
  senderId: string
  senderName: string
  senderEmail: string
  recipientEmail: string
  subject: string
  body: string
  channel: OutreachChannel
  status: 'sent' | 'draft' | 'failed'
  sentAt: IsoDateTime
}

export interface Assignment {
  opportunityId: string
  userId: string
  userName: string
  assignedAt: IsoDateTime
}

/** Team / department bucket for commercial hiring signals. */
export interface OpportunityTeamBucket {
  name: string
  count: number
}

/** Facets applied before commercial company outreach. */
export interface CompanyHiringFilters {
  teams: string[]
  locations: string[]
  flexibilities: string[]
}

export interface CompanyHiringFacetBucket {
  name: string
  count: number
}

/** Live facet + count payload for the pre-outreach filter panel. */
export interface CompanyHiringSignal {
  companyId: string
  companyName: string
  totalCount: number
  matchedCount: number
  filters: CompanyHiringFilters
  facets: {
    teams: CompanyHiringFacetBucket[]
    locations: CompanyHiringFacetBucket[]
    flexibilities: CompanyHiringFacetBucket[]
  }
  opportunity: Opportunity
}

export interface Opportunity {
  id: string
  title: string
  companyId: string
  companyName: string
  type: OpportunityType
  /** SAM Contract Opportunity Type (e.g. Sources Sought). Display-only. */
  noticeType?: string | null
  temperature: OpportunityTemperature
  /** 0–100. */
  confidenceScore: number
  summary: string
  /** Factual justification shown in the "Why this opportunity" block. */
  rationale: string
  /** Short factual tags, e.g. "Active RFP". Never speculative. */
  signals: string[]
  /** Hiring team / department when known (commercial openings). */
  team?: string | null
  /** Present on company-level hiring signals used for outreach. */
  teamBreakdown?: OpportunityTeamBucket[]
  signalCount?: number
  /** Total openings at the employer before hiring facets are applied. */
  totalOpeningCount?: number
  /** Facets selected before commercial outreach. */
  hiringFilters?: CompanyHiringFilters
  industry: string
  location: string
  /** Country bucket inferred from `location`: US, IN, or OTHER. */
  country: string
  companySize: CompanySize
  estimatedValue?: number
  detectedAt: IsoDateTime
  deadline?: IsoDateTime
  /** Internal bucket used for filtering only; never shown to the user. */
  sourceId: string
  sourceUrl?: string
  sourceSignal: string
  contact?: OpportunityContact
  noticeFacts?: OpportunityNoticeFacts | null
  attachments?: OpportunityAttachment[]
  assignedToId?: string | null
  assignedToName?: string | null
  assignedAt?: IsoDateTime | null
  outreachStatus: OutreachStatus
  lastContactedAt?: IsoDateTime | null
  lastContactedById?: string | null
  lastContactedByName?: string | null
  lastContactChannel?: OutreachChannel | null
  followUpDueAt?: IsoDateTime | null
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

/**
 * Extra fields present only when the backend has collapsed an employer's open
 * roles into a single row. `kind` is the discriminator: notice rows are
 * ordinary opportunities, company rows describe hiring activity in aggregate
 * and have no deadline of their own.
 */
export interface CompanySignal {
  kind: 'company'
  /** Open roles at this employer across the current scope. */
  signalCount: number
  /** Roles posted in the last fortnight. */
  newRoles: number
  /** Roles posted in the fortnight before that, the growth baseline. */
  priorRoles: number
  /** Fractional change between the two windows; null without any postings. */
  growth: number | null
  surge: boolean
  badges: string[]
}

export type AttentionRow = Opportunity &
  Partial<CompanySignal> & { kind?: 'notice' | 'company' }

export interface AppNotification {
  id: string
  type: 'very_hot' | 'assignment' | 'deadline' | 'team' | 'system'
  title: string
  description: string
  createdAt: IsoDateTime
  read: boolean
  opportunityId?: string
  /** Client action when there is no opportunity deep link (e.g. radar_runs). */
  action?: string | null
}

export interface OpportunityFilters {
  search?: string
  /** Role-title keyword only (e.g. engineer, IT). Does not match company name. */
  titleMatch?: string
  temperature?: OpportunityTemperature[]
  type?: OpportunityType[]
  industry?: string[]
  /** Country buckets to keep; empty or omitted means everywhere. */
  country?: string[]
  /** Scopes the list to a single employer or agency. */
  companyId?: string
  /** Rolling window in days for `detectedAt`. */
  detectedWithinDays?: number
  /** Rolling window in days for `deadline`. */
  deadlineWithinDays?: number
  source?: string[]
}

/** Company rollup row for the Opportunities index (no source names). */
export interface OpportunityCompanyRow {
  companyId: string
  companyName: string
  industry: string
  location: string
  country: string
  matchingCount: number
  veryHot: number
  hot: number
  highestTemperature: OpportunityTemperature
  lastDetectedAt?: string | null
  types: string[]
  /** Top teams / departments derived from openings (not shown as a job list). */
  teamBreakdown?: OpportunityTeamBucket[]
  /** Same ownership fields as government rows (`company:{id}` assignment key). */
  assignedToId?: string | null
  assignedToName?: string | null
  assignedAt?: string | null
  outreachStatus?: OutreachStatus
  lastContactedAt?: string | null
  lastContactedByName?: string | null
}

export type SortDirection = 'asc' | 'desc'

export interface SortState<TKey extends string = string> {
  key: TKey
  direction: SortDirection
}

/** Conventional list envelope returned by the backend. */
export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface DashboardMetrics {
  totalVendors: number
  /** Government notices + commercial companies (not individual job openings). */
  totalOpportunities: number
  /** Commercial job openings count (shown in the Hot card). */
  totalOpenings?: number
  opportunitiesAddedThisWeek: number
  veryHot: number
  veryHotNeedingAttention: number
  /** Openings volume for the Hot card (not temperature-bucket size). */
  hot: number
  hotUnassigned: number
  assignedToMe: number
  assignedToMeNotContacted: number
  contactedThisWeek: number
  contactedByMeThisWeek: number
}

export interface TemperatureBreakdown {
  temperature: OpportunityTemperature
  count: number
}

export interface PipelineSummary {
  assigned: number
  needsOutreach: number
  contacted: number
  followUp: number
}

export interface TeamOwnershipRow {
  user: User
  assigned: number
  needsOutreach: number
  contactedToday: number
  followUps: number
}

export interface SendOutreachPayload {
  opportunityId: string
  from: string
  to: string
  subject: string
  body: string
  channel: OutreachChannel
}

export interface AssignmentPayload {
  opportunityId: string
  userId: string
}
