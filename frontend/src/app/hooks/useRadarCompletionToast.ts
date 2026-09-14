import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { useRadarCooldown } from '@/app/hooks/useRadarCooldown'
import { INVALIDATE_ON_MUTATION, queryKeys } from '@/app/services/queryKeys'
import { toast } from '@/app/store/useToastStore'
import { useUiStore } from '@/app/store/useUiStore'

/**
 * Watches Radar status app-wide so completion toasts still fire if the user
 * leaves Overview while a scan is running. Toast action opens Radar runs.
 */
export function useRadarCompletionToast() {
  const queryClient = useQueryClient()
  const openRadarRuns = useUiStore((state) => state.openRadarRuns)
  const { isRunning, status: radarStatus } = useRadarCooldown()
  const wasRunning = useRef(false)

  useEffect(() => {
    if (wasRunning.current && !isRunning) {
      void (async () => {
        await Promise.all(
          INVALIDATE_ON_MUTATION.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
        )
        void queryClient.invalidateQueries({ queryKey: queryKeys.radarRuns() })
        void queryClient.invalidateQueries({ queryKey: queryKeys.notifications() })

        if (radarStatus?.lastRunStatus === 'failed') {
          toast.error('Radar scan failed', 'No sources answered. Try again in a moment.')
          return
        }

        const added = radarStatus?.newCount ?? 0
        const found = radarStatus?.jobsFound ?? 0
        if (added > 0) {
          toast.success(
            `${added} new ${added === 1 ? 'update' : 'updates'}`,
            'Your Radar run finished. Open Radar runs to review what changed.',
            {
              label: 'View in Radar runs',
              onClick: () => openRadarRuns({ expandLatest: true }),
            },
          )
        } else {
          toast.info(
            'Already up to date',
            found > 0
              ? `Nothing new since the last scan · ${found} tracked`
              : 'No opportunities matched your sources.',
            {
              label: 'View Radar runs',
              onClick: () => openRadarRuns({ expandLatest: true }),
            },
          )
        }
      })()
    }
    wasRunning.current = isRunning
  }, [isRunning, radarStatus, queryClient, openRadarRuns])
}
