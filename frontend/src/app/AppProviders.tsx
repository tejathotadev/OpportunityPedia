import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { RequireUserAuth } from '@/app/components/auth/RequireUserAuth'
import { TooltipProvider } from '@/app/components/common/Tooltip'
import { AppShell } from '@/app/components/layout/AppShell'
import { CurrentUserProvider } from '@/app/providers/CurrentUserProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

/**
 * Everything the product needs and the marketing pages do not. Loaded only
 * when a `/app/*` route is entered. Requires a signed-in customer session.
 */
export default function AppProviders() {
  return (
    <RequireUserAuth>
      <QueryClientProvider client={queryClient}>
        <CurrentUserProvider>
          <TooltipProvider delayDuration={250} skipDelayDuration={300}>
            <AppShell />
          </TooltipProvider>
        </CurrentUserProvider>
      </QueryClientProvider>
    </RequireUserAuth>
  )
}
