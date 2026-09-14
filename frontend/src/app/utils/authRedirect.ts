/** Marks an explicit customer sign-out so the next login lands on Overview. */

const KEY = 'op-signed-out'
const ELSEWHERE_KEY = 'op-signed-elsewhere'

export function markCustomerSignedOut(): void {
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    // private mode / blocked storage — ignore
  }
}

export function consumeCustomerSignedOut(): boolean {
  try {
    const flagged = sessionStorage.getItem(KEY) === '1'
    if (flagged) sessionStorage.removeItem(KEY)
    return flagged
  } catch {
    return false
  }
}

export function peekCustomerSignedOut(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** Set when another device signed in; Login pages show a toast once. */
export function markSignedInElsewhere(): void {
  try {
    sessionStorage.setItem(ELSEWHERE_KEY, '1')
  } catch {
    // ignore
  }
}

export function consumeSignedInElsewhere(): boolean {
  try {
    const flagged = sessionStorage.getItem(ELSEWHERE_KEY) === '1'
    if (flagged) sessionStorage.removeItem(ELSEWHERE_KEY)
    return flagged
  } catch {
    return false
  }
}

export const CUSTOMER_HOME = '/app/overview'

/** Matches backend `SIGNED_IN_ELSEWHERE` detail. */
export const SIGNED_IN_ELSEWHERE_DETAIL = 'Signed in elsewhere. Sign in again to continue.'
