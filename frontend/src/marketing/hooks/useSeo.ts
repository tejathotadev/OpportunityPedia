import { useEffect } from 'react';
import { applySeo, type SeoInput } from '@/marketing/lib/seo';

export function useSeo(input: SeoInput): void {
  const { title, description, path, index, standaloneTitle } = input;

  useEffect(() => {
    applySeo({ title, description, path, index, standaloneTitle });
  }, [title, description, path, index, standaloneTitle]);
}
