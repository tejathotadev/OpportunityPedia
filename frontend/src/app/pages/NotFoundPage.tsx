import { useNavigate } from 'react-router-dom'

import { Button } from '@/app/components/common/Button'
import { Panel } from '@/app/components/layout/Panel'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <Panel className="mx-auto max-w-md text-center">
      <p className="text-[13px] font-medium text-ink-muted">Page not found</p>
      <h1 className="mt-1 text-[20px] font-semibold text-ink">
        This page doesn’t exist in Opportunity Pedia.
      </h1>
      <p className="mt-2 text-[13.5px] text-ink-muted">
        The link may be out of date, or the opportunity may have been removed.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Go back
        </Button>
        <Button variant="primary" onClick={() => navigate('/app/overview')}>
          Go to Overview
        </Button>
      </div>
    </Panel>
  )
}
