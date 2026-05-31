"use client";

import { useContext } from "react";
import { LanguageContext } from "./context";

export function useTranslation() {
  const { locale, setLocale, t } = useContext(LanguageContext);
  return { locale, setLocale, t };
}
