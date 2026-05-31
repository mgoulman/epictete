'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function OfflinePage() {
  const { t } = useTranslation();

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
          <WifiOff className="w-10 h-10 text-yellow-500" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">{t.backoffice.offline.title}</h1>
        <p className="text-muted-foreground mb-6">
          {t.backoffice.offline.message}
        </p>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {t.backoffice.offline.retry}
        </button>
      </div>
    </div>
  );
}
