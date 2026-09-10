import { useNavigate, useParams } from 'react-router-dom'

import { OpportunityDrawer } from './OpportunityDrawer'

/**
 * Renders the detail panel for `/app/opportunities/:id`. Because the route is
 * nested under the list, the table stays mounted behind the panel and a direct
 * link still opens the opportunity on its own.
 */
export function OpportunityRouteDrawer() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <OpportunityDrawer
      opportunityId={id ?? null}
      open={Boolean(id)}
      onClose={() => navigate({ pathname: '/app/opportunities', search: window.location.search })}
    />
  )
}
