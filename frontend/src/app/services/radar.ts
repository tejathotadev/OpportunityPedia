import { api } from './api'

/**
 * Rate-limit state for the Run Radar action.
 *
 * The scan spends one upstream request per NAICS code against a daily key
 * quota, so the backend rations runs and is the only authority on whether one
 * is allowed. The client renders what it is told rather than keeping its own
 * timer, which would drift and would not survive a change of browser.
 */
export interface RadarStatus {
  canRun: boolean
  /** Server-authored explanation, safe to show verbatim. Null when runnable. */
  reason: string | null
  /** True while a scan is still upstream, which blocks for the same reason a
   * cooldown does but should not be described as one. */
  running: boolean
  lastRunAt: string | null
  lastRunStatus: string | null
  jobsFound: number | null
  /** Notices the last run had not seen before; 0 means nothing changed. */
  newCount: number | null
  runsToday: number
  /** 0 means the daily cap is lifted and only the cooldown applies. */
  runsPerDay: number
  cooldownHours: number
  cooldownMinutes: number
  /** ISO timestamp the next run unlocks; null when there is nothing to wait for. */
  nextRunAt: string | null
}

/** Answer to a queued run: the scan is accepted, not finished. */
export interface RadarRunAccepted {
  accepted: boolean
  /** Fresh limits, already reflecting the scan now in flight. */
  cooldown: RadarStatus
}

export async function getRadarStatus(): Promise<RadarStatus> {
  const { data } = await api.get<RadarStatus>('/radar/status')
  return data
}

/**
 * Queues a scan; it does not wait for one.
 *
 * A scan spends about a minute per NAICS code upstream, longer than proxies
 * between here and the backend will hold a response open, so the server
 * answers 202 as soon as it has reserved the run. Progress and the final
 * counts are read from `/radar/status`, which the cooldown hook polls.
 */
export async function triggerRadarRun(): Promise<RadarRunAccepted> {
  const { data } = await api.post<RadarRunAccepted>('/radar/run')
  return data
}

export interface RadarRunItem {
  externalJobId?: string
  title?: string | null
  boardName?: string | null
  naics?: string | null
}

export interface RadarRunHistoryRow {
  id: number | string
  runNumber: number
  status: string
  boardsRun: number
  jobsFound: number
  newCount: number
  createdAt: string | null
  finishedAt: string | null
  newItems: RadarRunItem[]
}

export interface RadarRunHistory {
  runs: RadarRunHistoryRow[]
  count: number
}

/** `GET /radar/runs` — this customer's durable scan history. */
export async function getRadarRunHistory(): Promise<RadarRunHistory> {
  const { data } = await api.get<RadarRunHistory>('/radar/runs')
  return data
}

/** `GET /admin/users/:id/radar-runs` */
export async function getAdminUserRadarRuns(
  token: string,
  userId: number | string,
): Promise<RadarRunHistory> {
  const { data } = await api.get<RadarRunHistory>(`/admin/users/${userId}/radar-runs`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return data
}
