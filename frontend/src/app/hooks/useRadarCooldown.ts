import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { queryKeys } from '@/app/services/queryKeys'
import { getRadarStatus, type RadarStatus } from '@/app/services/radar'

function formatCountdown(ms: number): string {
  const total = Math.ceil(ms / 1000)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${hours}:${pad(minutes)}:${pad(seconds)}`
}

/** How often to ask whether a queued scan has finished. */
const SCAN_POLL_MS = 4000

/**
 * Rate-limit state for Run Radar, owned by the backend.
 *
 * The server enforces both a cooldown between runs and a daily cap, and it
 * answers 429 either way, so this hook only mirrors that state and counts down
 * to `nextRunAt`. It ticks once a second while a wait is active and stops when
 * the window closes, so an idle dashboard does no work.
 *
 * When the status is unknown — still loading, or the backend is unreachable —
 * the action stays enabled on purpose. Disabling it would leave no way to even
 * attempt a run, and the server rejects anything genuinely too early anyway.
 */
export function useRadarCooldown() {
  const queryClient = useQueryClient()
  const status = useQuery({
    queryKey: queryKeys.radarStatus(),
    queryFn: getRadarStatus,
    // The window closes on a wall clock, so a stale cache is worse than a call.
    staleTime: 30_000,
    // A run is queued server-side and has nothing to push its result back, so
    // it is polled while in flight and left alone the rest of the time.
    refetchInterval: (query) => (query.state.data?.running ? SCAN_POLL_MS : false),
  })

  const nextRunAt = status.data?.nextRunAt ?? null
  const [remainingMs, setRemainingMs] = useState(0)

  useEffect(() => {
    const read = () =>
      nextRunAt ? Math.max(0, new Date(nextRunAt).getTime() - Date.now()) : 0

    setRemainingMs(read())
    if (!nextRunAt) return

    const id = window.setInterval(() => {
      const next = read()
      setRemainingMs(next)
      if (next === 0) {
        window.clearInterval(id)
        // The countdown reaching zero only means the clock ran out; the daily
        // cap may still apply, so let the server say whether it can run now.
        void queryClient.invalidateQueries({ queryKey: queryKeys.radarStatus() })
      }
    }, 1000)

    return () => window.clearInterval(id)
  }, [nextRunAt, queryClient])

  /** Seeds the cache from a run response, avoiding a redundant status call. */
  const applyStatus = (next: RadarStatus) => {
    queryClient.setQueryData(queryKeys.radarStatus(), next)
  }

  const refreshStatus = () =>
    queryClient.fetchQuery({
      queryKey: queryKeys.radarStatus(),
      queryFn: getRadarStatus,
    })

  return {
    /** False whenever the limits are unknown, so the attempt is never blocked. */
    isCoolingDown: status.data ? !status.data.canRun : false,
    /** Server-authored copy explaining the block, e.g. the daily cap. */
    reason: status.data?.reason ?? null,
    /** A scan this client did not start, e.g. one launched in another tab. */
    isRunning: status.data?.running ?? false,
    remainingMs,
    countdown: formatCountdown(remainingMs),
    /** Present only while there is a timed wait; a daily cap has no countdown. */
    hasCountdown: remainingMs > 0,
    status: status.data,
    applyStatus,
    refreshStatus,
  }
}
