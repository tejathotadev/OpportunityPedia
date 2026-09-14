import type { ReactNode } from 'react'

import { TemperatureMark } from '@/app/components/badges/TemperatureBadge'
import { OpportunityTypeBadge, OutreachStatusBadge } from '@/app/components/badges/StatusBadges'
import { AssignCell } from '@/app/components/common/AssignCell'
import { Tooltip } from '@/app/components/common/Tooltip'
import { DataTable, type DataTableColumn } from '@/app/components/tables/DataTable'
import { opportunityDisplayType, TEMPERATURE_META } from '@/app/constants/opportunity'
import { useCurrentUser } from '@/app/providers/currentUserContext'
import type { Opportunity, SortState, User } from '@/app/types'
import { cn } from '@/shared/cn'
import { formatDate, formatDayMonth, formatRelative, getDeadlineUrgency } from '@/app/utils/date'
import { getNextAction, type OpportunitySortKey } from '@/app/utils/opportunity'

export type OpportunityColumnKey =
  | 'title'
  | 'type'
  | 'temperature'
  | 'detectedAt'
  | 'deadline'
  | 'assignedToName'
  | 'outreachStatus'
  | 'lastContactedAt'
  | 'assignedAt'
  | 'nextAction'

const DEFAULT_COLUMNS: OpportunityColumnKey[] = [
  'title',
  'type',
  'detectedAt',
  'deadline',
  'outreachStatus',
  'assignedToName',
]

interface OpportunityTableProps {
  rows: Opportunity[]
  onRowClick: (opportunity: Opportunity) => void
  onAssign?: (opportunity: Opportunity, assignee: User) => void
  sort?: SortState<OpportunitySortKey>
  onSortChange?: (sort: SortState<OpportunitySortKey>) => void
  columns?: OpportunityColumnKey[]
  isLoading?: boolean
  isError?: boolean
  /** Opportunity id currently being assigned — only that row shows a spinner. */
  assigningId?: string | null
  onRetry?: () => void
  emptyState?: ReactNode
  activeRowKey?: string | null
  currentUserId: string
}

function DeadlineCell({ opportunity }: { opportunity: Opportunity }) {
  const urgency = getDeadlineUrgency(opportunity.deadline)
  if (!urgency) return <span className="text-ink-subtle">—</span>
  return (
    <span className="block whitespace-nowrap">
      <span className="nums block text-[13px] text-ink">{formatDayMonth(opportunity.deadline)}</span>
      <span className={cn('nums block text-[12px]', urgency.className)}>{urgency.label}</span>
    </span>
  )
}

export function OpportunityTable({
  rows,
  onRowClick,
  onAssign,
  sort,
  onSortChange,
  columns = DEFAULT_COLUMNS,
  isLoading,
  isError,
  assigningId,
  onRetry,
  emptyState,
  activeRowKey,
  currentUserId,
}: OpportunityTableProps) {
  const { team } = useCurrentUser()

  const definitions: Record<OpportunityColumnKey, DataTableColumn<Opportunity, OpportunitySortKey>> =
    {
      title: {
        key: 'title',
        header: 'Opportunity',
        sortable: true,
        width: 'w-[34%]',
        cellClassName: 'pl-5',
        render: (row) => (
          <Tooltip content={row.title}>
            <span className="block truncate text-[13.5px] font-medium text-ink">{row.title}</span>
          </Tooltip>
        ),
      },
      type: {
        key: 'type',
        header: 'Type',
        sortable: true,
        hideBelow: 'lg',
        width: 'w-[140px]',
        render: (row) => (
          <OpportunityTypeBadge type={row.type} noticeType={row.noticeType} />
        ),
      },
      temperature: {
        key: 'temperature',
        header: 'Temperature',
        sortable: true,
        width: 'w-[100px]',
        render: (row) => <TemperatureMark temperature={row.temperature} />,
      },
      detectedAt: {
        key: 'detectedAt',
        header: 'Detected',
        sortable: true,
        hideBelow: 'xl',
        width: 'w-[92px]',
        render: (row) => (
          <Tooltip content={formatDate(row.detectedAt)}>
            <span className="nums whitespace-nowrap text-[13px]">
              {formatRelative(row.detectedAt)}
            </span>
          </Tooltip>
        ),
      },
      deadline: {
        key: 'deadline',
        header: 'Deadline',
        sortable: true,
        hideBelow: 'lg',
        width: 'w-[96px]',
        render: (row) => <DeadlineCell opportunity={row} />,
      },
      assignedToName: {
        key: 'assignedToName',
        header: 'Assign',
        sortable: true,
        width: 'w-[148px]',
        cellClassName: 'pr-5',
        render: (row) =>
          onAssign ? (
            <AssignCell
              assignedToId={row.assignedToId}
              assignedToName={row.assignedToName}
              currentUserId={currentUserId}
              team={team}
              isAssigning={assigningId === row.id}
              onAssign={(assignee) => onAssign(row, assignee)}
            />
          ) : (
            <AssignCell
              assignedToId={row.assignedToId}
              assignedToName={row.assignedToName}
              currentUserId={currentUserId}
              team={team}
              onAssign={() => undefined}
            />
          ),
      },
      outreachStatus: {
        key: 'outreachStatus',
        header: 'Outreach',
        sortable: true,
        hideBelow: 'md',
        width: 'w-[120px]',
        render: (row) => (
          <Tooltip
            enabled={Boolean(row.lastContactedAt)}
            content={
              row.lastContactedAt
                ? `${row.lastContactedByName} · ${formatDate(row.lastContactedAt)}`
                : ''
            }
          >
            <span>
              <OutreachStatusBadge status={row.outreachStatus} />
            </span>
          </Tooltip>
        ),
      },
      lastContactedAt: {
        key: 'lastContactedAt',
        header: 'Last contact',
        sortable: true,
        hideBelow: 'lg',
        width: 'w-[96px]',
        render: (row) =>
          row.lastContactedAt ? (
            <Tooltip content={`${row.lastContactedByName} · ${formatDate(row.lastContactedAt)}`}>
              <span className="nums whitespace-nowrap text-[13px]">
                {formatRelative(row.lastContactedAt)}
              </span>
            </Tooltip>
          ) : (
            <span className="text-ink-subtle">—</span>
          ),
      },
      assignedAt: {
        key: 'assignedAt' as OpportunitySortKey,
        header: 'Assigned',
        hideBelow: 'xl',
        width: 'w-[92px]',
        render: (row) =>
          row.assignedAt ? (
            <Tooltip content={formatDate(row.assignedAt)}>
              <span className="nums whitespace-nowrap text-[13px]">
                {formatRelative(row.assignedAt)}
              </span>
            </Tooltip>
          ) : (
            <span className="text-ink-subtle">—</span>
          ),
      },
      nextAction: {
        key: 'nextAction' as OpportunitySortKey,
        header: 'Next action',
        hideBelow: 'lg',
        width: 'w-[128px]',
        render: (row) => {
          const action = getNextAction(row)
          return (
            <span
              className={cn(
                'block truncate text-[13px]',
                action.urgent ? 'font-medium text-hot-strong' : 'text-ink-secondary',
              )}
            >
              {action.label}
            </span>
          )
        },
      },
    }

  return (
    <DataTable<Opportunity, OpportunitySortKey>
      columns={columns.map((key) => definitions[key])}
      rows={rows}
      rowKey={(row) => row.id}
      onRowClick={onRowClick}
      rowRail={(row) =>
        row.temperature === 'very_hot' ? TEMPERATURE_META.very_hot.rail : undefined
      }
      activeRowKey={activeRowKey}
      sort={sort}
      onSortChange={onSortChange}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      emptyState={emptyState}
      renderMobileCard={(row) => (
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 truncate text-[13.5px] leading-snug font-medium text-ink">
              {row.title}
            </p>
            <OutreachStatusBadge status={row.outreachStatus} />
          </div>
          <p className="text-[12.5px] text-ink-muted">{opportunityDisplayType(row)}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-[12px] text-ink-muted">
            {row.deadline && (
              <span className={cn('nums', getDeadlineUrgency(row.deadline)?.className)}>
                {getDeadlineUrgency(row.deadline)?.label}
              </span>
            )}
          </div>
          {onAssign && (
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
          )}
        </div>
      )}
    />
  )
}
