import type { User } from '@/app/types'

/**
 * The signed-in user, pending a real sign-in screen.
 *
 * The backend resolves the acting account itself — from the bearer token, or
 * from `OP_PUBLIC_USER_ID` in local development — so this record only supplies
 * the name, initials and contact details the interface renders. Replace it with
 * the session response from `/auth/login` once auth is wired.
 */
export const CURRENT_USER: User = {
  id: 'usr_current',
  name: 'Vishal Kendre',
  initials: 'VK',
  email: 'vishal@example.com',
  jobTitle: 'Business Development Manager',
  company: 'Opportunity Pedia',
  phone: '+1 (415) 555-0142',
  avatarTone: 'teal',
}
