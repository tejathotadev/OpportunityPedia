import type { Opportunity, Vendor } from '@/app/types'

import { api } from './api'

export interface SearchResults {
  opportunities: Opportunity[]
  companies: Vendor[]
}

export async function globalSearch(term: string): Promise<SearchResults> {
  if (!term.trim()) return { opportunities: [], companies: [] }

  const { data } = await api.get<SearchResults>('/search', { params: { q: term } })
  return data
}
