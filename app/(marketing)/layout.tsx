import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { SplashScreen } from "@/components/splash-screen";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dark">
      <SplashScreen />
      <Header hideThemeToggle />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
