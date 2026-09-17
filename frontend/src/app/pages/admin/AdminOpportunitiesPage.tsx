import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type ReactNode } from 'react'

import { Button } from '@/app/components/common/Button'
import { ApiError } from '@/app/services/api'
import { listAdminUsers, testAdminGemini, type AdminUserRow } from '@/app/services/auth'
import {
  archiveCuratedOpportunity,
  COMMERCIAL_TYPE_OPTIONS,
  createCuratedOpportunity,
  GOVERNMENT_TYPE_OPTIONS,
  listCuratedOpportunities,
  updateCuratedOpportunity,
  type CuratedCategory,
  type CuratedOpportunityAdmin,
  type CuratedOpportunityInput,
  type CuratedPriority,
} from '@/app/services/curatedOpportunities'
import { useAuthStore } from '@/app/store/useAuthStore'

const inputClass =
  'mt-1 w-full rounded-md border border-mist bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-forest'
const labelClass = 'block text-xs font-medium uppercase tracking-wide text-ink-secondary'

type FormState = {
  category: CuratedCategory
  opportunity_type: string
  company: string
  title: string
  location: string
  engagement: string
  duration: string
  openings: string
  experience: string
  skillsText: string
  technologiesText: string
  vendor_looking_for: string
  partnership_model: string
  client_industry: string
  candidate_requirement: string
  contact_name: string
  contact_email: string
  priority: CuratedPriority
  description: string
  detected_at: string
  visible_to_user_ids: number[]
}

function todayInputValue(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function emptyForm(): FormState {
  return {
    category: 'commercial',
    opportunity_type: 'c2c_requirement',
    company: '',
    title: '',
    location: '',
    engagement: 'C2C',
    duration: '',
    openings: '',
    experience: '',
    skillsText: '',
    technologiesText: '',
    vendor_looking_for: '',
    partnership_model: '',
    client_industry: '',
    candidate_requirement: '',
    contact_name: '',
    contact_email: '',
    priority: 'very_hot',
    description: '',
    detected_at: todayInputValue(),
    visible_to_user_ids: [],
  }
}

function splitTags(text: string): string[] {
  return text
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function formFromRow(row: CuratedOpportunityAdmin): FormState {
  return {
    category: row.category,
    opportunity_type: row.opportunityType,
    company: row.company || '',
    title: row.title || '',
    location: row.location || '',
    engagement: row.engagement || '',
    duration: row.duration || '',
    openings: row.openings != null ? String(row.openings) : '',
    experience: row.experience || '',
    skillsText: (row.skills || []).join(', '),
    technologiesText: (row.technologies || []).join(', '),
    vendor_looking_for: row.vendorLookingFor || '',
    partnership_model: row.partnershipModel || '',
    client_industry: row.clientIndustry || '',
    candidate_requirement: row.candidateRequirement || '',
    contact_name: row.contactName || '',
    contact_email: row.contactEmail || '',
    priority: row.priority || 'very_hot',
    description: row.description || '',
    detected_at: row.detectedAt ? row.detectedAt.slice(0, 10) : todayInputValue(),
    visible_to_user_ids: row.visibleWorkspaceIds || [],
  }
}

function toPayload(form: FormState): CuratedOpportunityInput {
  const openingsRaw = form.openings.trim()
  return {
    category: form.category,
    opportunity_type: form.opportunity_type,
    company: form.company.trim() || undefined,
    title: form.title.trim(),
    location: form.location.trim() || undefined,
    engagement: form.engagement.trim() || undefined,
    duration: form.duration.trim() || undefined,
    openings: openingsRaw ? Number(openingsRaw) : null,
    experience: form.experience.trim() || undefined,
    skills: splitTags(form.skillsText),
    technologies: splitTags(form.technologiesText),
    vendor_looking_for: form.vendor_looking_for.trim() || undefined,
    partnership_model: form.partnership_model.trim() || undefined,
    client_industry: form.client_industry.trim() || undefined,
    candidate_requirement: form.candidate_requirement.trim() || undefined,
    contact_name: form.contact_name.trim() || undefined,
    contact_email: form.contact_email.trim() || undefined,
    priority: form.priority,
    description: form.description.trim() || undefined,
    detected_at: form.detected_at ? `${form.detected_at}T00:00:00Z` : undefined,
    visible_to_user_ids: form.visible_to_user_ids,
  }
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </label>
  )
}

export function AdminOpportunitiesPage() {
  const token = useAuthStore((s) => s.admin?.token)
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CuratedOpportunityAdmin | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [geminiMsg, setGeminiMsg] = useState<string | null>(null)

  const list = useQuery({
    queryKey: ['admin', 'curated-opportunities'],
    queryFn: () => listCuratedOpportunities(token!),
    enabled: Boolean(token),
  })

  const users = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => listAdminUsers(token!),
    enabled: Boolean(token),
  })

  const geminiTest = useMutation({
    mutationFn: () => testAdminGemini(token!),
    onSuccess: (result) => {
      setGeminiMsg(
        result.ok
          ? `Gemini OK · ${result.model} · ${result.message}`
          : `Gemini failed · ${result.model} · ${result.message}`,
      )
    },
    onError: (err: unknown) => {
      setGeminiMsg(
        err instanceof ApiError
          ? err.message
          : 'Could not reach Gemini test endpoint.',
      )
    },
  })

  const activeOwners = useMemo(
    () =>
      (users.data || []).filter(
        (u) => u.status === 'active' || u.status === 'paid' || u.status === 'provisioning',
      ),
    [users.data],
  )

  const save = useMutation({
    mutationFn: async () => {
      const body = toPayload(form)
      if (editing) return updateCuratedOpportunity(token!, editing.id, body)
      return createCuratedOpportunity(token!, body)
    },
    onSuccess: () => {
      setMessage(editing ? 'Opportunity updated.' : 'Opportunity created.')
      setError(null)
      setFormOpen(false)
      setEditing(null)
      setForm(emptyForm())
      void qc.invalidateQueries({ queryKey: ['admin', 'curated-opportunities'] })
    },
    onError: (err: unknown) => {
      setMessage(null)
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not save opportunity.',
      )
    },
  })

  const archive = useMutation({
    mutationFn: (id: string) => archiveCuratedOpportunity(token!, id),
    onSuccess: () => {
      setMessage('Opportunity archived.')
      void qc.invalidateQueries({ queryKey: ['admin', 'curated-opportunities'] })
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Could not archive.')
    },
  })

  function openCreate() {
    setEditing(null)
    setForm(emptyForm())
    setError(null)
    setFormOpen(true)
  }

  function openEdit(row: CuratedOpportunityAdmin) {
    setEditing(row)
    setForm(formFromRow(row))
    setError(null)
    setFormOpen(true)
  }

  function setCategory(category: CuratedCategory) {
    setForm((prev) => ({
      ...prev,
      category,
      opportunity_type:
        category === 'commercial' ? 'c2c_requirement' : 'government_tender',
      engagement: category === 'commercial' ? prev.engagement || 'C2C' : '',
    }))
  }

  function toggleUser(id: number) {
    setForm((prev) => {
      const set = new Set(prev.visible_to_user_ids)
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return { ...prev, visible_to_user_ids: Array.from(set) }
    })
  }

  function selectAllUsers() {
    setForm((prev) => ({
      ...prev,
      visible_to_user_ids: activeOwners.map((u) => Number(u.id)),
    }))
  }

  const type = form.opportunity_type
  const showC2cFields =
    form.category === 'commercial' &&
    ['c2c_requirement', 'hiring_requirement', 'contract_staffing', 'w2_requirement', 'other'].includes(
      type,
    )
  const showVendorReq = form.category === 'commercial' && type === 'vendor_requirement'
  const showPartnership = form.category === 'commercial' && type === 'vendor_partnership'
  const showGovFields = form.category === 'government'

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[1.5rem] font-semibold tracking-[-0.025em] text-ink">
            Opportunities
          </h1>
          <p className="mt-2 max-w-2xl text-[0.9375rem] text-graphite">
            Add opportunity details first, then assign customer workspaces when ready. They appear for
            those users only after their next successful Radar run.
          </p>
        </div>
        <Button type="button" size="sm" onClick={openCreate}>
          + Add Opportunity
        </Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-mist bg-white px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">Gemini (AI email drafts)</p>
          <p className="mt-0.5 text-xs text-graphite">
            Platform key from backend <code className="font-mono">GEMINI_API_KEY</code>. Test before
            users rely on Generate with AI.
          </p>
          {geminiMsg ? (
            <p className="mt-1 text-xs text-ink-secondary">{geminiMsg}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          loading={geminiTest.isPending}
          onClick={() => geminiTest.mutate()}
        >
          Test Gemini
        </Button>
      </div>

      {message ? <p className="mt-4 text-sm text-forest">{message}</p> : null}
      {error && !formOpen ? <p className="mt-4 text-sm text-danger">{error}</p> : null}

      {formOpen ? (
        <div className="mt-6 rounded-md border border-mist bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink">
              {editing ? 'Edit opportunity' : 'Add opportunity'}
            </h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setFormOpen(false)
                setEditing(null)
                setError(null)
              }}
            >
              Cancel
            </Button>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className={labelClass}>Opportunity category</p>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-ink">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    checked={form.category === 'commercial'}
                    onChange={() => setCategory('commercial')}
                  />
                  Commercial
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    checked={form.category === 'government'}
                    onChange={() => setCategory('government')}
                  />
                  Government
                </label>
              </div>
            </div>

            <Field label="Opportunity type">
              <select
                className={inputClass}
                value={form.opportunity_type}
                onChange={(e) => setForm((p) => ({ ...p, opportunity_type: e.target.value }))}
              >
                {(form.category === 'commercial'
                  ? COMMERCIAL_TYPE_OPTIONS
                  : GOVERNMENT_TYPE_OPTIONS
                ).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Company / Agency">
              <input
                className={inputClass}
                value={form.company}
                onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                placeholder="HCL Global Solutions"
              />
            </Field>

            <Field label="Opportunity title">
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="C2C Opportunity | Azure Cloud SME"
              />
            </Field>

            <Field label="Location">
              <input
                className={inputClass}
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                placeholder="San Francisco, CA"
              />
            </Field>

            {(showC2cFields || showVendorReq || showPartnership || showGovFields) && (
              <Field label="Engagement">
                <input
                  className={inputClass}
                  value={form.engagement}
                  onChange={(e) => setForm((p) => ({ ...p, engagement: e.target.value }))}
                  placeholder="C2C / W2 / Contract"
                />
              </Field>
            )}

            {showC2cFields && (
              <>
                <Field label="Duration">
                  <input
                    className={inputClass}
                    value={form.duration}
                    onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))}
                    placeholder="6+ Months"
                  />
                </Field>
                <Field label="Number of openings">
                  <input
                    className={inputClass}
                    type="number"
                    min={1}
                    value={form.openings}
                    onChange={(e) => setForm((p) => ({ ...p, openings: e.target.value }))}
                  />
                </Field>
                <Field label="Skills (comma-separated)">
                  <input
                    className={inputClass}
                    value={form.skillsText}
                    onChange={(e) => setForm((p) => ({ ...p, skillsText: e.target.value }))}
                    placeholder="Azure, Terraform, AKS"
                  />
                </Field>
                <Field label="Experience">
                  <input
                    className={inputClass}
                    value={form.experience}
                    onChange={(e) => setForm((p) => ({ ...p, experience: e.target.value }))}
                    placeholder="8+ years"
                  />
                </Field>
              </>
            )}

            {showVendorReq && (
              <>
                <Field label="Vendor requirement (what are they looking for?)">
                  <textarea
                    className={`${inputClass} min-h-24`}
                    value={form.vendor_looking_for}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, vendor_looking_for: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Technologies (comma-separated)">
                  <input
                    className={inputClass}
                    value={form.technologiesText}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, technologiesText: e.target.value }))
                    }
                    placeholder="SAP, Salesforce, Oracle, ServiceNow"
                  />
                </Field>
                <Field label="Candidate requirement">
                  <input
                    className={inputClass}
                    value={form.candidate_requirement}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, candidate_requirement: e.target.value }))
                    }
                    placeholder="Immediate joiners, client-ready"
                  />
                </Field>
              </>
            )}

            {showPartnership && (
              <>
                <Field label="Partnership model">
                  <input
                    className={inputClass}
                    value={form.partnership_model}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, partnership_model: e.target.value }))
                    }
                    placeholder="W2 Referral"
                  />
                </Field>
                <Field label="Client industry">
                  <input
                    className={inputClass}
                    value={form.client_industry}
                    onChange={(e) => setForm((p) => ({ ...p, client_industry: e.target.value }))}
                    placeholder="Banking"
                  />
                </Field>
                <Field label="Required skills (comma-separated)">
                  <input
                    className={inputClass}
                    value={form.skillsText}
                    onChange={(e) => setForm((p) => ({ ...p, skillsText: e.target.value }))}
                    placeholder="PKI, Certificate Automation"
                  />
                </Field>
              </>
            )}

            {showGovFields && (
              <Field label="Skills / keywords (comma-separated)">
                <input
                  className={inputClass}
                  value={form.skillsText}
                  onChange={(e) => setForm((p) => ({ ...p, skillsText: e.target.value }))}
                />
              </Field>
            )}

            <Field label="Contact name">
              <input
                className={inputClass}
                value={form.contact_name}
                onChange={(e) => setForm((p) => ({ ...p, contact_name: e.target.value }))}
              />
            </Field>
            <Field label="Contact email">
              <input
                className={inputClass}
                type="email"
                value={form.contact_email}
                onChange={(e) => setForm((p) => ({ ...p, contact_email: e.target.value }))}
              />
            </Field>

            <Field label="Priority" hint="Vendors opportunities are always Very Hot.">
              <input className={inputClass} value="Very Hot" disabled readOnly />
            </Field>
            <Field label="Detected date">
              <input
                className={inputClass}
                type="date"
                value={form.detected_at}
                onChange={(e) => setForm((p) => ({ ...p, detected_at: e.target.value }))}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="Description">
              <textarea
                className={`${inputClass} min-h-28`}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Paste the full post text"
              />
            </Field>
          </div>

          <div className="mt-5 rounded-md border border-mist bg-paper p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={labelClass}>Visible to (customer workspaces)</p>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={selectAllUsers}>
                  Select all active
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setForm((p) => ({ ...p, visible_to_user_ids: [] }))}
                >
                  Clear
                </Button>
              </div>
            </div>
            <p className="mt-1 text-xs text-graphite">
              Optional — leave empty to save the opportunity now and assign customers later. Selected
              workspaces see it after their next successful Radar run.
            </p>
            {users.isLoading ? (
              <p className="mt-3 text-sm text-graphite">Loading users…</p>
            ) : (
              <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto">
                {activeOwners.map((u: AdminUserRow) => {
                  const id = Number(u.id)
                  return (
                    <li key={String(u.id)}>
                      <label className="flex cursor-pointer items-start gap-2 rounded px-1 py-1 text-sm hover:bg-white">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={form.visible_to_user_ids.includes(id)}
                          onChange={() => toggleUser(id)}
                        />
                        <span>
                          <span className="font-medium text-ink">{u.name}</span>
                          <span className="block text-xs text-graphite">
                            {u.email}
                            {u.company ? ` · ${u.company}` : ''}
                          </span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setFormOpen(false)
                setEditing(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              loading={save.isPending}
              onClick={() => save.mutate()}
            >
              {editing ? 'Save changes' : 'Create opportunity'}
            </Button>
          </div>
        </div>
      ) : null}

      {list.isLoading ? (
        <p className="mt-10 text-sm text-graphite">Loading opportunities…</p>
      ) : list.isError ? (
        <div className="mt-10 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          Could not load curated opportunities. Apply the DB migration first, then restart the API.
          <div className="mt-3">
            <Button type="button" variant="secondary" size="sm" onClick={() => list.refetch()}>
              Try again
            </Button>
          </div>
        </div>
      ) : !list.data?.length ? (
        <p className="mt-10 rounded-md border border-mist bg-white px-4 py-8 text-center text-sm text-graphite">
          No curated opportunities yet. Click + Add Opportunity to create one.
        </p>
      ) : (
        <div className="mt-8 space-y-3">
          {list.data.map((row) => (
            <article key={row.id} className="rounded-md border border-mist bg-white px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{row.title}</p>
                  <p className="mt-0.5 text-sm text-graphite">
                    {row.company || '—'} · {row.category} ·{' '}
                    {row.opportunityType.replaceAll('_', ' ')} · {row.priority.replace('_', ' ')}
                  </p>
                  <p className="mt-1 text-xs text-ink-secondary">
                    Visible to {row.visibleWorkspaceIds.length} workspace
                    {row.visibleWorkspaceIds.length === 1 ? '' : 's'}
                    {row.detectedAt
                      ? ` · detected ${new Date(row.detectedAt).toLocaleDateString()}`
                      : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="secondary" size="sm" onClick={() => openEdit(row)}>
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    loading={archive.isPending}
                    onClick={() => {
                      if (window.confirm('Archive this opportunity? Users will stop seeing it.')) {
                        archive.mutate(row.id)
                      }
                    }}
                  >
                    Archive
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
