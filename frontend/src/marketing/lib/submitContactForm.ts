import { api, ApiError } from '@/app/services/api'
import type { ContactFormValues } from '@/marketing/types/contact'

export type ContactSubmissionResult = { ok: true; reference: string } | { ok: false; error: string }

/**
 * Marketing contact form → `POST /api/v1/contact` → Supabase `contact_leads`.
 */
export async function submitContactForm(
  values: ContactFormValues,
): Promise<ContactSubmissionResult> {
  const name = `${values.firstName} ${values.lastName}`.trim()

  try {
    const { data } = await api.post<{ ok: boolean; reference: string }>('/contact', {
      name,
      email: values.email,
      company: values.company,
      job_title: values.role || null,
      reason: values.reason,
      message: values.message,
    })
    return { ok: true, reference: data.reference || 'OP-000000' }
  } catch (error) {
    const message =
      error instanceof ApiError ? error.message : 'Could not send your message. Please try again.'
    return { ok: false, error: message }
  }
}
