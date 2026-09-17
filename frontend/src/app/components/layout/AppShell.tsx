import * as Primitive from '@radix-ui/react-dialog'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router-dom'

import { Skeleton } from '@/app/components/feedback/States'
import { AppFooter } from '@/app/components/layout/AppFooter'
import { Tooltip } from '@/app/components/common/Tooltip'
import { GlobalSearch } from '@/app/components/navigation/GlobalSearch'
import { Sidebar } from '@/app/components/navigation/Sidebar'
import { Topbar } from '@/app/components/navigation/Topbar'
import { RadarRunsDrawer } from '@/app/features/radar/RadarRunsDrawer'
import { SupportDrawer } from '@/app/features/support/SupportDrawer'
import { useRadarCompletionToast } from '@/app/hooks/useRadarCompletionToast'
import { useUiStore } from '@/app/store/useUiStore'
import { cn } from '@/shared/cn'

/** Shown for the moment a lazily loaded route chunk is in flight. */
function RouteFallback() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-80" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export function AppShell() {
  const collapsed = useUiStore((state) => state.sidebarCollapsed)
  const toggleSidebar = useUiStore((state) => state.toggleSidebar)
  const mobileNavOpen = useUiStore((state) => state.mobileNavOpen)
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen)
  const setSearchOpen = useUiStore((state) => state.setSearchOpen)
  useRadarCompletionToast()

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [setSearchOpen])

  return (
    <div className="op-app flex h-dvh overflow-hidden bg-canvas">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[70] focus:rounded-md focus:bg-forest-900 focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden border-r border-line transition-[width] duration-200 lg:block',
          collapsed ? 'w-[68px]' : 'w-[236px]',
        )}
      >
        <Sidebar collapsed={collapsed} />
      </aside>

      {/* Circular collapse control sits on the sidebar / header seam. */}
      <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="right">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'fixed top-14 z-40 hidden size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center',
            'rounded-full border border-line bg-surface text-ink-secondary shadow-sm',
            'transition-[left,colors] duration-200 hover:bg-surface-sunken hover:text-ink',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-600',
            'lg:inline-flex',
            collapsed ? 'left-[68px]' : 'left-[236px]',
          )}
        >
          {collapsed ? (
            <ChevronRight className="size-3.5" aria-hidden />
          ) : (
            <ChevronLeft className="size-3.5" aria-hidden />
          )}
        </button>
      </Tooltip>

      <Primitive.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <Primitive.Portal>
          <Primitive.Overlay className="ox-anim-overlay fixed inset-0 z-40 bg-forest-950/35 lg:hidden" />
          <Primitive.Content className="ox-anim-drawer fixed inset-y-0 left-0 z-50 w-[268px] border-r border-line bg-surface shadow-overlay lg:hidden">
            <Primitive.Title className="sr-only">Navigation</Primitive.Title>
            <Primitive.Close
              aria-label="Close navigation"
              className="absolute top-3 right-3 inline-flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken hover:text-ink"
            >
              <X className="size-[18px]" />
            </Primitive.Close>
            <Sidebar
              collapsed={false}
              variant="mobile"
              onNavigate={() => setMobileNavOpen(false)}
            />
          </Primitive.Content>
        </Primitive.Portal>
      </Primitive.Root>

      <div
        className={cn(
          'flex h-dvh min-w-0 flex-1 flex-col overflow-hidden transition-[padding] duration-200',
          collapsed ? 'lg:pl-[68px]' : 'lg:pl-[236px]',
        )}
      >
        <Topbar />
        <main
          id="main-content"
          className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6 lg:px-8"
        >
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
        <AppFooter />
      </div>

      <GlobalSearch />
      <RadarRunsDrawer />
      <SupportDrawer />
    </div>
  )
}
