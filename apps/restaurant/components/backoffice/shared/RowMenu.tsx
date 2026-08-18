'use client';

import { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

/**
 * A kebab (⋮) actions menu whose panel is rendered in a portal with fixed
 * positioning, so it is never clipped by an ancestor's `overflow-hidden`
 * (e.g. rounded table cards). `children` receives a `close` callback.
 */
export function RowMenu({
  children,
  width = 180,
  buttonClassName,
  menuClassName,
  ariaLabel = 'Actions',
}: {
  children: (close: () => void) => ReactNode;
  width?: number;
  buttonClassName?: string;
  menuClassName?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMounted(true), []);

  const place = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Right-align the panel to the button, clamped to the viewport.
    const left = Math.min(Math.max(8, r.right - width), window.innerWidth - width - 8);
    setCoords({ top: r.bottom + 4, left });
  };

  const close = () => setOpen(false);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!open) place();
    setOpen(o => !o);
  };

  useEffect(() => {
    if (!open) return;
    const onClose = () => close();
    document.addEventListener('click', onClose);
    window.addEventListener('scroll', onClose, true);
    window.addEventListener('resize', onClose);
    return () => {
      document.removeEventListener('click', onClose);
      window.removeEventListener('scroll', onClose, true);
      window.removeEventListener('resize', onClose);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        aria-label={ariaLabel}
        className={buttonClassName || 'p-1.5 bg-transparent border-none rounded-md cursor-pointer text-muted-foreground hover:text-foreground'}
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && mounted && createPortal(
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width, zIndex: 1000 }}
          className={menuClassName || 'bg-card border border-border rounded-lg overflow-hidden shadow-2xl'}
        >
          {children(close)}
        </div>,
        document.body,
      )}
    </>
  );
}
