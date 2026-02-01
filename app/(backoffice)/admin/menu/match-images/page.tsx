'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createSupabaseBrowserClient } from '@/lib/auth/supabase-browser';
import type { MenuItem, MenuCategory } from '@/lib/supabase';
import { PermissionGate } from '@/components/backoffice/auth/PermissionGate';
import { Upload, Loader2, ArrowLeft, Check, Search, X, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const MAX_SIZE = 1600;
const QUALITY = 0.85;

function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const name = file.name.replace(/\.[^.]+$/, '.jpg');
          resolve(new File([blob], name, { type: 'image/jpeg' }));
        },
        'image/jpeg',
        QUALITY,
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export default function MatchImagesPage() {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected image (local file, not yet uploaded to storage)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successDish, setSuccessDish] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [matchedCount, setMatchedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [c, i] = await Promise.all([
      supabase.from('menu_categories').select('*').order('sort_order'),
      supabase.from('menu_items').select('*').order('name_fr'),
    ]);
    if (c.data) setCategories(c.data);
    if (i.data) setItems(i.data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const dishesNeeding = items.filter(i => !i.image_url);
  const totalNeeding = dishesNeeding.length;

  const getCatName = (id: string | null) => categories.find(c => c.id === id)?.name_fr ?? '';
  const getCatIcon = (id: string | null) => categories.find(c => c.id === id)?.icon ?? '';

  // Pick image from file input
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    e.target.value = '';
  };

  // Clear selected image
  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setSearch('');
    setError(null);
  };

  // Upload image + assign to dish + show success + reload
  const assignToDish = async (dishId: string, dishName: string) => {
    if (!selectedFile || saving) return;
    setSaving(true);
    setError(null);

    try {
      // 1. Compress and upload to storage
      const compressed = await compressImage(selectedFile);
      const fd = new FormData();
      fd.append('file', compressed);
      fd.append('bucket', 'menu-images');
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}));
        throw new Error(data.error || 'Upload failed');
      }
      const { url } = await uploadRes.json();

      // 2. Save to menu item
      const saveRes = await fetch('/api/menu-items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: dishId, image_url: url }),
      });
      if (!saveRes.ok) throw new Error('Failed to save');

      // 3. Show success
      setSaving(false);
      setMatchedCount(c => c + 1);
      setSuccessDish(dishName);

      // 4. After 1.5s, clear and reload
      setTimeout(async () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setSelectedFile(null);
        setPreviewUrl(null);
        setSearch('');
        setSuccessDish(null);
        await loadData();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  };

  // Filter dishes by search
  const filtered = dishesNeeding.filter(d => {
    if (!search) return true;
    const q = search.toLowerCase();
    return d.name_fr.toLowerCase().includes(q) || d.name.toLowerCase().includes(q) || getCatName(d.category_id).toLowerCase().includes(q);
  });

  // Group by category
  const grouped = categories
    .map(cat => ({
      cat,
      dishes: filtered.filter(d => d.category_id === cat.id),
    }))
    .filter(g => g.dishes.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-6 h-6 border-2 border-[#606338] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <PermissionGate permission="menu.write" fallback={<div className="flex items-center justify-center h-[50vh]"><p className="text-muted-foreground">No permission</p></div>}>
      <div className="flex flex-col gap-4 max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/admin/menu" className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Match Images</h1>
            <p className="text-xs text-muted-foreground">
              {totalNeeding} dishes need images{matchedCount > 0 && <> &middot; {matchedCount} matched this session</>}
            </p>
          </div>
        </div>

        {/* Progress */}
        {items.length > 0 && (
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-[#606338] rounded-full transition-all duration-500"
              style={{ width: `${((items.length - totalNeeding) / items.length) * 100}%` }}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* Success */}
        {successDish && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 animate-in fade-in duration-300">
            <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="w-7 h-7 text-green-500" />
            </div>
            <p className="text-foreground font-medium">Image saved!</p>
            <p className="text-sm text-muted-foreground">{successDish}</p>
          </div>
        )}

        {successDish ? null : totalNeeding === 0 ? (
          /* All done */
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-foreground font-medium">All dishes have images!</p>
            {matchedCount > 0 && <p className="text-sm text-muted-foreground">{matchedCount} matched this session</p>}
            <Link href="/admin/menu" className="mt-2 px-5 py-2.5 border border-border rounded-lg text-sm text-foreground hover:bg-secondary transition-colors">
              Back to Menu
            </Link>
          </div>
        ) : !selectedFile ? (
          /* Step 1: Pick an image */
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-all border-border hover:border-[#606338]/50 hover:bg-[#606338]/5"
          >
            <Upload className="w-10 h-10 text-muted" />
            <p className="text-foreground font-medium">Select a dish photo</p>
            <p className="text-xs text-muted-foreground">Tap to choose an image from your device</p>
            <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
          </div>
        ) : (
          /* Step 2: Image selected — pick a dish */
          <>
            {/* Image preview */}
            <div className="flex flex-col items-center gap-3 p-4 bg-secondary border border-border rounded-xl">
              <div className="w-full max-w-sm aspect-square rounded-lg overflow-hidden border border-border">
                <img src={previewUrl!} alt="Selected" className="w-full h-full object-cover" />
              </div>
              <div className="flex items-center justify-between w-full">
                <p className="text-sm text-muted-foreground truncate">{selectedFile.name}</p>
                <button
                  onClick={clearSelection}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-card text-muted-foreground text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                  Change
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Select a dish below to assign this image</p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search dishes..."
                className="w-full pl-9 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[#606338]"
              />
            </div>

            {/* Saving overlay */}
            {saving && (
              <div className="flex items-center justify-center gap-2 py-3">
                <Loader2 className="w-4 h-4 text-[#606338] animate-spin" />
                <p className="text-sm text-muted-foreground">Saving...</p>
              </div>
            )}

            {/* Dish list grouped by category */}
            <div className="flex flex-col gap-3 max-h-[55vh] overflow-y-auto">
              {grouped.map(({ cat, dishes }) => (
                <div key={cat.id}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 px-1">
                    {cat.icon} {cat.name_fr}
                  </p>
                  <div className="grid gap-1.5">
                    {dishes.map(dish => (
                      <button
                        key={dish.id}
                        disabled={saving}
                        onClick={() => assignToDish(dish.id, dish.name_fr)}
                        className="flex items-center gap-3 px-3 py-2.5 bg-secondary border border-border rounded-lg text-left hover:bg-[#606338]/10 hover:border-[#606338]/30 transition-all disabled:opacity-50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{dish.name_fr}</p>
                          <p className="text-xs text-muted-foreground truncate">{dish.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {grouped.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No dishes found</p>
              )}
            </div>
          </>
        )}
      </div>
    </PermissionGate>
  );
}
