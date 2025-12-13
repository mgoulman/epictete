 import type { Metadata } from "next";
import { MenuClient } from "./MenuClient";

export const metadata: Metadata = {
  title: "Menu | Epictete Restaurant",
  description: "View the latest Epictete restaurant menu.",
};

const DEFAULT_MENU_PDF = "/menu-optimized.pdf";

export default function MenuPage() {
  const pdfHref = process.env.NEXT_PUBLIC_MENU_PDF_URL ?? DEFAULT_MENU_PDF;
  return <MenuClient pdfHref={pdfHref} />;
}
