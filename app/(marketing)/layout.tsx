import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SplashScreen } from "@/components/splash-screen";
import Script from "next/script";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark">
      {/* Unregister backoffice SW on marketing pages so it doesn't redirect */}
      <Script id="sw-cleanup" strategy="afterInteractive">{`
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then(function(registrations) {
            registrations.forEach(function(reg) {
              if (reg.active && reg.active.scriptURL.includes('backoffice-sw')) {
                reg.unregister().then(function() {
                  console.log('Backoffice SW unregistered on marketing page');
                });
              }
            });
          });
        }
      `}</Script>
      <SplashScreen />
      <Header hideThemeToggle />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
