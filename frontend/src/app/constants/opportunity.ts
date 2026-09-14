import type {
  ActivityType,
  CompanySize,
  OpportunityTemperature,
  OpportunityType,
  OutreachChannel,
  OutreachStatus,
  Vendor,
} from '@/app/types'

export interface TemperatureMeta {
  label: string
  /** Short description used in tooltips and filter menus. */
  description: string
  /** Solid dot / bar color. */
  dot: string
  /** Badge classes: soft tint + readable text + hairline border. */
  badge: string
  /** Left row indicator used sparingly in tables. */
  rail: string
  /** Chart segment fill. */
  fill: string
  order: number
}

export const TEMPERATURE_META: Record<OpportunityTemperature, TemperatureMeta> = {
  very_hot: {
    label: 'Very Hot',
    description: 'Immediate high-value opportunity requiring attention',
    dot: 'bg-veryhot',
    badge: 'bg-veryhot-soft text-veryhot-strong border-veryhot-line',
    rail: 'bg-veryhot',
    fill: 'bg-veryhot',
    order: 0,
  },
  hot: {
    label: 'Hot',
    description: 'Strong buying signal or high probability opportunity',
    dot: 'bg-hot',
    badge: 'bg-hot-soft text-hot-strong border-hot-line',
    rail: 'bg-hot',
    fill: 'bg-hot',
    order: 1,
  },
  warm: {
    label: 'Warm',
    description: 'Interesting signal but lower urgency',
    dot: 'bg-warm',
    badge: 'bg-warm-soft text-warm-strong border-warm-line',
    rail: 'bg-warm',
    fill: 'bg-warm',
    order: 2,
  },
  watch: {
    label: 'Watch',
    description: 'Worth monitoring but not yet actionable',
    dot: 'bg-watch',
    badge: 'bg-watch-soft text-watch-strong border-watch-line',
    rail: 'bg-watch',
    fill: 'bg-watch',
    order: 3,
  },
  cold: {
    label: 'Cold',
    description: 'Low priority, no active buying signal',
    dot: 'bg-cold',
    badge: 'bg-cold-soft text-cold border-cold-line',
    rail: 'bg-cold',
    fill: 'bg-cold',
    order: 4,
  },
}

/** Only Very Hot and Hot are shown in the product. */
export const TEMPERATURE_ORDER: OpportunityTemperature[] = ['very_hot', 'hot']

export const ALL_TEMPERATURES: OpportunityTemperature[] = ['very_hot', 'hot']

export function isVisibleTemperature(temperature: OpportunityTemperature): boolean {
  return temperature === 'very_hot' || temperature === 'hot'
}

export const OPPORTUNITY_TYPE_LABEL: Record<OpportunityType, string> = {
  rfp: 'RFP',
  leadership: 'Leadership',
  hiring: 'Commercial',
  expansion: 'Expansion',
  procurement: 'Procurement',
  partnership: 'Partnership',
  technology_investment: 'Technology Investment',
  funding: 'Funding',
  vendor_requirement: 'Vendor Requirement',
  other: 'Other',
}

export const OPPORTUNITY_TYPES = Object.keys(OPPORTUNITY_TYPE_LABEL) as OpportunityType[]

export const OPPORTUNITY_CATEGORIES = ['all', 'vendors', 'tenders', 'hiring'] as const

export type OpportunityCategory = (typeof OPPORTUNITY_CATEGORIES)[number]

export const OPPORTUNITY_CATEGORY_LABEL: Record<OpportunityCategory, string> = {
  all: 'All',
  vendors: 'Vendors',
  tenders: 'Government',
  hiring: 'Commercial',
}

/**
 * Groups the ten opportunity types into the coarse buckets the dashboard is
 * scoped by. An empty list means "no type filter", so `all` still reconciles
 * with the unscoped totals.
 */
export const OPPORTUNITY_CATEGORY_TYPES: Record<OpportunityCategory, OpportunityType[]> = {
  all: [],
  vendors: ['vendor_requirement'],
  tenders: ['rfp', 'procurement'],
  hiring: ['hiring'],
}

/** Opportunities page lanes: hiring = company rollup; government = flat tenders. */
export const OPPORTUNITY_LANES = ['hiring', 'government'] as const
export type OpportunityLane = (typeof OPPORTUNITY_LANES)[number]

export const OPPORTUNITY_LANE_LABEL: Record<OpportunityLane, string> = {
  hiring: 'Commercial',
  government: 'Government',
}

export const OPPORTUNITY_LANE_TYPES: Record<OpportunityLane, OpportunityType[]> = {
  hiring: ['hiring'],
  government: ['rfp', 'procurement'],
}

/**
 * How far back a view looks, in days. A radar scan always pulls the upstream
 * maximum of a year, so narrowing this only re-slices rows already stored —
 * it never spends API quota.
 */
export const DETECTED_RANGES = ['any', '1', '7', '30', '60', '90', '180', '365'] as const

export type DetectedRange = (typeof DETECTED_RANGES)[number]

export const DETECTED_RANGE_LABEL: Record<DetectedRange, string> = {
  any: 'Any time',
  '1': 'Last 24 hours',
  '7': 'Last 7 days',
  '30': 'Last 30 days',
  '60': 'Last 2 months',
  '90': 'Last 3 months',
  '180': 'Last 6 months',
  '365': 'Last 12 months',
}

/**
 * Country buckets for the Overview location filter. The backend infers these
 * from each row's free-text location, so `other` is everywhere that is neither
 * of the two markets being tracked rather than a gap in the data.
 */
export const COUNTRY_FILTERS = ['any', 'US', 'IN', 'OTHER'] as const

export type CountryFilter = (typeof COUNTRY_FILTERS)[number]

export const COUNTRY_FILTER_LABEL: Record<CountryFilter, string> = {
  any: 'Anywhere',
  US: 'United States',
  IN: 'India',
  OTHER: 'Rest of world',
}

export interface OutreachMeta {
  label: string
  badge: string
  dot: string
}

export const OUTREACH_STATUS_META: Record<OutreachStatus, OutreachMeta> = {
  not_contacted: {
    label: 'Not contacted',
    badge: 'bg-surface-sunken text-ink-secondary border-line-strong',
    dot: 'bg-ink-subtle',
  },
  contacted: {
    label: 'Contacted',
    badge: 'bg-success-soft text-success border-success-line',
    dot: 'bg-success',
  },
  replied: {
    label: 'Replied',
    badge: 'bg-signal-50 text-signal-700 border-signal-200',
    dot: 'bg-signal-600',
  },
  follow_up_required: {
    label: 'Follow-up',
    badge: 'bg-warm-soft text-warm-strong border-warm-line',
    dot: 'bg-warm',
  },
  completed: {
    label: 'Completed',
    badge: 'bg-success-soft text-success border-success-line',
    dot: 'bg-success',
  },
}

export const OUTREACH_STATUSES = Object.keys(OUTREACH_STATUS_META) as OutreachStatus[]

export const COMPANY_SIZE_LABEL: Record<CompanySize, string> = {
  smb: 'SMB (1–200)',
  mid_market: 'Mid-market (201–1,000)',
  enterprise: 'Enterprise (1,001–10,000)',
  strategic: 'Strategic (10,000+)',
}

export const COMPANY_SIZE_SHORT: Record<CompanySize, string> = {
  smb: 'SMB',
  mid_market: 'Mid-market',
  enterprise: 'Enterprise',
  strategic: 'Strategic',
}

export const COMPANY_SIZES = Object.keys(COMPANY_SIZE_LABEL) as CompanySize[]

export const VENDOR_STATUS_LABEL: Record<Vendor['vendorStatus'], string> = {
  approved_vendor: 'Approved vendor',
  prospective: 'Prospective',
  former_vendor: 'Former vendor',
  not_a_vendor: 'Not a vendor',
}

export const ACTIVITY_TYPE_LABEL: Record<ActivityType, string> = {
  discovered: 'Discovered',
  assigned: 'Assigned',
  unassigned: 'Unassigned',
  reassigned: 'Reassigned',
  contacted: 'Contacted',
  replied: 'Replied',
  follow_up: 'Follow-up',
  completed: 'Completed',
  temperature_changed: 'Temperature changed',
  note: 'Note',
}

export const CHANNEL_LABEL: Record<OutreachChannel, string> = {
  email: 'Email',
  call: 'Call',
  linkedin: 'LinkedIn',
  meeting: 'Meeting',
}

export const CONFIDENCE_BANDS = [
  { min: 85, label: 'High', className: 'text-success' },
  { min: 65, label: 'Medium', className: 'text-ink-secondary' },
  { min: 0, label: 'Low', className: 'text-ink-muted' },
] as const

/**
 * Industry options offered by the Industry filter.
 *
 * These mirror the NAICS categories the radar classifies notices into
 * (`app/radar/heat.py`), so the list stays in step with the values the API can
 * actually return. Keep both sides in sync when a NAICS code is added.
 */
export const INDUSTRIES = [
  'Employment Placement',
  'Executive Search',
  'Temporary Help',
  'PEO / Co-employment',
] as const

/*
 * Safe lookups for values that arrive from the API.
 *
 * The maps above are typed as total, so TypeScript treats every lookup as a
 * hit. At runtime the server decides these values, and one it sends that the
 * interface has no entry for used to take down the whole route. Anything that
 * indexes a map with server data goes through the helpers below instead, so an
 * unrecognised value degrades to a neutral label.
 */

function humanise(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function labelFrom<K extends string>(map: Record<K, string>, key: K | null | undefined): string {
  if (!key) return '—'
  return (map as Partial<Record<K, string>>)[key] ?? humanise(key)
}

const UNKNOWN_TEMPERATURE: TemperatureMeta = {
  label: 'Unclassified',
  description: 'This opportunity has no temperature classification',
  dot: 'bg-ink-subtle',
  badge: 'bg-surface-sunken text-ink-secondary border-line-strong',
  rail: 'bg-ink-subtle',
  fill: 'bg-ink-subtle',
  /** Sorts after every known temperature. */
  order: 99,
}

export function temperatureMeta(temperature?: OpportunityTemperature | null): TemperatureMeta {
  if (!temperature) return UNKNOWN_TEMPERATURE
  const map = TEMPERATURE_META as Partial<Record<OpportunityTemperature, TemperatureMeta>>
  return map[temperature] ?? UNKNOWN_TEMPERATURE
}

const UNKNOWN_OUTREACH: OutreachMeta = {
  label: 'Unknown',
  badge: 'bg-surface-sunken text-ink-secondary border-line-strong',
  dot: 'bg-ink-subtle',
}

export function outreachStatusMeta(status?: OutreachStatus | null): OutreachMeta {
  if (!status) return UNKNOWN_OUTREACH
  const map = OUTREACH_STATUS_META as Partial<Record<OutreachStatus, OutreachMeta>>
  return map[status] ?? UNKNOWN_OUTREACH
}

export function opportunityTypeLabel(type?: OpportunityType | null): string {
  return labelFrom(OPPORTUNITY_TYPE_LABEL, type)
}

/** Prefer SAM notice type when present; otherwise the coarse OpportunityType label. */
export function opportunityDisplayType(opportunity: {
  type?: OpportunityType | null
  noticeType?: string | null
}): string {
  const notice = opportunity.noticeType?.trim()
  if (notice) return notice
  return opportunityTypeLabel(opportunity.type)
}

export function companySizeLabel(size?: CompanySize | null): string {
  return labelFrom(COMPANY_SIZE_LABEL, size)
}

export function companySizeShort(size?: CompanySize | null): string {
  return labelFrom(COMPANY_SIZE_SHORT, size)
}

export function vendorStatusLabel(status?: Vendor['vendorStatus'] | null): string {
  return labelFrom(VENDOR_STATUS_LABEL, status)
}

export function channelLabel(channel?: OutreachChannel | null): string {
  return labelFrom(CHANNEL_LABEL, channel)
}

export function activityTypeLabel(type?: ActivityType | null): string {
  return labelFrom(ACTIVITY_TYPE_LABEL, type)
}
