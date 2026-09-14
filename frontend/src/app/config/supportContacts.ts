/** Global support roster — same for every signed-in customer. */
export interface SupportContact {
  name: string
  role?: string
  email: string
  /** Shown as entered; use `phoneDigits` for tel: links. */
  phoneDisplay: string
  phoneDigits: string
}

export const SUPPORT_CONTACTS: SupportContact[] = [
  {
    name: 'Mirza',
    role: 'Founder',
    email: 'founder@opportunitypedia.com',
    phoneDisplay: '81850 91835',
    phoneDigits: '8185091835',
  },
  {
    name: 'Vishal',
    email: 'kendrevishal1504@gmail.com',
    phoneDisplay: '93819 53155',
    phoneDigits: '9381953155',
  },
  {
    name: 'Teja',
    email: 'tejathota.dev@gmail.com',
    phoneDisplay: '7989522191',
    phoneDigits: '7989522191',
  },
]
