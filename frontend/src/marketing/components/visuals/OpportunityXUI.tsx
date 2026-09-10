import {
  Activity,
  Building2,
  Check,
  LayoutDashboard,
  Mail,
  Radar,
  Search,
  Settings,
  Target,
  Users,
} from 'lucide-react';
import { OpportunityPediaMark } from '@/shared/brand/Logo';
import { Metric } from '@/marketing/components/common/Metric';
import { SignalBadge, type Temperature } from '@/marketing/components/common/SignalBadge';
import { mockOpportunities } from '@/marketing/data/content';
import { cn } from '@/shared/cn';

/* ================================================================== *
 * OPPORTUNITYX UI MOCKUP
 *
 * A representation of the product we intend to build — sidebar,
 * dashboard metrics, an opportunity table, a detail drawer and a team
 * activity rail. Navy + teal, so the product reads as a distinct brand
 * inside the parent-company site.
 *
 * All content is illustrative. The `state` prop lets the interaction
 * preview drive it; with no state passed it renders as a still.
 * ================================================================== */

export type UIState = {
  selectedId: string | null;
  drawerOpen: boolean;
  /** null until the "Assign to me" step runs. */
  owner: string | null;
  composerOpen: boolean;
  outreachSent: boolean;
  /** Which control should read as actively pressed. */
  pressing: 'assign' | 'outreach' | 'send' | null;
};

const defaultUIState: UIState = {
  selectedId: null,
  drawerOpen: false,
  owner: null,
  composerOpen: false,
  outreachSent: false,
  pressing: null,
};

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Opportunities', icon: Target, active: false },
  { label: 'Signals', icon: Radar, active: false },
  { label: 'Accounts', icon: Building2, active: false },
  { label: 'Outreach', icon: Mail, active: false },
  { label: 'Team', icon: Users, active: false },
  { label: 'Settings', icon: Settings, active: false },
] as const;

const tempText: Record<Temperature, string> = {
  'very-hot': 'text-temp-very-hot',
  hot: 'text-temp-hot',
  warm: 'text-temp-warm',
  watch: 'text-temp-watch',
};

const tempDot: Record<Temperature, string> = {
  'very-hot': 'bg-temp-very-hot',
  hot: 'bg-temp-hot',
  warm: 'bg-temp-warm',
  watch: 'bg-temp-watch',
};

const tempLabel: Record<Temperature, string> = {
  'very-hot': 'Very Hot',
  hot: 'Hot',
  warm: 'Warm',
  watch: 'Watch',
};

function ActivityRow({
  actor,
  action,
  time,
  fresh = false,
}: {
  actor: string;
  action: string;
  time: string;
  fresh?: boolean;
}) {
  return (
    <li className="flex gap-3 py-2.5">
      <span
        aria-hidden="true"
        className={cn(
          'mt-1.5 size-1.5 shrink-0 rounded-full',
          fresh ? 'bg-teal' : 'bg-white/25',
        )}
      />
      <div className="min-w-0">
        <p className="text-[0.6875rem] leading-relaxed text-white/70">
          <span className="font-medium text-white/90">{actor}</span> {action}
        </p>
        <p className="text-[0.625rem] text-white/40">{time}</p>
      </div>
    </li>
  );
}

export function OpportunityXUI({
  state = defaultUIState,
  className,
}: {
  state?: UIState;
  className?: string;
}) {
  const selected = mockOpportunities.find((o) => o.id === state.selectedId) ?? null;
  const veryHotCount = state.owner ? 35 : 36;

  return (
    <div
      className={cn(
        'op-stage relative overflow-hidden border border-white/10 bg-navy text-white',
        className,
      )}
      // Presentational mockup: not a real interface, so it is announced as an image.
      role="img"
      aria-label="OpportunityPedia product interface: a dashboard listing opportunities with temperature, owner and recent team activity."
    >
      {/* App chrome */}
      <div className="flex items-center gap-3 border-b border-white/10 bg-navy-deep px-3 py-2.5 md:px-4">
        <OpportunityPediaMark tone="inverse" className="text-[0.9375rem] md:text-base" />
        <div className="ml-2 hidden min-w-0 flex-1 items-center gap-2 border border-white/10 bg-white/[0.04] px-2.5 py-1.5 sm:flex">
          <Search aria-hidden="true" className="size-3 shrink-0 text-white/35" />
          <span className="truncate text-[0.6875rem] text-white/35">
            Search opportunities, accounts and signals
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <span className="hidden text-[0.6875rem] text-white/45 md:inline">Acme GTM</span>
          <span
            aria-hidden="true"
            className="grid size-6 place-items-center border border-white/15 bg-teal/15 text-[0.625rem] font-semibold text-teal"
          >
            VK
          </span>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <nav
          aria-hidden="true"
          className="hidden w-[8.75rem] shrink-0 border-r border-white/10 py-3 lg:block xl:w-[10.5rem]"
        >
          <ul>
            {navItems.map((item) => (
              <li key={item.label}>
                <span
                  className={cn(
                    'relative flex items-center gap-2.5 px-4 py-2 text-[0.6875rem]',
                    item.active ? 'text-white' : 'text-white/45',
                  )}
                >
                  {item.active ? (
                    <span className="absolute inset-y-0 left-0 w-[2px] bg-teal" />
                  ) : null}
                  <item.icon className="size-3.5 shrink-0" />
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-white/10 px-4 pt-3">
            <p className="text-[0.5625rem] tracking-[0.12em] text-white/30 uppercase">Workspace</p>
            <p className="mt-1 text-[0.6875rem] text-white/55">4 members</p>
          </div>
        </nav>

        {/* Main */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-4 px-3 pt-4 md:px-5">
            <div>
              <h4 className="text-[0.9375rem] font-semibold md:text-base">Dashboard</h4>
              <p className="text-[0.6875rem] text-white/40">Opportunity overview · Today</p>
            </div>
            <span className="hidden text-[0.625rem] tracking-[0.1em] text-white/35 uppercase sm:inline">
              Illustrative
            </span>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-2 px-3 pt-3.5 md:px-5 lg:grid-cols-4">
            <Metric
              label="Very Hot"
              value={String(veryHotCount)}
              note="Explicit requirements"
              accent="very-hot"
            />
            <Metric label="Hot" value="84" note="Strong indicators" accent="hot" />
            <Metric label="Needs attention" value="12" note="Unassigned > 48h" accent="warm" />
            <Metric label="Contacted" value="41" note="This week" accent="neutral" />
          </div>

          {/* Table + activity */}
          <div className="grid gap-4 px-3 py-4 md:px-5 md:py-5 xl:grid-cols-[minmax(0,1fr)_13rem]">
            <div className="min-w-0 border border-white/10">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
                <p className="text-[0.6875rem] font-medium text-white/80">Opportunity queue</p>
                <p className="text-[0.625rem] text-white/35">Sorted by temperature</p>
              </div>

              {/* `table-fixed` is what lets the truncating title cell shrink; with
                  auto layout its nowrap text sets a min-content width that pushes
                  the whole page into horizontal scroll on small screens. */}
              <table className="w-full table-fixed border-collapse text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-2 text-[0.5625rem] font-normal tracking-[0.11em] text-white/35 uppercase">
                      Opportunity
                    </th>
                    <th className="hidden w-[6.5rem] px-3 py-2 text-[0.5625rem] font-normal tracking-[0.11em] text-white/35 uppercase sm:table-cell">
                      Temperature
                    </th>
                    <th className="hidden w-[6.5rem] px-3 py-2 text-[0.5625rem] font-normal tracking-[0.11em] text-white/35 uppercase md:table-cell">
                      Owner
                    </th>
                    <th className="w-[4.75rem] px-3 py-2 text-right text-[0.5625rem] font-normal tracking-[0.11em] text-white/35 uppercase">
                      Updated
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mockOpportunities.map((opportunity) => {
                    const isSelected = opportunity.id === state.selectedId;
                    const owner =
                      isSelected && state.owner ? state.owner : opportunity.owner;

                    return (
                      <tr
                        key={opportunity.id}
                        className={cn(
                          'border-b border-white/[0.06] transition-colors duration-300 last:border-b-0',
                          isSelected && 'bg-teal/[0.09]',
                        )}
                      >
                        <td className="relative px-3 py-2.5">
                          {isSelected ? (
                            <span
                              aria-hidden="true"
                              className="absolute inset-y-0 left-0 w-[2px] bg-teal"
                            />
                          ) : null}
                          <p className="truncate text-[0.75rem] leading-snug font-medium text-white/90">
                            {opportunity.title}
                          </p>
                          <p className="mt-0.5 truncate text-[0.625rem] text-white/40">
                            {opportunity.organization} · {opportunity.category} · IDX{' '}
                            {opportunity.id}
                          </p>
                        </td>
                        <td className="hidden px-3 py-2.5 sm:table-cell">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 text-[0.6875rem] font-medium',
                              tempText[opportunity.temperature],
                            )}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                'size-1.5 rounded-full',
                                tempDot[opportunity.temperature],
                              )}
                            />
                            {tempLabel[opportunity.temperature]}
                          </span>
                        </td>
                        <td className="hidden px-3 py-2.5 md:table-cell">
                          {owner ? (
                            <span className="inline-flex items-center gap-1.5 text-[0.6875rem] text-white/70">
                              <span
                                aria-hidden="true"
                                className="grid size-4 place-items-center rounded-full bg-white/10 text-[0.5rem] font-semibold text-white/80"
                              >
                                {owner === 'You' ? 'VK' : owner.replace(/[^A-Z]/g, '')}
                              </span>
                              {owner}
                            </span>
                          ) : (
                            <span className="text-[0.6875rem] text-white/30">Unassigned</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right text-[0.625rem] whitespace-nowrap text-white/40">
                          {opportunity.updated}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Recent team activity */}
            <aside className="hidden border border-white/10 px-3 py-2.5 xl:block">
              <div className="flex items-center gap-2 border-b border-white/10 pb-2.5">
                <Activity aria-hidden="true" className="size-3 text-white/40" />
                <p className="text-[0.6875rem] font-medium text-white/80">Recent team activity</p>
              </div>
              <ul className="divide-y divide-white/[0.06]">
                {state.outreachSent ? (
                  <ActivityRow actor="You" action="sent outreach" time="just now" fresh />
                ) : null}
                {state.owner ? (
                  <ActivityRow actor="You" action="assigned this opportunity" time="just now" fresh />
                ) : null}
                <ActivityRow actor="A. Rao" action="added a note on Halden Logistics" time="13:58" />
                <ActivityRow actor="S. Iyer" action="moved Meridian to Contacted" time="11:20" />
                <ActivityRow actor="D. Mehta" action="claimed Arcline vendor requirement" time="Yesterday" />
              </ul>
            </aside>
          </div>
        </div>
      </div>

      {/* ---------- Opportunity drawer ---------- */}
      {state.drawerOpen && selected ? (
        <div className="absolute inset-0 flex justify-end bg-navy-deep/55">
          <div className="flex w-full flex-col overflow-hidden border-l border-white/12 bg-navy shadow-[-24px_0_48px_-32px_rgba(0,0,0,0.8)] sm:w-[22rem] md:w-[24rem]">
            <div className="border-b border-white/10 px-4 py-3.5">
              <p className="text-[0.5625rem] tracking-[0.12em] text-white/35 uppercase">
                IDX / {selected.id} · {selected.category}
              </p>
              <p className="mt-1.5 text-[0.9375rem] leading-snug font-semibold">{selected.title}</p>
              <p className="mt-1 text-[0.6875rem] text-white/45">{selected.organization}</p>
              <div className="mt-3">
                <SignalBadge temperature={selected.temperature} tone="inverse" />
              </div>
            </div>

            <div className="flex-1 space-y-3.5 overflow-hidden px-4 py-3.5">
              <div>
                <p className="text-[0.5625rem] tracking-[0.12em] text-white/35 uppercase">Owner</p>
                <p className="mt-1 flex items-center gap-2 text-[0.75rem] text-white/85">
                  {state.owner ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="grid size-4.5 place-items-center rounded-full bg-teal/20 text-[0.5rem] font-semibold text-teal"
                      >
                        VK
                      </span>
                      Vishal Kendre
                      <Check aria-hidden="true" className="size-3 text-teal" />
                    </>
                  ) : (
                    <span className="text-white/35">Unassigned</span>
                  )}
                </p>
              </div>

              <div>
                <p className="text-[0.5625rem] tracking-[0.12em] text-white/35 uppercase">
                  Why this surfaced
                </p>
                <p className="mt-1 text-[0.75rem] leading-relaxed text-white/65">
                  A published modernization requirement with a stated submission window.
                </p>
              </div>

              {state.composerOpen ? (
                <div className="border border-white/12 bg-white/[0.03]">
                  <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
                    <Mail aria-hidden="true" className="size-3 text-teal" />
                    <p className="text-[0.6875rem] font-medium text-white/80">Outreach composer</p>
                  </div>
                  <div className="space-y-1.5 px-3 py-2.5">
                    <p className="text-[0.625rem] text-white/40">
                      To: procurement@northbridge.example
                    </p>
                    <p className="text-[0.6875rem] leading-relaxed text-white/70">
                      Re: Enterprise Cloud Modernization — noting the published requirement and a
                      relevant delivery reference.
                    </p>
                    {state.outreachSent ? (
                      <p className="flex items-center gap-1.5 pt-1 text-[0.6875rem] font-medium text-teal">
                        <Check aria-hidden="true" className="size-3" />
                        Outreach sent · just now
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="border-t border-white/10 pt-3">
                <p className="text-[0.5625rem] tracking-[0.12em] text-white/35 uppercase">
                  Activity
                </p>
                <ul className="mt-1 divide-y divide-white/[0.06]">
                  {state.outreachSent ? (
                    <ActivityRow actor="You" action="sent outreach" time="just now" fresh />
                  ) : null}
                  {state.owner ? (
                    <ActivityRow actor="You" action="assigned to self" time="just now" fresh />
                  ) : null}
                  <ActivityRow actor="System" action="classified as Very Hot" time="14:32" />
                </ul>
              </div>
            </div>

            <div className="flex gap-2 border-t border-white/10 px-4 py-3">
              <span
                className={cn(
                  'inline-flex h-8 flex-1 items-center justify-center gap-1.5 border text-[0.6875rem] font-medium transition-colors duration-200',
                  state.owner
                    ? 'border-white/12 bg-white/[0.04] text-white/50'
                    : 'border-transparent bg-teal text-navy-deep',
                  state.pressing === 'assign' && 'ring-2 ring-teal/60 ring-offset-2 ring-offset-navy',
                )}
              >
                {state.owner ? (
                  <>
                    <Check aria-hidden="true" className="size-3" />
                    Assigned to you
                  </>
                ) : (
                  'Assign to me'
                )}
              </span>
              <span
                className={cn(
                  'inline-flex h-8 flex-1 items-center justify-center border text-[0.6875rem] font-medium transition-colors duration-200',
                  state.outreachSent
                    ? 'border-teal/40 bg-teal/10 text-teal'
                    : state.composerOpen
                      ? 'border-transparent bg-teal text-navy-deep'
                      : 'border-white/20 bg-transparent text-white/80',
                  (state.pressing === 'outreach' || state.pressing === 'send') &&
                    'ring-2 ring-teal/60 ring-offset-2 ring-offset-navy',
                )}
              >
                {state.outreachSent ? 'Sent' : state.composerOpen ? 'Send' : 'Send outreach'}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
