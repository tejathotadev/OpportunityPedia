import { Building2 } from 'lucide-react'

import { EmptyState } from '@/app/components/feedback/States'
import { PageHeader } from '@/app/components/layout/PageHeader'
import { Panel } from '@/app/components/layout/Panel'

/**
 * Placeholder for partnership-ready vendors.
 *
 * Commercial employers and government notices live on Opportunities. This
 * page will list vendors that are ready to partner once that dataset lands.
 */
export function VendorsPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Vendors"
        subtitle="Partners ready for collaboration — arriving in a later update."
      />

      <Panel>
        <EmptyState
          icon={<Building2 />}
          title="Coming soon"
          description="We’ll show vendors that are ready to partner once that data is in place. For now, browse commercial companies and government opportunities on the Opportunities page."
        />
      </Panel>
    </div>
  )
}
