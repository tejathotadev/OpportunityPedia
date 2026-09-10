import { useEffect } from 'react';
import { applySeo, type SeoInput } from '@/marketing/lib/seo';

export function useSeo(input: SeoInput): void {
  const { title, description, path, index } = input;

  useEffect(() => {
    applySeo({ title, description, path, index });
  }, [title, description, path, index]);
}
