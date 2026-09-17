import { CheckCircle2, TrendingUp } from 'lucide-react'

import { TemperatureMark } from '@/app/components/badges/TemperatureBadge'
import { AssignCell } from '@/app/components/common/AssignCell'
import { TruncatedText } from '@/app/components/common/TruncatedText'
import { EmptyState } from '@/app/components/feedback/States'
import { DataTable, type DataTableColumn } from '@/app/components/tables/DataTable'
import { TEMPERATURE_META } from '@/app/constants/opportunity'
import { useCurrentUser } from '@/app/providers/currentUserContext'
import type { AttentionRow, Opportunity, User } from '@/app/types'
import { cn } from '@/shared/cn'
import { formatDate, formatDayMonth, formatRelative, getDeadlineUrgency } from '@/app/utils/date'
import { getAttentionReason } from '@/app/utils/opportunity'

interface NeedsAttentionTableProps {
  rows: AttentionRow[]
  currentUserId: string
  isLoading?: boolean
  isError?: boolean
  /** Opportunity id currently being assigned — only that row shows a spinner. */
  assigningId?: string | null
  onRetry?: () => void
  onOpen: (opportunity: Opportunity) => void
  onAssign: (opportunity: Opportunity, assignee: User) => void
}

const REASON_TONE = {
  critical: 'text-veryhot-strong',
  warning: 'text-hot-strong',
  neutral: 'text-ink-muted',
} as const

const isCompany = (row: AttentionRow) => row.kind === 'company'

/** "12 openings" reads as a count; the plural has to follow it. */
function signalLabel(count = 0): string {
  return `${count} ${count === 1 ? 'opening' : 'openings'}`
}

export function NeedsAttentionTable({
  rows,
  currentUserId,
  isLoading,
  isError,
  assigningId,
  onRetry,
  onOpen,
  onAssign,
}: NeedsAttentionTableProps) {
  const { team } = useCurrentUser()

  const columns: DataTableColumn<AttentionRow>[] = [
    {
      key: 'title',
      header: 'Opportunity',
      cellClassName: 'pl-5',
      render: (row) =>
        isCompany(row) ? (
          <TruncatedText
            text={row.companyName}
            className="text-[13.5px] font-medium text-ink"
            subtitle={
              <span className="block truncate text-[12px] text-ink-muted">
                {signalLabel(row.signalCount)}
              </span>
            }
          />
        ) : (
          <TruncatedText
            text={row.title}
            className="text-[13.5px] font-medium text-ink"
          />
        ),
    },
    {
      key: 'signal',
      header: 'Signal',
      width: 'w-[8.25rem]',
      render: (row) => {
        if (isCompany(row)) {
          if (row.surge) {
            return (
              <span className="inline-flex items-center gap-1 text-[13px] font-medium whitespace-nowrap text-veryhot-strong">
                <TrendingUp className="size-3.5" aria-hidden />
                Opening surge
              </span>
            )
          }
          return (
            <span className="text-[13px] font-medium whitespace-nowrap text-ink-muted">
              {row.newRoles ? `${row.newRoles} new in 14d` : 'Steady openings'}
            </span>
          )
        }
        const reason = getAttentionReason(row, currentUserId)
        if (!reason) return <span className="text-ink-subtle">—</span>
        return (
          <span
            className={cn('text-[13px] font-medium whitespace-nowrap', REASON_TONE[reason.tone])}
          >
            {reason.label}
          </span>
        )
      },
    },
    {
      key: 'temperature',
      header: 'Priority',
      width: 'w-[6.5rem]',
      render: (row) => <TemperatureMark temperature={row.temperature} />,
    },
    {
      key: 'detectedAt',
      header: 'Detected',
      hideBelow: 'xl',
      width: 'w-[7rem]',
      render: (row) => (
        <span className="nums text-[13px] whitespace-nowrap" title={formatDate(row.detectedAt)}>
          {formatRelative(row.detectedAt)}
        </span>
      ),
    },
    {
      key: 'deadline',
      header: 'Deadline',
      hideBelow: 'lg',
      width: 'w-[6.5rem]',
      render: (row) => {
        const urgency = getDeadlineUrgency(row.deadline)
        if (!urgency) return <span className="text-ink-subtle">—</span>
        return (
          <span className="block whitespace-nowrap">
            <span className="nums block text-[13px] text-ink">{formatDayMonth(row.deadline)}</span>
            <span className={cn('nums block text-[12px]', urgency.className)}>{urgency.label}</span>
          </span>
        )
      },
    },
    {
      key: 'assign',
      header: 'Assign',
      hideBelow: 'md',
      width: 'w-[8.5rem]',
      cellClassName: 'pr-5',
      render: (row) => (
        <AssignCell
          assignedToId={row.assignedToId}
          assignedToName={row.assignedToName}
          currentUserId={currentUserId}
          team={team}
          isAssigning={assigningId === row.id}
          onAssign={(assignee) => onAssign(row, assignee)}
        />
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      onRowClick={(row) => onOpen(row)}
      rowRail={(row) =>
        row.temperature === 'very_hot' ? TEMPERATURE_META.very_hot.rail : undefined
      }
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      stickyHeader={false}
      skeletonRows={5}
      emptyState={
        <EmptyState
          compact
          icon={<CheckCircle2 />}
          title="Nothing needs attention right now"
          description="Every Very Hot opportunity has an owner and no deadlines are close."
        />
      }
      renderMobileCard={(row) => {
        const company = isCompany(row)
        const reason = company ? null : getAttentionReason(row, currentUserId)
        return (
          <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-3">
              <TruncatedText
                as="p"
                text={company ? row.companyName : row.title}
                className="min-w-0 text-[13.5px] leading-snug font-medium text-ink"
              />
              <TemperatureMark temperature={row.temperature} />
            </div>
            {company ? (
              <p
                className={cn(
                  'text-[12.5px] font-medium',
                  row.surge ? 'text-veryhot-strong' : 'text-ink-muted',
                )}
              >
                {signalLabel(row.signalCount)}
                {row.surge ? ' · Opening surge' : ''}
              </p>
            ) : (
              reason && (
                <p className={cn('text-[12.5px] font-medium', REASON_TONE[reason.tone])}>
                  {reason.label}
                </p>
              )
            )}
            <div className="pt-0.5">
              <AssignCell
                assignedToId={row.assignedToId}
                assignedToName={row.assignedToName}
                currentUserId={currentUserId}
                team={team}
                isAssigning={assigningId === row.id}
                onAssign={(assignee) => onAssign(row, assignee)}
              />
            </div>
          </div>
        )
      }}
    />
  )
}
