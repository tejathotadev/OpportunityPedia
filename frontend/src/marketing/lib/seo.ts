const SITE_NAME = 'OpportunityX';
const SITE_ORIGIN = 'https://opportunitypedia.com';

export type SeoInput = {
  title: string;
  description: string;
  path: string;
  /** Set false for utility routes that should stay out of the index. */
  index?: boolean;
};

function upsertMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/** Imperative head management. Small enough that react-helmet isn't warranted. */
export function applySeo({ title, description, path, index = true }: SeoInput): void {
  const canonical = `${SITE_ORIGIN}${path}`;
  const fullTitle = path === '/' ? title : `${title} — ${SITE_NAME}`;

  document.title = fullTitle;

  upsertMeta('meta[name="description"]', 'name', 'description', description);
  upsertMeta(
    'meta[name="robots"]',
    'name',
    'robots',
    index ? 'index, follow' : 'noindex, follow',
  );

  upsertMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
  upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
  upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonical);

  upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
  upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);

  upsertLink('canonical', canonical);
}
