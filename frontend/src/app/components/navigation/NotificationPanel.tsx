import * as Popover from '@radix-ui/react-popover'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CalendarClock, Flame, UserCheck, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { ListSkeleton } from '@/app/components/feedback/States'
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '@/app/services/notifications'
import type { AppNotification } from '@/app/types'
import { cn } from '@/shared/cn'
import { formatDateTimeFull, formatRelative } from '@/app/utils/date'

const ICONS: Record<AppNotification['type'], typeof Bell> = {
  very_hot: Flame,
  assignment: UserCheck,
  deadline: CalendarClock,
  team: Users,
  system: Bell,
}

const ICON_TONE: Record<AppNotification['type'], string> = {
  very_hot: 'text-veryhot bg-veryhot-soft border-veryhot-line',
  assignment: 'text-signal-700 bg-signal-50 border-signal-100',
  deadline: 'text-hot-strong bg-hot-soft border-hot-line',
  team: 'text-forest-700 bg-forest-50 border-forest-100',
  system: 'text-ink-muted bg-surface-sunken border-line',
}

export function NotificationPanel() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  })

  const readOne = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const readAll = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const unread = data?.filter((item) => !item.read).length ?? 0

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
          className="relative inline-flex size-9 items-center justify-center rounded-md text-ink-secondary transition-colors hover:bg-surface-sunken hover:text-ink"
        >
          <Bell className="size-[18px]" aria-hidden />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 inline-flex size-2 rounded-full bg-veryhot ring-2 ring-surface" />
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="ox-anim-pop z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-lg border border-line bg-surface shadow-overlay"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <h2 className="text-[14px] font-semibold text-ink">Notifications</h2>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => readAll.mutate()}
                className="text-[12.5px] font-medium text-signal-700 hover:text-signal-800"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="scrollbar-thin max-h-[380px] overflow-y-auto">
            {isLoading ? (
              <ListSkeleton rows={4} />
            ) : !data || data.length === 0 ? (
              <p className="px-4 py-10 text-center text-[13px] text-ink-muted">
                You’re all caught up.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {data.map((item) => {
                  const Icon = ICONS[item.type]
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          if (!item.read) readOne.mutate(item.id)
                          if (item.opportunityId) navigate(`/app/opportunities/${item.opportunityId}`)
                        }}
                        className={cn(
                          'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-muted',
                          !item.read && 'bg-signal-50/40',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md border',
                            ICON_TONE[item.type],
                          )}
                        >
                          <Icon className="size-3.5" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-medium text-ink">
                            {item.title}
                          </span>
                          <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-muted">
                            {item.description}
                          </span>
                          <span
                            className="mt-1 block text-[11.5px] text-ink-subtle"
                            title={formatDateTimeFull(item.createdAt)}
                          >
                            {formatRelative(item.createdAt)}
                          </span>
                        </span>
                        {!item.read && (
                          <span
                            aria-label="Unread"
                            className="mt-1.5 size-1.5 shrink-0 rounded-full bg-signal-600"
                          />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
