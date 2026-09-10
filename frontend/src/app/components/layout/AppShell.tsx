import * as Primitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Suspense, useEffect } from 'react'
import { Outlet } from 'react-router-dom'

import { Skeleton } from '@/app/components/feedback/States'
import { GlobalSearch } from '@/app/components/navigation/GlobalSearch'
import { Sidebar } from '@/app/components/navigation/Sidebar'
import { Topbar } from '@/app/components/navigation/Topbar'
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
  const mobileNavOpen = useUiStore((state) => state.mobileNavOpen)
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen)
  const setSearchOpen = useUiStore((state) => state.setSearchOpen)

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
    <div className="op-app flex min-h-dvh bg-canvas">
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
          'flex min-w-0 flex-1 flex-col transition-[padding] duration-200',
          collapsed ? 'lg:pl-[68px]' : 'lg:pl-[236px]',
        )}
      >
        <Topbar />
        <main id="main-content" className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <GlobalSearch />
    </div>
  )
}
