'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Download, X, Wifi, WifiOff, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAContextValue {
  isInstalled: boolean;
  canInstall: boolean;
  isIOS: boolean;
  triggerInstall: () => void;
}

const PWAContext = createContext<PWAContextValue>({
  isInstalled: false,
  canInstall: false,
  isIOS: false,
  triggerInstall: () => {},
});

export function usePWA() {
  return useContext(PWAContext);
}

function detectIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
}

function isInStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone);
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    setIsIOSDevice(detectIOS());

    // Check if already installed / standalone
    if (isInStandaloneMode()) {
      setIsInstalled(true);
      return;
    }

    // Register service worker only for backoffice routes
    if ('serviceWorker' in navigator) {
      const path = window.location.pathname;
      const isBackofficeRoute = path.startsWith('/admin') || path.startsWith('/login');

      if (isBackofficeRoute) {
        navigator.serviceWorker
          .register('/backoffice-sw.js', { scope: '/' })
          .then((registration) => {
            console.log('Backoffice SW registered:', registration.scope);

            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('New version available');
                  }
                });
              }
            });
          })
          .catch((error) => {
            console.error('SW registration failed:', error);
          });
      }
    }

    // Handle online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineBanner(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineBanner(true);
    };

    setIsOnline(navigator.onLine);
    setShowOfflineBanner(!navigator.onLine);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Handle install prompt (Android / Chrome desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Handle app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallPrompt(false);
      setShowIOSPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // iOS: show manual install prompt after a short delay
    if (detectIOS() && !isInStandaloneMode()) {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (!dismissed) {
        const timer = setTimeout(() => setShowIOSPrompt(true), 2000);
        return () => {
          clearTimeout(timer);
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
          window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
          window.removeEventListener('appinstalled', handleAppInstalled);
        };
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('PWA installed');
    }

    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    setShowIOSPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const triggerInstall = useCallback(() => {
    if (deferredPrompt) {
      handleInstall();
    } else if (isIOSDevice) {
      setShowIOSPrompt(true);
    }
  }, [deferredPrompt, isIOSDevice]);

  const contextValue: PWAContextValue = {
    isInstalled,
    canInstall: !!deferredPrompt || (isIOSDevice && !isInstalled),
    isIOS: isIOSDevice,
    triggerInstall,
  };

  return (
    <PWAContext.Provider value={contextValue}>
      {children}

      {/* Offline Banner */}
      {showOfflineBanner && (
        <div className="fixed bottom-0 left-0 right-0 bg-yellow-500 text-yellow-900 px-4 py-2 flex items-center justify-center gap-2 z-50 animate-in slide-in-from-bottom">
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Mode hors ligne - Certaines fonctionnalités peuvent être limitées</span>
          <button
            onClick={() => setShowOfflineBanner(false)}
            className="ml-2 p-1 hover:bg-yellow-600/20 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Online restored banner */}
      {isOnline && !showOfflineBanner && (
        <div id="online-indicator" className="hidden" />
      )}

      {/* Android / Chrome Install Prompt */}
      {showInstallPrompt && !isInstalled && (
        <div className="fixed bottom-4 right-4 max-w-sm bg-card border border-border rounded-xl shadow-xl p-4 z-50 animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#606338]/20 rounded-lg">
              <Download className="w-6 h-6 text-[#606338]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Installer l&apos;application</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Installez Epictete Backoffice pour un accès rapide et une utilisation hors ligne.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleInstall}
                  className="px-3 py-1.5 bg-[#606338] text-white text-sm rounded-lg hover:bg-[#4d4f2e] transition-colors"
                >
                  Installer
                </button>
                <button
                  onClick={dismissInstallPrompt}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Plus tard
                </button>
              </div>
            </div>
            <button
              onClick={dismissInstallPrompt}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* iOS Install Instructions */}
      {showIOSPrompt && !isInstalled && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm bg-card border border-border rounded-xl shadow-xl p-4 z-50 animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#606338]/20 rounded-lg shrink-0">
              <Download className="w-6 h-6 text-[#606338]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground">Installer l&apos;application</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Pour installer, appuyez sur{' '}
                <Share className="w-4 h-4 inline-block align-text-bottom text-[#606338]" />{' '}
                <span className="font-medium text-foreground">Partager</span> puis{' '}
                <span className="font-medium text-foreground">&quot;Sur l&apos;écran d&apos;accueil&quot;</span>
              </p>
              <button
                onClick={dismissInstallPrompt}
                className="mt-3 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Compris
              </button>
            </div>
            <button
              onClick={dismissInstallPrompt}
              className="p-1 text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </PWAContext.Provider>
  );
}

// Hook to check online status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// Hook to check if app is installed as PWA
export function useIsPWA() {
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    setIsPWA(isInStandaloneMode());
  }, []);

  return isPWA;
}
