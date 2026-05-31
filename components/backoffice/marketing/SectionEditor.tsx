'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Save, RotateCcw, Check } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { invalidateSiteContentCache } from '@/lib/hooks/useSiteContent';
import type { SectionName, SiteContentRow } from '@/lib/types/site-content';

interface BilingualFieldProps {
  label: string;
  fieldKey: string;
  frValue: string;
  enValue: string;
  onChangeFr: (key: string, value: string) => void;
  onChangeEn: (key: string, value: string) => void;
  multiline?: boolean;
  placeholder?: string;
}

export function BilingualField({
  label,
  fieldKey,
  frValue,
  enValue,
  onChangeFr,
  onChangeEn,
  multiline = false,
  placeholder,
}: BilingualFieldProps) {
  const { t } = useTranslation();
  const m = t.backoffice.marketing;

  const InputComponent = multiline ? 'textarea' : 'input';
  const inputClass =
    'w-full py-2 px-3 bg-card border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/40 placeholder:text-muted-foreground/50';

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <span className="text-xs text-muted-foreground mb-1 block">{m.french}</span>
          <InputComponent
            value={frValue}
            onChange={(e) => onChangeFr(fieldKey, e.target.value)}
            placeholder={placeholder || m.emptyFieldHint}
            className={`${inputClass} ${multiline ? 'min-h-[80px] resize-y' : ''}`}
            {...(multiline ? { rows: 3 } : { type: 'text' })}
          />
        </div>
        <div>
          <span className="text-xs text-muted-foreground mb-1 block">{m.english}</span>
          <InputComponent
            value={enValue}
            onChange={(e) => onChangeEn(fieldKey, e.target.value)}
            placeholder={placeholder || m.emptyFieldHint}
            className={`${inputClass} ${multiline ? 'min-h-[80px] resize-y' : ''}`}
            {...(multiline ? { rows: 3 } : { type: 'text' })}
          />
        </div>
      </div>
    </div>
  );
}

interface SectionEditorWrapperProps {
  section: SectionName;
  row: SiteContentRow | undefined;
  onSaved: () => void;
  children: (props: {
    frData: Record<string, string>;
    enData: Record<string, string>;
    setFrField: (key: string, value: string) => void;
    setEnField: (key: string, value: string) => void;
    fullContent: Record<string, unknown>;
    setFullContent: React.Dispatch<React.SetStateAction<Record<string, unknown>>>;
  }) => React.ReactNode;
}

export function SectionEditorWrapper({ section, row, onSaved, children }: SectionEditorWrapperProps) {
  const { t } = useTranslation();
  const m = t.backoffice.marketing;

  const [fullContent, setFullContent] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Initialize from row
  useEffect(() => {
    if (row) {
      setFullContent(row.content as Record<string, unknown> || {});
    } else {
      setFullContent({});
    }
  }, [row]);

  const frData = (fullContent.fr || {}) as Record<string, string>;
  const enData = (fullContent.en || {}) as Record<string, string>;

  const setFrField = useCallback((key: string, value: string) => {
    setFullContent(prev => ({
      ...prev,
      fr: { ...(prev.fr as Record<string, string> || {}), [key]: value },
    }));
    setSaved(false);
  }, []);

  const setEnField = useCallback((key: string, value: string) => {
    setFullContent(prev => ({
      ...prev,
      en: { ...(prev.en as Record<string, string> || {}), [key]: value },
    }));
    setSaved(false);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase
        .from('site_content')
        .update({
          content: fullContent,
          updated_at: new Date().toISOString(),
        })
        .eq('section', section);

      if (error) throw error;

      invalidateSiteContentCache();
      setSaved(true);
      onSaved();
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm(m.resetConfirm)) return;
    setSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase
        .from('site_content')
        .update({
          content: {},
          updated_at: new Date().toISOString(),
        })
        .eq('section', section);

      if (error) throw error;

      setFullContent({});
      invalidateSiteContentCache();
      onSaved();
    } catch (err) {
      console.error('Failed to reset:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {children({ frData, enData, setFrField, setEnField, fullContent, setFullContent })}

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-4 border-t border-border">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#606338] hover:bg-[#4d4f2e] text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? m.saving : saved ? m.saved : m.save}
        </button>
        <button
          onClick={handleReset}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border hover:bg-secondary text-foreground rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          {m.resetToDefault}
        </button>
      </div>
    </div>
  );
}
