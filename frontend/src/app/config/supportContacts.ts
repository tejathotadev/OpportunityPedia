/** Global support roster — same for every signed-in customer. */
export interface SupportContact {
  name: string
  role?: string
  email: string
}

export const SUPPORT_CONTACTS: SupportContact[] = [
  {
    name: 'Mirza',
    role: 'Founder',
    email: 'founder@opportunitypedia.com',
  },
  {
    name: 'Vishal',
    email: 'kendrevishal1504@gmail.com',
  },
  {
    name: 'Teja',
    email: 'tejathota.dev@gmail.com',
  },
]
