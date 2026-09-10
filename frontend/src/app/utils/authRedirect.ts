/** Marks an explicit customer sign-out so the next login lands on Overview. */

const KEY = 'op-signed-out'

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

export const CUSTOMER_HOME = '/app/overview'
