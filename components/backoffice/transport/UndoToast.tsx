'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}

export default function UndoToast({ message, onUndo, onDismiss, duration = 5000 }: UndoToastProps) {
  const { t } = useTranslation();
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card border border-border rounded-lg shadow-lg px-4 py-3 animate-in fade-in slide-in-from-bottom-4">
      <span className="text-sm text-foreground">{message}</span>
      <button
        onClick={onUndo}
        className="px-3 py-1 text-sm font-medium bg-[#606338] text-white rounded hover:bg-[#4d4f2e] transition-colors"
      >
        {t.backoffice.transportComp.undo}
      </button>
      <button
        onClick={onDismiss}
        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
