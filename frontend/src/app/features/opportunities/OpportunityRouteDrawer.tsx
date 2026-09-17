import { useLocation, useNavigate, useParams } from 'react-router-dom'

import { OpportunityDrawer } from './OpportunityDrawer'

/**
 * Detail panel for `/app/opportunities/:id` and `/app/vendors/:id`.
 * Nested under the list so the table stays mounted behind the panel.
 */
export function OpportunityRouteDrawer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const listPath = location.pathname.startsWith('/app/vendors')
    ? '/app/vendors'
    : '/app/opportunities'

  return (
    <OpportunityDrawer
      opportunityId={id ?? null}
      open={Boolean(id)}
      onClose={() => navigate({ pathname: listPath, search: window.location.search })}
    />
  )
}
