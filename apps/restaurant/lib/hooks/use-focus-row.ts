'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Row-level deep-linking. When the URL carries ?focus=<id>, scroll to and
 * briefly highlight the element marked `data-focus="<id>"`. Retries for a few
 * seconds while async lists finish loading. Pass `ready` (e.g. items.length) so
 * it re-runs once the target row is rendered.
 */
export function useFocusRow(ready?: unknown) {
  const focus = useSearchParams().get('focus');
  useEffect(() => {
    if (!focus) return;
    let tries = 0;
    let timer: ReturnType<typeof setTimeout>;
    // ref ids are UUIDs / numeric ids — no CSS-special chars, safe to inline.
    const sel = `[data-focus="${focus.replace(/"/g, '')}"]`;
    const tick = () => {
      const el = document.querySelector<HTMLElement>(sel);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('focus-flash');
        setTimeout(() => el.classList.remove('focus-flash'), 2600);
        return;
      }
      if (tries++ < 40) timer = setTimeout(tick, 150);
    };
    timer = setTimeout(tick, 200);
    return () => clearTimeout(timer);
  }, [focus, ready]);
}
