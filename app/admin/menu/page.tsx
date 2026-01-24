'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, MenuItem, MenuCategory } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

const ADMIN_PIN = '2025';

interface UploadedImage {
  id: string;
  url: string;
  name: string;
  file?: File;
}

export default function MenuAdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showOnlyWithoutImage, setShowOnlyWithoutImage] = useState(true);
  
  // New: Tab and matching state
  const [activeTab, setActiveTab] = useState<'match' | 'upload' | 'individual'>('match');
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<UploadedImage | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);

  // Stats
  const totalItems = menuItems.length;
  const itemsWithImage = menuItems.filter(item => item.image_url).length;
  const progress = totalItems > 0 ? Math.round((itemsWithImage / totalItems) * 100) : 0;

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, itemsRes] = await Promise.all([
        supabase.from('menu_categories').select('*').order('sort_order'),
        supabase.from('menu_items').select('*').order('sort_order')
      ]);
      
      if (catRes.data) setCategories(catRes.data);
      if (itemsRes.data) setMenuItems(itemsRes.data);
    } catch (err) {
      console.error('Error loading data:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('menu_admin_auth');
    if (saved === 'true') {
      setIsAuthenticated(true);
      loadData();
    } else {
      setLoading(false);
    }
  }, [loadData]);

  // Real-time subscription - sync across team members
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const channel = supabase
      .channel('menu_items_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'menu_items' },
        (payload) => {
          // Update local state when another team member updates an item
          setMenuItems(prev => prev.map(item => 
            item.id === payload.new.id ? { ...item, ...payload.new } : item
          ));
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      setIsAuthenticated(true);
      sessionStorage.setItem('menu_admin_auth', 'true');
      setError('');
      loadData();
    } else {
      setError('Code incorrect');
      setPin('');
    }
  };

  const handleImageUpload = async (itemId: string, file: File) => {
    setUploading(itemId);
    
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${itemId}-${Date.now()}.${fileExt}`;
      const filePath = `dishes/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('menu-images')
        .getPublicUrl(filePath);
      
      // Update menu item with image URL
      const { error: updateError } = await supabase
        .from('menu_items')
        .update({ image_url: urlData.publicUrl })
        .eq('id', itemId);
      
      if (updateError) throw updateError;
      
      // Update local state
      setMenuItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, image_url: urlData.publicUrl } : item
      ));
    } catch (err) {
      console.error('Upload error:', err);
      alert('Erreur lors du téléchargement');
    }
    
    setUploading(null);
  };

  const handleRemoveImage = async (itemId: string) => {
    if (!confirm('Supprimer cette image ?')) return;
    
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ image_url: null })
        .eq('id', itemId);
      
      if (error) throw error;
      
      setMenuItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, image_url: null } : item
      ));
    } catch (err) {
      console.error('Remove error:', err);
    }
  };

  // Bulk upload handler
  const handleBulkUpload = async (files: FileList) => {
    setBulkUploading(true);
    const newImages: UploadedImage[] = [];
    
    for (const file of Array.from(files)) {
      const id = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const url = URL.createObjectURL(file);
      newImages.push({ id, url, name: file.name, file });
    }
    
    setUploadedImages(prev => [...prev, ...newImages]);
    setBulkUploading(false);
  };

  // Match image to menu item
  const handleMatchImage = async (image: UploadedImage, itemId: string) => {
    if (!image.file) return;
    
    setUploading(itemId);
    
    try {
      const fileExt = image.name.split('.').pop();
      const fileName = `${itemId}-${Date.now()}.${fileExt}`;
      const filePath = `dishes/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(filePath, image.file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: urlData } = supabase.storage
        .from('menu-images')
        .getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from('menu_items')
        .update({ image_url: urlData.publicUrl })
        .eq('id', itemId);
      
      if (updateError) throw updateError;
      
      setMenuItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, image_url: urlData.publicUrl } : item
      ));
      
      // Remove matched image from pool
      setUploadedImages(prev => prev.filter(img => img.id !== image.id));
      setSelectedImage(null);
      
      // Clean up object URL
      URL.revokeObjectURL(image.url);
    } catch (err) {
      console.error('Match error:', err);
      alert('Erreur lors de l\'association');
    }
    
    setUploading(null);
  };

  // Remove uploaded image from pool
  const handleRemoveUploadedImage = (imageId: string) => {
    const img = uploadedImages.find(i => i.id === imageId);
    if (img) URL.revokeObjectURL(img.url);
    setUploadedImages(prev => prev.filter(i => i.id !== imageId));
    if (selectedImage?.id === imageId) setSelectedImage(null);
  };

  // Filter items
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.name_fr.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesImageFilter = !showOnlyWithoutImage || !item.image_url;
    return matchesCategory && matchesSearch && matchesImageFilter;
  });

  // PIN Entry Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-xl">
            <div className="text-center mb-8">
              <div className="text-4xl mb-3">📸</div>
              <h1 className="text-2xl font-heading text-accent mb-2">Menu Images</h1>
              <p className="text-muted-foreground text-sm">Associer les photos aux plats</p>
            </div>
            
            <form onSubmit={handlePinSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Code d&apos;accès
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  placeholder="••••"
                  maxLength={6}
                  className="w-full px-4 py-3 bg-secondary border border-border rounded-lg text-center text-2xl tracking-widest text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                  autoFocus
                />
                {error && <p className="mt-2 text-red-500 text-sm text-center">{error}</p>}
              </div>
              <Button type="submit" className="w-full" size="lg">Accéder</Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🍕</div>
          <p className="text-muted-foreground">Chargement du menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📸</span>
              <div>
                <h1 className="text-xl font-heading text-accent">Menu Images</h1>
                <p className="text-xs text-muted-foreground">Epictète Restaurant</p>
              </div>
            </div>
            
            {/* Progress */}
            <div className="hidden sm:flex items-center gap-3 bg-secondary px-4 py-2 rounded-xl">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{itemsWithImage}/{totalItems}</p>
                <p className="text-xs text-muted-foreground">photos ajoutées</p>
              </div>
              <div className="w-24 h-3 bg-background rounded-full overflow-hidden">
                <div 
                  className="h-full bg-accent transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-bold text-accent">{progress}%</span>
            </div>
            
            <div className="flex items-center gap-2">
              <a
                href="/admin"
                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Retour
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  sessionStorage.removeItem('menu_admin_auth');
                  setIsAuthenticated(false);
                }}
              >
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('match')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'match' 
                  ? 'border-accent text-accent' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              🎯 Associer Images ({uploadedImages.length})
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'upload' 
                  ? 'border-accent text-accent' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              📤 Upload en Masse
            </button>
            <button
              onClick={() => setActiveTab('individual')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'individual' 
                  ? 'border-accent text-accent' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              📷 Mode Individuel
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'upload' && (
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-heading text-foreground mb-2">Upload en Masse</h2>
              <p className="text-muted-foreground">
                Uploadez toutes vos images d&apos;un coup, puis associez-les aux plats dans l&apos;onglet &quot;Associer&quot;
              </p>
            </div>
            
            <label className={`block border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              bulkUploading ? 'border-accent bg-accent/10' : 'border-border hover:border-accent hover:bg-accent/5'
            }`}>
              {bulkUploading ? (
                <div className="animate-spin text-5xl mb-4">⏳</div>
              ) : (
                <div className="text-5xl mb-4">📁</div>
              )}
              <p className="text-lg font-medium text-foreground mb-2">
                {bulkUploading ? 'Chargement...' : 'Glissez vos images ici'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                ou cliquez pour sélectionner
              </p>
              <p className="text-xs text-muted-foreground">
                JPG, PNG, WebP • Plusieurs fichiers autorisés
              </p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => e.target.files && handleBulkUpload(e.target.files)}
                className="hidden"
                disabled={bulkUploading}
              />
            </label>

            {uploadedImages.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-foreground">
                    {uploadedImages.length} image{uploadedImages.length > 1 ? 's' : ''} prête{uploadedImages.length > 1 ? 's' : ''}
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('match')}
                  >
                    Associer maintenant →
                  </Button>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {uploadedImages.slice(0, 12).map(img => (
                    <div key={img.id} className="aspect-square rounded-lg overflow-hidden bg-secondary">
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {uploadedImages.length > 12 && (
                    <div className="aspect-square rounded-lg bg-secondary flex items-center justify-center">
                      <span className="text-muted-foreground text-sm">+{uploadedImages.length - 12}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'match' && (
        <div className="flex-1 flex overflow-hidden" style={{ height: 'calc(100vh - 180px)' }}>
          {/* Left Panel: Uploaded Images */}
          <div className="w-80 border-r border-border bg-card/50 flex flex-col">
            <div className="p-4 border-b border-border">
              <h3 className="font-medium text-foreground mb-2">Images à associer</h3>
              <p className="text-xs text-muted-foreground">
                {uploadedImages.length === 0 
                  ? 'Uploadez des images dans l\'onglet "Upload"' 
                  : 'Cliquez sur une image, puis sur un plat'}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {uploadedImages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3 opacity-50">📤</div>
                  <p className="text-sm text-muted-foreground mb-4">Aucune image</p>
                  <Button size="sm" onClick={() => setActiveTab('upload')}>
                    Uploader des images
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {uploadedImages.map(img => (
                    <div
                      key={img.id}
                      onClick={() => setSelectedImage(selectedImage?.id === img.id ? null : img)}
                      className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all ${
                        selectedImage?.id === img.id 
                          ? 'ring-2 ring-accent ring-offset-2 ring-offset-background scale-95' 
                          : 'hover:opacity-80'
                      }`}
                    >
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemoveUploadedImage(img.id); }}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      >
                        ✕
                      </button>
                      {selectedImage?.id === img.id && (
                        <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                          <span className="bg-accent text-white text-xs px-2 py-1 rounded-full">Sélectionnée</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Menu Items */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un plat..."
                  className="w-full pl-10 pr-4 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm"
              >
                <option value="">Toutes</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name_fr}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showOnlyWithoutImage}
                  onChange={(e) => setShowOnlyWithoutImage(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span>Sans photo</span>
              </label>
            </div>
            
            {selectedImage && (
              <div className="px-4 py-2 bg-accent/10 border-b border-accent/30 flex items-center gap-3">
                <img src={selectedImage.url} alt="" className="w-10 h-10 rounded object-cover" />
                <span className="text-sm text-foreground">Cliquez sur un plat pour associer cette image</span>
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="ml-auto text-sm text-muted-foreground hover:text-foreground"
                >
                  Annuler
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => selectedImage && handleMatchImage(selectedImage, item.id)}
                    className={`p-3 bg-card border rounded-xl transition-all ${
                      item.image_url 
                        ? 'border-green-500/30 opacity-50' 
                        : selectedImage 
                          ? 'border-accent cursor-pointer hover:bg-accent/10 hover:scale-[1.02]' 
                          : 'border-border'
                    } ${uploading === item.id ? 'opacity-50 pointer-events-none' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0 overflow-hidden">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                        ) : uploading === item.id ? (
                          <span className="animate-spin">⏳</span>
                        ) : (
                          <span className="text-xl opacity-30">📷</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground text-sm truncate">{item.name}</h4>
                        <p className="text-xs text-muted-foreground truncate">{item.name_fr}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-accent font-bold text-sm">{item.price} DH</span>
                        {item.image_url && <span className="block text-green-500 text-xs">✓</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'individual' && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un plat..."
                className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="px-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">Toutes les catégories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name_fr}
                </option>
              ))}
            </select>
            
            <label className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl cursor-pointer hover:border-accent transition-colors">
              <input
                type="checkbox"
                checked={showOnlyWithoutImage}
                onChange={(e) => setShowOnlyWithoutImage(e.target.checked)}
                className="w-4 h-4 rounded border-border text-accent focus:ring-accent"
              />
              <span className="text-sm">Sans photo uniquement</span>
            </label>
            
            <div className="flex items-center bg-card border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-sm ${viewMode === 'grid' ? 'bg-accent text-white' : 'hover:bg-secondary'}`}
              >
                ▦ Grille
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-accent text-white' : 'hover:bg-secondary'}`}
              >
                ☰ Liste
              </button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            {filteredItems.length} plat{filteredItems.length > 1 ? 's' : ''} 
            {selectedCategory && ` dans ${categories.find(c => c.id === selectedCategory)?.name_fr}`}
            {showOnlyWithoutImage && ' sans photo'}
          </p>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map(item => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  category={categories.find(c => c.id === item.category_id)}
                  uploading={uploading === item.id}
                  onUpload={(file) => handleImageUpload(item.id, file)}
                  onRemove={() => handleRemoveImage(item.id)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map(item => (
                <MenuItemRow
                  key={item.id}
                  item={item}
                  category={categories.find(c => c.id === item.category_id)}
                  uploading={uploading === item.id}
                  onUpload={(file) => handleImageUpload(item.id, file)}
                  onRemove={() => handleRemoveImage(item.id)}
                />
              ))}
            </div>
          )}

          {filteredItems.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">🔍</div>
              <p className="text-muted-foreground">Aucun plat trouvé</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Grid Card Component
function MenuItemCard({ 
  item, 
  category, 
  uploading, 
  onUpload, 
  onRemove 
}: { 
  item: MenuItem; 
  category?: MenuCategory;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div className={`bg-card border rounded-xl overflow-hidden transition-all hover:shadow-lg ${
      item.image_url ? 'border-green-500/30' : 'border-border'
    }`}>
      {/* Image Area */}
      <div className="relative aspect-square bg-secondary">
        {item.image_url ? (
          <>
            <img 
              src={item.image_url} 
              alt={item.name}
              className="w-full h-full object-cover"
            />
            <button
              onClick={onRemove}
              className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              title="Supprimer l'image"
            >
              ✕
            </button>
            <div className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs rounded-full">
              ✓ Photo
            </div>
          </>
        ) : (
          <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-accent/10 transition-colors">
            {uploading ? (
              <div className="animate-spin text-3xl">⏳</div>
            ) : (
              <>
                <div className="text-4xl mb-2 opacity-40">📷</div>
                <span className="text-sm text-muted-foreground">Ajouter une photo</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
          </label>
        )}
      </div>
      
      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-medium text-foreground text-sm leading-tight">{item.name}</h3>
          <span className="text-accent font-bold text-sm whitespace-nowrap">{item.price} DH</span>
        </div>
        {category && (
          <p className="text-xs text-muted-foreground">
            {category.icon} {category.name_fr}
          </p>
        )}
        {item.is_signature && (
          <span className="inline-block mt-1 px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full">
            ⭐ Signature
          </span>
        )}
      </div>
    </div>
  );
}

// List Row Component
function MenuItemRow({ 
  item, 
  category, 
  uploading, 
  onUpload, 
  onRemove 
}: { 
  item: MenuItem; 
  category?: MenuCategory;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div className={`flex items-center gap-4 p-3 bg-card border rounded-xl transition-all hover:shadow-md ${
      item.image_url ? 'border-green-500/30' : 'border-border'
    }`}>
      {/* Thumbnail */}
      <div className="relative w-16 h-16 shrink-0 bg-secondary rounded-lg overflow-hidden">
        {item.image_url ? (
          <img 
            src={item.image_url} 
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl opacity-30">
            📷
          </div>
        )}
        {item.image_url && (
          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
            <span className="text-green-500 text-lg">✓</span>
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-foreground truncate">{item.name}</h3>
          {item.is_signature && (
            <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full shrink-0">
              ⭐ Signature
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{item.description}</p>
        {category && (
          <p className="text-xs text-muted-foreground mt-1">
            {category.icon} {category.name_fr}
          </p>
        )}
      </div>
      
      {/* Price */}
      <div className="text-right shrink-0">
        <span className="text-accent font-bold">{item.price} DH</span>
      </div>
      
      {/* Actions */}
      <div className="shrink-0 flex items-center gap-2">
        {item.image_url ? (
          <button
            onClick={onRemove}
            className="px-3 py-1.5 bg-red-500/10 text-red-500 text-sm rounded-lg hover:bg-red-500/20 transition-colors"
          >
            Supprimer
          </button>
        ) : (
          <label className={`px-3 py-1.5 bg-accent text-white text-sm rounded-lg cursor-pointer hover:bg-accent/80 transition-colors ${uploading ? 'opacity-50 cursor-wait' : ''}`}>
            {uploading ? 'Envoi...' : 'Ajouter photo'}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
          </label>
        )}
      </div>
    </div>
  );
}
