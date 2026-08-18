"use client";

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { SectionName, SiteContentRow, TestimonialItem } from '@/lib/types/site-content';
import type { Locale } from '@/lib/i18n/types';

interface SiteContentState {
  rows: SiteContentRow[];
  loading: boolean;
}

let cachedRows: SiteContentRow[] | null = null;
let fetchPromise: Promise<SiteContentRow[]> | null = null;

async function fetchAllSiteContent(): Promise<SiteContentRow[]> {
  if (cachedRows) return cachedRows;

  if (!fetchPromise) {
    fetchPromise = fetch('/api/site-content')
      .then(res => res.json())
      .then(json => {
        cachedRows = json.data || [];
        fetchPromise = null;
        return cachedRows!;
      })
      .catch(() => {
        fetchPromise = null;
        return [] as SiteContentRow[];
      });
  }

  return fetchPromise;
}

// Invalidate cache (call after saving from admin)
export function invalidateSiteContentCache() {
  cachedRows = null;
  fetchPromise = null;
}

export function useSiteContent() {
  const { locale } = useTranslation();
  const [state, setState] = useState<SiteContentState>({
    rows: cachedRows || [],
    loading: !cachedRows,
  });

  useEffect(() => {
    fetchAllSiteContent().then(rows => {
      setState({ rows, loading: false });
    });
  }, []);

  const getRow = useCallback(
    (section: SectionName): SiteContentRow | undefined => {
      return state.rows.find(r => r.section === section);
    },
    [state.rows]
  );

  // Get a text value: DB content for current locale > fallback (i18n value)
  const getSectionText = useCallback(
    (section: SectionName, key: string, fallback: string): string => {
      const row = state.rows.find(r => r.section === section);
      if (!row) return fallback;

      const localeContent = row.content[locale as Locale] as Record<string, string> | undefined;
      const value = localeContent?.[key];

      return (value && value.trim() !== '') ? value : fallback;
    },
    [state.rows, locale]
  );

  // Get testimonials array from DB or return null (use i18n fallback)
  const getTestimonials = useCallback(
    (): TestimonialItem[] | null => {
      const row = state.rows.find(r => r.section === 'testimonials');
      if (!row) return null;

      const localeContent = row.content[locale as Locale] as Record<string, unknown> | undefined;
      const reviews = localeContent?.reviews as TestimonialItem[] | undefined;

      if (!reviews || reviews.length === 0) return null;
      return reviews;
    },
    [state.rows, locale]
  );

  return {
    loading: state.loading,
    getSectionText,
    getTestimonials,
    getRow,
    rows: state.rows,
  };
}
