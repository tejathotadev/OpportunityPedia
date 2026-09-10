import { useEffect, useRef, useState } from 'react';

type Options = {
  /** Once revealed, stay revealed. Scroll-linked replays are distracting. */
  once?: boolean;
  rootMargin?: string;
  threshold?: number;
};

export function useInView<T extends HTMLElement = HTMLDivElement>({
  once = true,
  rootMargin = '0px 0px -6% 0px',
  threshold = 0.05,
}: Options = {}) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setInView(false);
          }
        }
      },
      { rootMargin, threshold },
    );

    observer.observe(node);

    // If the observer misses an already-visible node, don't leave copy at 0.
    const fallback = window.setTimeout(() => {
      const rect = node.getBoundingClientRect();
      const viewport = window.innerHeight || 0;
      if (rect.top < viewport && rect.bottom > 0) setInView(true);
    }, 1600);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, [once, rootMargin, threshold]);

  return { ref, inView };
}
