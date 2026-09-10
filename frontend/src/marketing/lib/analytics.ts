/**
 * Event helper. Deliberately not wired to any third-party analytics provider —
 * `sink` is the single place to attach one later.
 */
export type AnalyticsEvent =
  | 'hero_opportunityx_click'
  | 'nav_product_click'
  | 'contact_submit'
  | 'product_demo_click'
  | 'careers_view'
  | 'cta_talk_to_us_click';

type Payload = Record<string, string | number | boolean | undefined>;

type Sink = (event: AnalyticsEvent, payload?: Payload) => void;

const sinks: Sink[] = [];

export function registerAnalyticsSink(sink: Sink): () => void {
  sinks.push(sink);
  return () => {
    const index = sinks.indexOf(sink);
    if (index > -1) sinks.splice(index, 1);
  };
}

export function track(event: AnalyticsEvent, payload?: Payload): void {
  for (const sink of sinks) {
    try {
      sink(event, payload);
    } catch {
      /* a broken sink must never break the UI */
    }
  }

  if (import.meta.env.DEV) {
    console.debug('[analytics]', event, payload ?? {});
  }
}
