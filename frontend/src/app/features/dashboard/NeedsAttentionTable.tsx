import { CheckCircle2, Send, TrendingUp, UserPlus } from 'lucide-react'

import { TemperatureMark } from '@/app/components/badges/TemperatureBadge'
import { OwnerAvatar } from '@/app/components/common/Avatar'
import { Button } from '@/app/components/common/Button'
import { EmptyState } from '@/app/components/feedback/States'
import { DataTable, type DataTableColumn } from '@/app/components/tables/DataTable'
import { TEMPERATURE_META } from '@/app/constants/opportunity'
import type { AttentionRow, Opportunity } from '@/app/types'
import { cn } from '@/shared/cn'
import { formatDate, formatDayMonth, formatRelative, getDeadlineUrgency } from '@/app/utils/date'
import { canSendOutreach, getAttentionReason } from '@/app/utils/opportunity'

interface NeedsAttentionTableProps {
  rows: AttentionRow[]
  currentUserId: string
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  onOpen: (opportunity: Opportunity) => void
  onAssign: (opportunity: Opportunity) => void
  onSendOutreach: (opportunity: Opportunity) => void
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
  onRetry,
  onOpen,
  onAssign,
  onSendOutreach,
}: NeedsAttentionTableProps) {
  const columns: DataTableColumn<AttentionRow>[] = [
    {
      key: 'title',
      header: 'Opportunity',
      width: 'w-[36%]',
      cellClassName: 'pl-5',
      render: (row) =>
        isCompany(row) ? (
          <span className="block min-w-0">
            <span className="block truncate text-[13.5px] font-medium text-ink">
              {row.companyName}
            </span>
            <span className="block truncate text-[12px] text-ink-muted">
              {signalLabel(row.signalCount)}
            </span>
          </span>
        ) : (
          <span className="block truncate text-[13.5px] font-medium text-ink">{row.title}</span>
        ),
    },
    {
      key: 'signal',
      header: 'Signal',
      width: 'w-[148px]',
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
      width: 'w-[100px]',
      render: (row) => <TemperatureMark temperature={row.temperature} />,
    },
    {
      key: 'detectedAt',
      header: 'Detected',
      hideBelow: 'xl',
      width: 'w-[92px]',
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
      width: 'w-[104px]',
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
      key: 'owner',
      header: 'Owner',
      hideBelow: 'md',
      width: 'w-[124px]',
      render: (row) =>
        // An employer is not something a single person owns.
        isCompany(row) ? (
          <span className="text-ink-subtle">—</span>
        ) : (
          <OwnerAvatar name={row.assignedToId === currentUserId ? 'You' : row.assignedToName} />
        ),
    },
    {
      key: 'action',
      header: <span className="sr-only">Action</span>,
      align: 'right',
      width: 'w-[144px]',
      cellClassName: 'pr-5',
      render: (row) => (
        <div
          className="flex justify-end"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          role="presentation"
        >
          {isCompany(row) ? (
            <Button
              size="sm"
              variant="primary"
              iconLeft={<Send />}
              onClick={() => onSendOutreach(row)}
            >
              Send Outreach
            </Button>
          ) : !row.assignedToId ? (
            <Button size="sm" variant="secondary" iconLeft={<UserPlus />} onClick={() => onAssign(row)}>
              Assign to me
            </Button>
          ) : row.assignedToId === currentUserId && row.outreachStatus === 'not_contacted' ? (
            <Button
              size="sm"
              variant="primary"
              iconLeft={<Send />}
              disabled={!canSendOutreach(row)}
              onClick={() => onSendOutreach(row)}
            >
              Send Outreach
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => onOpen(row)}>
              Review
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.id}
      onRowClick={(row) => (isCompany(row) ? onSendOutreach(row) : onOpen(row))}
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
              <p className="min-w-0 truncate text-[13.5px] leading-snug font-medium text-ink">
                {company ? row.companyName : row.title}
              </p>
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
          </div>
        )
      }}
    />
  )
}
