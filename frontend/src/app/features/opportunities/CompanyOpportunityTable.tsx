import { Building2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { TemperatureMark } from '@/app/components/badges/TemperatureBadge'
import { OutreachStatusBadge } from '@/app/components/badges/StatusBadges'
import { AssignCell } from '@/app/components/common/AssignCell'
import { Tooltip } from '@/app/components/common/Tooltip'
import { DataTable, type DataTableColumn } from '@/app/components/tables/DataTable'
import { useCurrentUser } from '@/app/providers/currentUserContext'
import type { CompanySortKey } from '@/app/services/opportunities'
import type { OpportunityCompanyRow, OpportunityTemperature, SortState, User } from '@/app/types'
import { formatDate, formatRelative } from '@/app/utils/date'

interface CompanyOpportunityTableProps {
  rows: OpportunityCompanyRow[]
  currentUserId: string
  onRowClick: (row: OpportunityCompanyRow) => void
  onAssign: (row: OpportunityCompanyRow, assignee: User) => void
  sort?: SortState<CompanySortKey>
  onSortChange?: (sort: SortState<CompanySortKey>) => void
  isLoading?: boolean
  isError?: boolean
  /** `company:{id}` currently being assigned — only that row shows a spinner. */
  assigningId?: string | null
  onRetry?: () => void
  emptyState?: ReactNode
}

function opportunityCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'opening' : 'openings'}`
}

function teamSummary(row: OpportunityCompanyRow): string {
  const teams = row.teamBreakdown ?? []
  if (!teams.length) return opportunityCountLabel(row.matchingCount)
  return teams
    .slice(0, 3)
    .map((t) => `${t.name} (${t.count})`)
    .join(' · ')
}

export function CompanyOpportunityTable({
  rows,
  currentUserId,
  onRowClick,
  onAssign,
  sort,
  onSortChange,
  isLoading,
  isError,
  assigningId,
  onRetry,
  emptyState,
}: CompanyOpportunityTableProps) {
  const { team } = useCurrentUser()

  const columns: DataTableColumn<OpportunityCompanyRow, CompanySortKey>[] = [
    {
      key: 'companyName',
      header: 'Company',
      sortable: true,
      width: 'w-[32%]',
      cellClassName: 'pl-5',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-medium text-ink">{row.companyName}</p>
          <p className="mt-0.5 truncate text-[12px] text-ink-muted">{teamSummary(row)}</p>
        </div>
      ),
    },
    {
      key: 'matchingCount',
      header: 'Openings',
      sortable: true,
      render: (row) => (
        <span className="nums text-[13px] font-medium text-ink">{row.matchingCount}</span>
      ),
    },
    {
      key: 'temperature',
      header: 'Priority',
      render: (row) => {
        const temp = row.highestTemperature as OpportunityTemperature
        return <TemperatureMark temperature={temp} />
      },
    },
    {
      key: 'lastDetectedAt',
      header: 'Last detected',
      sortable: true,
      hideBelow: 'md',
      render: (row) =>
        row.lastDetectedAt ? (
          <span className="nums text-[13px] whitespace-nowrap" title={formatDate(row.lastDetectedAt)}>
            {formatRelative(row.lastDetectedAt)}
          </span>
        ) : (
          <span className="text-ink-subtle">—</span>
        ),
    },
    {
      key: 'outreachStatus',
      header: 'Outreach',
      hideBelow: 'md',
      width: 'w-[120px]',
      render: (row) => (
        <Tooltip
          enabled={Boolean(row.lastContactedAt)}
          content={
            row.lastContactedAt
              ? `${row.lastContactedByName ?? 'Team'} · ${formatDate(row.lastContactedAt)}`
              : ''
          }
        >
          <span>
            <OutreachStatusBadge status={row.outreachStatus ?? 'not_contacted'} />
          </span>
        </Tooltip>
      ),
    },
    {
      key: 'assignedToName',
      header: 'Assign',
      width: 'w-[148px]',
      cellClassName: 'pr-5',
      render: (row) => (
        <AssignCell
          assignedToId={row.assignedToId}
          assignedToName={row.assignedToName}
          currentUserId={currentUserId}
          team={team}
          isAssigning={assigningId === `company:${row.companyId}`}
          onAssign={(assignee) => onAssign(row, assignee)}
        />
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.companyId}
      onRowClick={onRowClick}
      sort={sort}
      onSortChange={onSortChange}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      emptyState={emptyState}
      renderMobileCard={(row) => (
        <button
          type="button"
          onClick={() => onRowClick(row)}
          className="flex w-full items-start gap-3 px-4 py-3 text-left"
        >
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-ink-muted">
            <Building2 className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 space-y-1.5">
            <span className="block truncate text-[13.5px] font-medium text-ink">
              {row.companyName}
            </span>
            <span className="block truncate text-[12px] text-ink-muted">
              {opportunityCountLabel(row.matchingCount)}
              {row.teamBreakdown?.[0] ? ` · ${row.teamBreakdown[0].name}` : ''}
            </span>
            <span className="flex flex-wrap items-center gap-3">
              <OutreachStatusBadge status={row.outreachStatus ?? 'not_contacted'} />
              <span
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
                role="presentation"
              >
                <AssignCell
                  assignedToId={row.assignedToId}
                  assignedToName={row.assignedToName}
                  currentUserId={currentUserId}
                  team={team}
                  isAssigning={assigningId === `company:${row.companyId}`}
                  onAssign={(assignee) => onAssign(row, assignee)}
                />
              </span>
            </span>
          </span>
          <TemperatureMark temperature={row.highestTemperature} />
        </button>
      )}
    />
  )
}
