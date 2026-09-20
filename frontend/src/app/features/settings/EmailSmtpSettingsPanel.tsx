import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { Button } from '@/app/components/common/Button'
import { ConfirmationDialog } from '@/app/components/common/Dialog'
import { Field, Select, TextInput } from '@/app/components/forms/Field'
import { Panel, PanelHeader } from '@/app/components/layout/Panel'
import { ApiError } from '@/app/services/api'
import { queryKeys } from '@/app/services/queryKeys'
import {
  clearWorkspaceSmtp,
  getWorkspaceSmtp,
  saveWorkspaceSmtp,
  testWorkspaceSmtp,
} from '@/app/services/workspace'
import { toast } from '@/app/store/useToastStore'

export function EmailSmtpSettingsPanel() {
  const qc = useQueryClient()
  const smtpQuery = useQuery({
    queryKey: queryKeys.workspaceSmtp(),
    queryFn: getWorkspaceSmtp,
  })

  const data = smtpQuery.data
  const canManage = Boolean(data?.can_manage)

  const [host, setHost] = useState('')
  const [port, setPort] = useState('587')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [fromName, setFromName] = useState('')
  const [useSsl, setUseSsl] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [clearOpen, setClearOpen] = useState(false)

  useEffect(() => {
    if (!data) return
    setHost(data.host ?? '')
    setPort(String(data.port || 587))
    setUsername(data.username ?? '')
    setFromEmail(data.from_email ?? '')
    setFromName(data.from_name ?? '')
    setUseSsl(Boolean(data.use_ssl))
    setEnabled(data.configured ? Boolean(data.enabled) : true)
    setPassword('')
  }, [data])

  const save = useMutation({
    mutationFn: () =>
      saveWorkspaceSmtp({
        host: host.trim(),
        port: Number(port) || 587,
        username: username.trim(),
        password: password.trim() || undefined,
        from_email: fromEmail.trim(),
        from_name: fromName.trim() || undefined,
        use_ssl: useSsl,
        enabled,
      }),
    onSuccess: () => {
      setFormError(null)
      setPassword('')
      void qc.invalidateQueries({ queryKey: queryKeys.workspaceSmtp() })
      toast.success('SMTP settings saved.')
    },
    onError: (err: unknown) => {
      setFormError(err instanceof ApiError ? err.message : 'Could not save SMTP settings.')
    },
  })

  const test = useMutation({
    mutationFn: () =>
      testWorkspaceSmtp({
        host: host.trim() || undefined,
        port: Number(port) || undefined,
        username: username.trim() || undefined,
        password: password.trim() || undefined,
        from_email: fromEmail.trim() || undefined,
        from_name: fromName.trim() || undefined,
        use_ssl: useSsl,
      }),
    onSuccess: (row) => {
      toast.success(`Test email sent to ${row.to_email}`)
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'SMTP test failed.')
    },
  })

  const clear = useMutation({
    mutationFn: clearWorkspaceSmtp,
    onSuccess: () => {
      setClearOpen(false)
      void qc.invalidateQueries({ queryKey: queryKeys.workspaceSmtp() })
      toast.success('Company SMTP removed. Outreach will use the platform mail.')
    },
    onError: (err: unknown) => {
      toast.error(err instanceof ApiError ? err.message : 'Could not clear SMTP.')
    },
  })

  const statusLabel = !data
    ? 'Loading…'
    : data.configured && data.enabled
      ? 'Outreach sends from your company SMTP'
      : data.configured && !data.enabled
        ? 'Saved but disabled — platform mail is used'
        : 'Not configured — outreach uses platform mail'

  return (
    <>
      <Panel flush>
        <PanelHeader
          title="Email / SMTP"
          description="Send outreach from your company mailbox. Invites and password emails still use OpportunityPedia."
        />

        <div className="space-y-4 px-4 py-4 sm:px-5">
          {smtpQuery.isError && (
            <p className="text-sm text-hot-strong">Could not load SMTP settings. Try again shortly.</p>
          )}

          <p className="rounded-md border border-line bg-surface-sunken/40 px-3 py-2.5 text-[13px] text-ink-secondary">
            {statusLabel}
          </p>

          {!canManage && data && (
            <p className="text-[13px] text-ink-muted">
              Only the workspace owner can change SMTP settings.
              {data.configured
                ? ` Current from address: ${data.from_email ?? '—'}.`
                : ''}
            </p>
          )}

          {canManage && (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                save.mutate()
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="SMTP host" required hint="e.g. smtp.gmail.com or smtp.office365.com">
                  <TextInput
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="smtp.yourcompany.com"
                    required
                    autoComplete="off"
                  />
                </Field>
                <Field label="Port" required hint="587 (STARTTLS) or 465 (SSL)">
                  <TextInput
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    inputMode="numeric"
                    required
                  />
                </Field>
                <Field label="Username" required>
                  <TextInput
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="off"
                    required
                  />
                </Field>
                <Field
                  label="Password"
                  required={!data?.has_password}
                  hint={
                    data?.has_password
                      ? 'Leave blank to keep the saved password.'
                      : 'App password or SMTP password.'
                  }
                >
                  <TextInput
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    placeholder={data?.has_password ? '••••••••' : undefined}
                  />
                </Field>
                <Field label="From email" required hint="Must be allowed by your SMTP provider.">
                  <TextInput
                    type="email"
                    value={fromEmail}
                    onChange={(e) => setFromEmail(e.target.value)}
                    required
                  />
                </Field>
                <Field label="From name" hint="Shown as the sender name (usually your company).">
                  <TextInput value={fromName} onChange={(e) => setFromName(e.target.value)} />
                </Field>
                <Field label="Encryption">
                  <Select
                    value={useSsl ? 'ssl' : 'starttls'}
                    onChange={(e) => setUseSsl(e.target.value === 'ssl')}
                  >
                    <option value="starttls">STARTTLS (port 587)</option>
                    <option value="ssl">SSL (port 465)</option>
                  </Select>
                </Field>
                <Field label="Use for outreach">
                  <Select
                    value={enabled ? 'on' : 'off'}
                    onChange={(e) => setEnabled(e.target.value === 'on')}
                  >
                    <option value="on">Enabled</option>
                    <option value="off">Disabled (platform mail)</option>
                  </Select>
                </Field>
              </div>

              {formError && <p className="text-sm text-danger">{formError}</p>}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="submit" size="sm" loading={save.isPending}>
                  Save SMTP
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={test.isPending}
                  onClick={() => test.mutate()}
                >
                  Send test email
                </Button>
                {data?.configured && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setClearOpen(true)}
                  >
                    Remove SMTP
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>
      </Panel>

      <ConfirmationDialog
        open={clearOpen}
        onOpenChange={setClearOpen}
        title="Remove company SMTP?"
        description="Outreach will fall back to the OpportunityPedia platform mailbox until you add SMTP again."
        confirmLabel="Remove"
        destructive
        onConfirm={() => clear.mutate()}
      />
    </>
  )
}
