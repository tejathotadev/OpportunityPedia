/* ---------------------------------------------------------------- *
 * THE PROBLEM
 * ---------------------------------------------------------------- */
export const problemFacets = [
  {
    title: 'Too many sources',
    body: 'Important information exists across disconnected systems.',
  },
  {
    title: 'Too much noise',
    body: 'Not every signal represents an actual opportunity.',
  },
  {
    title: 'Too little context',
    body: 'Raw information rarely tells teams what matters now.',
  },
  {
    title: 'Timing matters',
    body: 'Discovering an opportunity late can make it irrelevant.',
  },
] as const;

/* ---------------------------------------------------------------- *
 * OUR APPROACH
 * ---------------------------------------------------------------- */
export const approachPillars = [
  {
    index: '01',
    title: 'Discover',
    body: 'Bring what matters into one place, so teams stop hunting across disconnected systems.',
  },
  {
    index: '02',
    title: 'Prioritize',
    body: 'Surface the opportunities that need attention first — without drowning in noise.',
  },
  {
    index: '03',
    title: 'Act',
    body: 'Move from finding to doing in one workflow, with ownership and follow-through intact.',
  },
] as const;

/* ---------------------------------------------------------------- *
 * TRANSFORMATION — a single worked example, labelled illustrative.
 * ---------------------------------------------------------------- */
export const transformationStages = [
  {
    index: '01',
    stage: 'Source',
    headline: 'Company career page',
    detail: 'A publicly accessible page is read as one of many approved inputs.',
  },
  {
    index: '02',
    stage: 'Signal',
    headline: '120 new engineering roles',
    detail: 'The raw observation is extracted and structured into a typed signal.',
  },
  {
    index: '03',
    stage: 'Intelligence',
    headline: 'Large technical expansion underway',
    detail: 'The signal is placed in context alongside related activity.',
  },
  {
    index: '04',
    stage: 'Opportunity',
    headline: 'Potential vendor or staffing need',
    detail: 'Context becomes a classified opportunity a team can evaluate.',
  },
  {
    index: '05',
    stage: 'Action',
    headline: 'Assign → Research → Outreach',
    detail: 'The opportunity carries into an owned, tracked workflow.',
  },
] as const;

/* ---------------------------------------------------------------- *
 * SIGNAL CATEGORIES — index/table style, not a rainbow of pills.
 * ---------------------------------------------------------------- */
export const signalCategories = [
  { index: '01', name: 'RFP', meaning: 'Explicit buying intent' },
  { index: '02', name: 'Leadership', meaning: 'Organizational change' },
  { index: '03', name: 'Hiring', meaning: 'Growth and capability signals' },
  { index: '04', name: 'Expansion', meaning: 'New geographic or operational activity' },
  { index: '05', name: 'Procurement', meaning: 'Formal purchasing activity' },
  { index: '06', name: 'Funding', meaning: 'New capacity to invest' },
  { index: '07', name: 'Partnership', meaning: 'Shifting commercial relationships' },
  { index: '08', name: 'Technology Investment', meaning: 'Change in technical direction' },
  { index: '09', name: 'Vendor Requirement', meaning: 'A stated need for a supplier' },
] as const;

/* ---------------------------------------------------------------- *
 * OPPORTUNITYPEDIA CAPABILITIES — each line must match shipped behaviour.
 * ---------------------------------------------------------------- */
export const productCapabilities = [
  {
    index: '01',
    title: 'Government contract notices',
    signal: 'Buying intent',
    body: 'Active U.S. federal contract notices from SAM.gov, scanned for the industry (NAICS) codes your team selects.',
  },
  {
    index: '02',
    title: 'Hiring activity',
    signal: 'Growth',
    body: 'Open roles published on public company career boards, grouped by company so you can see who is actively hiring.',
  },
  {
    index: '03',
    title: 'Prioritized by heat',
    signal: 'Scoring',
    body: 'Every opportunity is placed in a lane: Very Hot for active buying, such as an open government notice, and Hot for hiring activity.',
  },
  {
    index: '04',
    title: 'Evidence attached',
    signal: 'Source',
    body: 'Each opportunity links back to the original posting or notice. Government notices also carry the agency, solicitation number, set-aside, response deadline and published contact.',
  },
  {
    index: '05',
    title: 'Owned and tracked',
    signal: 'Workflow',
    body: 'Assign an owner to each opportunity, work from your own queue, and see a shared activity history so nobody duplicates effort.',
  },
  {
    index: '06',
    title: 'Outreach in context',
    signal: 'Action',
    body: 'Send outreach email from the opportunity itself — through your company’s own mail server if you connect one — with AI-assisted drafts where enabled.',
  },
  {
    index: '07',
    title: 'One team workspace',
    signal: 'Coordination',
    body: 'Invite teammates into a shared workspace and get notified when a scan finds something new.',
  },
] as const;

/* ---------------------------------------------------------------- *
 * OPPORTUNITYPEDIA BENEFITS
 * ---------------------------------------------------------------- */
export const productBenefits = [
  {
    index: '01',
    title: 'Find earlier',
    body: 'See relevant opportunities before a morning of manual research catches them.',
  },
  {
    index: '02',
    title: 'Prioritize faster',
    body: 'Separate what needs attention now from general market noise.',
  },
  {
    index: '03',
    title: 'Coordinate clearly',
    body: 'See ownership and activity before someone duplicates outreach.',
  },
  {
    index: '04',
    title: 'Act immediately',
    body: 'Move from discovery to outreach without losing context.',
  },
] as const;

export const productOutcomes = [
  {
    index: '01',
    title: 'See what needs attention',
    body: 'One queue for the work that matters today — without hunting across disconnected tools.',
  },
  {
    index: '02',
    title: 'Assign before anyone overlaps',
    body: 'A named owner on each opportunity, so two people do not contact the same account.',
  },
  {
    index: '03',
    title: 'Outreach from the same place',
    body: 'Draft, edit and send without leaving the workflow or losing the original context.',
  },
] as const;

/* ---------------------------------------------------------------- *
 * PRODUCT WORKFLOW
 * ---------------------------------------------------------------- */
export const workflowStages = [
  {
    index: '01',
    title: 'Discover',
    body: 'See relevant opportunities in one place instead of a dozen browser tabs.',
  },
  {
    index: '02',
    title: 'Prioritize',
    body: 'Know what needs attention first, so urgent work does not wait.',
  },
  {
    index: '03',
    title: 'Act',
    body: 'Assign, outreach and follow up without losing the original context.',
  },
] as const;

/* ---------------------------------------------------------------- *
 * AUDIENCES
 * ---------------------------------------------------------------- */
export const audiences = [
  {
    role: 'Business Development',
    challenge: 'Hours disappear into researching disconnected resources.',
    help: 'Identify meaningful opportunities before spending a morning on manual research.',
  },
  {
    role: 'Sales',
    challenge: 'Outbound lists rarely say why now is the right moment.',
    help: 'Approach accounts when a signal indicates an active reason to talk.',
  },
  {
    role: 'Growth',
    challenge: 'Market movement is noticed after competitors act on it.',
    help: 'Watch expansion, hiring and funding activity as it is published.',
  },
  {
    role: 'Procurement',
    challenge: 'Vendor and supplier requirements are scattered across portals.',
    help: 'Track requirements and vendor activity in one structured view.',
  },
  {
    role: 'Account Management',
    challenge: 'Change inside existing accounts is easy to miss.',
    help: 'See leadership and investment changes across the accounts you own.',
  },
  {
    role: 'Research',
    challenge: 'Findings live in documents that go stale immediately.',
    help: 'Work from structured signals that retain their source context.',
  },
  {
    role: 'Leadership',
    challenge: 'Pipeline activity is hard to see without asking for a report.',
    help: 'Understand what the team is pursuing and what has stalled.',
  },
  {
    role: 'Vendor Management',
    challenge: 'The vendor ecosystem shifts faster than records are updated.',
    help: 'Follow partnership and vendor requirement signals continuously.',
  },
] as const;

/* ---------------------------------------------------------------- *
 * PHILOSOPHY
 * ---------------------------------------------------------------- */
export const principles = [
  {
    index: '01',
    title: 'Signal over noise',
    body: 'Focus on information that changes decisions.',
  },
  {
    index: '02',
    title: 'Context over volume',
    body: 'A smaller amount of useful intelligence is more valuable than endless records.',
  },
  {
    index: '03',
    title: 'Action over dashboards',
    body: 'Information should lead naturally to the next action.',
  },
  {
    index: '04',
    title: 'Coordination over duplication',
    body: 'Teams should know what has already been done.',
  },
  {
    index: '05',
    title: 'Trust over automation',
    body: 'Automation should never obscure where information came from.',
  },
] as const;

/* ---------------------------------------------------------------- *
 * DATA RESPONSIBILITY — principles only. No certification claims.
 * ---------------------------------------------------------------- */
export const responsibilityPrinciples = [
  {
    index: '01',
    title: 'Source visibility',
    body: 'Where practical, intelligence should retain context about its source.',
  },
  {
    index: '02',
    title: 'Approved sources',
    body: 'Products should rely on appropriately accessible and approved information sources.',
  },
  {
    index: '03',
    title: 'Human control',
    body: 'Users decide what actions to take.',
  },
  {
    index: '04',
    title: 'Security',
    body: 'Sensitive account and organizational data should be treated responsibly.',
  },
] as const;
