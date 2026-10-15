'use client';

import { useEffect, useRef } from 'react';
import { confirmLeave, hasUnsavedWork, registerUnsaved } from '@/lib/navigation-guard';

export function useUnsavedWarning(check: () => boolean) {
  const current = useRef(check);
  current.current = check;
  useEffect(() => {
    const unregister = registerUnsaved(() => current.current());
    const unload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedWork()) { event.preventDefault(); event.returnValue = ''; }
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank' || link.hasAttribute('download')) return;
      const url = new URL(link.href, location.href);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
      if (url.pathname === location.pathname && url.search === location.search) return;
      if (!confirmLeave()) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', click, true);
    return () => { unregister(); window.removeEventListener('beforeunload', unload); document.removeEventListener('click', click, true); };
  }, []);
}
