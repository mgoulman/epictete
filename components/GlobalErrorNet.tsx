'use client';

// ───────────────────────────────────────────────────────────────────────────
// Global safety net for otherwise-unhandled errors. Listens for window
// 'unhandledrejection' (rejected promises no one caught) and 'error' (uncaught
// runtime errors) and routes them through reportError — so nothing fails
// completely silently. Optionally surfaces a toast via the `notify` callback.
//
//   Marketing (no toast system):   <GlobalErrorNet />
//   Backoffice (with toasts):      <BackofficeErrorNet />   // toasts + reports
// ───────────────────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { reportError, errorMessage } from '@/lib/observability/report';
import { useToast } from '@/components/backoffice/ToastProvider';

export function GlobalErrorNet({ notify }: { notify?: (message: string) => void }) {
  // Keep the latest notify without re-registering listeners each render.
  const notifyRef = useRef(notify);
  useEffect(() => { notifyRef.current = notify; }, [notify]);

  useEffect(() => {
    const onRejection = (event: PromiseRejectionEvent) => {
      reportError(event.reason, { where: 'window:unhandledrejection' });
      notifyRef.current?.(errorMessage(event.reason));
    };
    const onError = (event: ErrorEvent) => {
      // Ignore benign ResizeObserver noise that some browsers emit.
      if (event.message?.includes('ResizeObserver loop')) return;
      reportError(event.error ?? event.message, { where: 'window:error' });
      // Uncaught render/runtime errors are usually already handled by an error
      // boundary; don't double-toast those. Only report here.
    };

    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('error', onError);
    return () => {
      window.removeEventListener('unhandledrejection', onRejection);
      window.removeEventListener('error', onError);
    };
  }, []);

  return null;
}

/** Backoffice variant: reports AND toasts unhandled rejections. */
export function BackofficeErrorNet() {
  const toast = useToast();
  return <GlobalErrorNet notify={(m) => toast.error(m)} />;
}

export default GlobalErrorNet;
