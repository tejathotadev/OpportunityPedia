import { Building2, Send } from 'lucide-react'
import type { ReactNode } from 'react'

import { TemperatureMark } from '@/app/components/badges/TemperatureBadge'
import { Button } from '@/app/components/common/Button'
import { DataTable, type DataTableColumn } from '@/app/components/tables/DataTable'
import type { CompanySortKey } from '@/app/services/opportunities'
import type { OpportunityCompanyRow, OpportunityTemperature, SortState } from '@/app/types'
import { formatDate, formatRelative } from '@/app/utils/date'

interface CompanyOpportunityTableProps {
  rows: OpportunityCompanyRow[]
  onSendOutreach: (row: OpportunityCompanyRow) => void
  sort?: SortState<CompanySortKey>
  onSortChange?: (sort: SortState<CompanySortKey>) => void
  isLoading?: boolean
  isError?: boolean
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
  onSendOutreach,
  sort,
  onSortChange,
  isLoading,
  isError,
  onRetry,
  emptyState,
}: CompanyOpportunityTableProps) {
  const columns: DataTableColumn<OpportunityCompanyRow, CompanySortKey>[] = [
    {
      key: 'companyName',
      header: 'Company',
      sortable: true,
      width: 'w-[36%]',
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
      key: 'actions',
      header: '',
      align: 'right',
      cellClassName: 'pr-5',
      render: (row) => (
        <Button
          type="button"
          variant="primary"
          size="sm"
          iconLeft={<Send />}
          onClick={(event) => {
            event.stopPropagation()
            onSendOutreach(row)
          }}
        >
          Send Outreach
        </Button>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(row) => row.companyId}
      onRowClick={onSendOutreach}
      sort={sort}
      onSortChange={onSortChange}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      emptyState={emptyState}
      renderMobileCard={(row) => (
        <button
          type="button"
          onClick={() => onSendOutreach(row)}
          className="flex w-full items-start gap-3 px-4 py-3 text-left"
        >
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-sunken text-ink-muted">
            <Building2 className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-medium text-ink">
              {row.companyName}
            </span>
            <span className="mt-0.5 block truncate text-[12px] text-ink-muted">
              {opportunityCountLabel(row.matchingCount)}
              {row.teamBreakdown?.[0] ? ` · ${row.teamBreakdown[0].name}` : ''}
            </span>
          </span>
          <TemperatureMark temperature={row.highestTemperature} />
        </button>
      )}
    />
  )
}
