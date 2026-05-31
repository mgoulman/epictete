'use client';

import { Plus, Trash2, Star } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { TestimonialItem } from '@/lib/types/site-content';

interface TestimonialsEditorProps {
  locale: 'fr' | 'en';
  reviews: TestimonialItem[];
  onChange: (reviews: TestimonialItem[]) => void;
}

export function TestimonialsEditor({ locale, reviews, onChange }: TestimonialsEditorProps) {
  const { t } = useTranslation();
  const mt = t.backoffice.marketing.testimonials;
  const label = locale === 'fr' ? t.backoffice.marketing.french : t.backoffice.marketing.english;

  const addReview = () => {
    onChange([...reviews, { name: '', role: '', content: '', source: 'Google', rating: 5 }]);
  };

  const removeReview = (index: number) => {
    onChange(reviews.filter((_, i) => i !== index));
  };

  const updateReview = (index: number, field: keyof TestimonialItem, value: string | number) => {
    onChange(reviews.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const inputClass =
    'w-full py-2 px-3 bg-card border border-border rounded-lg text-foreground text-sm outline-none focus:border-[#606338]/40';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
        <button
          onClick={addReview}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#606338] hover:bg-[#4d4f2e] text-white rounded-lg text-xs font-medium transition-colors"
        >
          <Plus className="w-3 h-3" />
          {mt.addReview}
        </button>
      </div>

      {reviews.map((review, index) => (
        <div key={index} className="p-4 bg-secondary rounded-xl border border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">#{index + 1}</span>
            <button
              onClick={() => removeReview(index)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              {mt.removeReview}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">{mt.reviewName}</label>
              <input
                type="text"
                value={review.name || ''}
                onChange={(e) => updateReview(index, 'name', e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{mt.reviewRole}</label>
              <input
                type="text"
                value={review.role || ''}
                onChange={(e) => updateReview(index, 'role', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">{mt.reviewContent}</label>
            <textarea
              value={review.content || ''}
              onChange={(e) => updateReview(index, 'content', e.target.value)}
              rows={2}
              className={`${inputClass} min-h-[60px] resize-y`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">{mt.reviewSource}</label>
              <select
                value={review.source || 'Google'}
                onChange={(e) => updateReview(index, 'source', e.target.value)}
                className={inputClass}
              >
                <option value="Google">Google</option>
                <option value="Instagram">Instagram</option>
                <option value="TripAdvisor">TripAdvisor</option>
                <option value="Facebook">Facebook</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{mt.reviewRating}</label>
              <div className="flex items-center gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => updateReview(index, 'rating', star)}
                    className="p-0.5"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= (review.rating || 5)
                          ? 'fill-accent text-accent'
                          : 'text-border'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}

      {reviews.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t.backoffice.marketing.emptyFieldHint}
        </p>
      )}
    </div>
  );
}
