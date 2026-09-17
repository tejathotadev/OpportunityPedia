import { LifeBuoy, Mail, X } from 'lucide-react'

import { Drawer, DrawerClose } from '@/app/components/common/Drawer'
import { SUPPORT_CONTACTS } from '@/app/config/supportContacts'
import { useUiStore } from '@/app/store/useUiStore'

/** In-app Help & Support — global contact list for all users. */
export function SupportDrawer() {
  const open = useUiStore((state) => state.supportOpen)
  const setOpen = useUiStore((state) => state.setSupportOpen)

  return (
    <Drawer
      open={open}
      onOpenChange={setOpen}
      title="Help and Support"
      className="sm:max-w-[min(420px,92vw)]"
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-ink">Help &amp; Support</p>
          <p className="truncate text-[12.5px] text-ink-muted">Reach the OpportunityPedia team</p>
        </div>
        <DrawerClose
          aria-label="Close support"
          className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-ink-muted hover:bg-surface-sunken hover:text-ink"
        >
          <X className="size-[18px]" />
        </DrawerClose>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-line bg-surface-muted px-3.5 py-3">
          <LifeBuoy className="mt-0.5 size-4 shrink-0 text-signal-700" aria-hidden />
          <p className="text-[13px] leading-relaxed text-ink-secondary">
            Questions about Radar, your workspace, or billing? Contact us directly — we typically
            respond within one business day.
          </p>
        </div>

        <ul className="space-y-3">
          {SUPPORT_CONTACTS.map((contact) => (
            <li
              key={contact.email}
              className="rounded-lg border border-line bg-surface px-3.5 py-3"
            >
              <p className="text-[14px] font-semibold text-ink">{contact.name}</p>
              {contact.role ? (
                <p className="text-[12.5px] text-ink-muted">{contact.role}</p>
              ) : null}
              <div className="mt-2.5">
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2 text-[13px] text-signal-800 hover:underline"
                >
                  <Mail className="size-3.5 shrink-0" aria-hidden />
                  <span className="min-w-0 truncate">{contact.email}</span>
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </Drawer>
  )
}
