'use client';

// F2a — Stock-count sheet: print a digit-box paper sheet (achat or sortie, by
// category or all), fill it by hand, then scan/upload it and enter the numbers on
// a validation grid that saves through the existing achat/sortie flow. The printed
// sheet already carries the QR + corner registration marks that F2b's offline OCR
// will use to auto-fill the grid — so the paper format is final now and F2b only
// adds the reading step.

import { useMemo, useState } from 'react';
import {
  Printer, ClipboardCheck, Upload, Camera, Loader2, Save, ArrowLeft, FileText, Boxes, ScanLine,
} from 'lucide-react';
import { uploadFile } from '@/lib/client-upload';

interface CountItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  cost_per_unit: number;
  category_id: string | null;
  inventory_category: { id: string; name: string } | null;
}
interface CountCategory { id: string; name: string; }

interface Props {
  items: CountItem[];
  categories: CountCategory[];
  onSaved: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

type Mode = 'achat' | 'sortie';
type Step = 'setup' | 'validate';
interface Row { item_id: string; name: string; unit: string; quantity: string; unit_cost: string; }

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] || ch));

export default function StockCountSheet({ items, categories, onSaved, showToast }: Props) {
  const today = new Date().toISOString().split('T')[0];
  const [mode, setMode] = useState<Mode>('achat');
  const [scope, setScope] = useState<string>('all'); // 'all' | categoryId
  const [countDate, setCountDate] = useState(today);
  const [step, setStep] = useState<Step>('setup');
  const [rows, setRows] = useState<Row[]>([]);
  const [scanUrl, setScanUrl] = useState<string | null>(null);
  const [scanIsImage, setScanIsImage] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const selectedProducts = useMemo(() => {
    const list = scope === 'all'
      ? items
      : items.filter(i => (i.category_id || i.inventory_category?.id) === scope);
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [items, scope]);

  const scopeLabel = scope === 'all'
    ? 'Toutes catégories'
    : (categories.find(c => c.id === scope)?.name || '—');

  // ── Print the digit-box sheet ───────────────────────────────────────────
  const generateSheet = async () => {
    if (!selectedProducts.length) { showToast('Aucun produit dans cette sélection', 'error'); return; }
    setGenerating(true);
    try {
      // Compact sheet descriptor for F2b's offline OCR: it reconstructs the exact
      // row order by loading this scope sorted by name. We deliberately DON'T embed
      // every product UUID — 210 of them overflow a QR code — and the descriptor
      // stays tiny regardless of how many products are on the sheet.
      const payload = JSON.stringify({ v: 1, mode, date: countDate, scope, sort: 'name', n: selectedProducts.length });
      let qr = '';
      try {
        const QRCode = (await import('qrcode')).default;
        qr = await QRCode.toDataURL(payload, { margin: 1, width: 160, errorCorrectionLevel: 'M' });
      } catch {
        qr = ''; // never let a QR failure block printing
      }

      const win = window.open('', '_blank', 'width=820,height=1040');
      if (!win) { showToast('Autorisez les pop-ups pour imprimer', 'error'); return; }

      const boxCss = 'display:inline-block;width:6mm;height:8mm;border:0.4mm solid #333;margin:0 0.35mm;vertical-align:middle;border-radius:0.6mm;';
      const oneBox = `<span style="${boxCss}"></span>`;
      const dot = '<span style="display:inline-block;vertical-align:middle;margin:0 0.5mm;font-weight:bold;">.</span>';
      const priceBoxes = `${oneBox.repeat(4)}${dot}${oneBox.repeat(2)}`; // 9999.99
      const qtyBoxes = `${oneBox.repeat(4)}${dot}${oneBox.repeat(1)}`;    // 9999.9

      const rowsHtml = selectedProducts.map((p, idx) => `
        <tr>
          <td class="idx">${idx + 1}</td>
          <td class="pname">${esc(p.name)}${p.unit ? `<span class="unit">${esc(p.unit)}</span>` : ''}</td>
          ${mode === 'achat' ? `<td class="boxes">${priceBoxes}</td>` : ''}
          <td class="boxes">${qtyBoxes}</td>
        </tr>`).join('');

      const marks = ['top:5mm;left:5mm', 'top:5mm;right:5mm', 'bottom:5mm;left:5mm', 'bottom:5mm;right:5mm']
        .map(pos => `<div style="position:fixed;${pos};width:6mm;height:6mm;background:#000;"></div>`).join('');

      const logoUrl = `${window.location.origin}/logos/Logo-full-no-bg.png`;
      const dateLabel = new Date(countDate + 'T12:00:00').toLocaleDateString('fr-FR');

      win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Feuille de comptage — ${esc(scopeLabel)}</title>
        <style>
          @page { size: A4 portrait; margin: 16mm 12mm; }
          * { box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; color:#111; font-size:11pt; margin:0; }
          .head { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #606338; padding-bottom:4mm; margin-bottom:3mm; }
          .head img { height:15mm; display:block; margin-bottom:2mm; }
          .title { font-size:14pt; font-weight:bold; color:#606338; text-transform:uppercase; }
          .meta { font-size:10pt; color:#333; margin-top:1mm; }
          .qr { text-align:right; } .qr img { width:26mm; height:26mm; } .qr .cap { font-size:6.5pt; color:#999; margin-top:1mm; }
          table { width:100%; border-collapse:collapse; }
          th, td { border:0.3mm solid #bbb; padding:1.6mm 2mm; }
          th { background:#606338; color:#fff; font-size:9pt; text-transform:uppercase; text-align:left; }
          td.idx { width:8mm; text-align:center; color:#999; font-size:9pt; }
          td.pname { font-weight:600; }
          td.pname .unit { color:#999; font-weight:normal; font-size:8pt; margin-left:2mm; }
          td.boxes { white-space:nowrap; text-align:center; width:${mode === 'achat' ? '48mm' : '40mm'}; }
          tbody tr { page-break-inside:avoid; }
          .note { font-size:8.5pt; color:#666; margin-bottom:3mm; }
          @media print { .no-print { display:none; } }
        </style></head><body>
        ${marks}
        <div class="head">
          <div>
            <img src="${logoUrl}" alt="Epictète">
            <div class="title">Feuille de comptage — ${mode === 'achat' ? 'Achat' : 'Sortie'}</div>
            <div class="meta">${esc(scopeLabel)} &middot; ${dateLabel} &middot; ${selectedProducts.length} produits</div>
          </div>
          ${qr ? `<div class="qr"><img src="${qr}" alt="code"><div class="cap">Ne pas plier ni couper</div></div>` : ''}
        </div>
        <div class="note">Écrivez un seul chiffre par case, aligné à droite. Laissez la ligne vide si le produit n'est pas compté.</div>
        <table>
          <thead><tr><th>#</th><th>Produit</th>${mode === 'achat' ? '<th>Prix unitaire (DH)</th>' : ''}<th>Quantité</th></tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <div class="no-print" style="text-align:center;margin-top:8mm;">
          <button onclick="window.print()" style="padding:8px 18px;font-size:13px;cursor:pointer;">Imprimer</button>
        </div>
      </body></html>`);
      win.document.close();
    } finally {
      setGenerating(false);
    }
  };

  // ── Move to the validation grid ─────────────────────────────────────────
  const startValidation = () => {
    if (!selectedProducts.length) { showToast('Aucun produit dans cette sélection', 'error'); return; }
    setRows(selectedProducts.map(p => ({
      item_id: p.id,
      name: p.name,
      unit: p.unit || '',
      quantity: '',
      unit_cost: mode === 'achat' && p.cost_per_unit ? String(p.cost_per_unit) : '',
    })));
    setScanUrl(null);
    setScanIsImage(false);
    setStep('validate');
  };

  const handleScanUpload = async (fileList: FileList | null) => {
    const files = fileList ? Array.from(fileList) : [];
    if (!files.length) return;
    setUploading(true);
    try {
      const res = await uploadFile(files[0], 'stock-counts');
      setScanUrl(res.url);
      setScanIsImage(files[0].type.startsWith('image/'));
      showToast('Scan importé');
    } catch {
      showToast("Import du scan impossible", 'error');
    } finally {
      setUploading(false);
    }
  };

  const updateRow = (i: number, patch: Partial<Row>) =>
    setRows(rs => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const filledCount = rows.filter(r => (parseFloat(r.quantity) || 0) > 0).length;

  const save = async () => {
    const filled = rows.filter(r => (parseFloat(r.quantity) || 0) > 0);
    if (!filled.length) { showToast('Renseignez au moins une quantité', 'error'); return; }
    setSaving(true);
    try {
      const noteSuffix = scanUrl ? ` · scan: ${scanUrl}` : '';
      const endpoint = mode === 'achat' ? '/api/inventory/daily-purchase' : '/api/inventory/daily-usage';
      const itemsPayload = filled.map(r => mode === 'achat'
        ? { inventory_item_id: r.item_id, quantity: parseFloat(r.quantity) || 0, unit_cost: parseFloat(r.unit_cost) || 0, notes: `Comptage${noteSuffix}` }
        : { inventory_item_id: r.item_id, quantity: parseFloat(r.quantity) || 0, notes: `Comptage${noteSuffix}` });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: countDate, items: itemsPayload }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.pending) {
        showToast('Soumis pour approbation');
      } else if (res.ok && (data.success || data.count !== undefined)) {
        showToast(mode === 'achat' ? 'Achats enregistrés !' : 'Sorties enregistrées !');
      } else {
        showToast(data.error || "Échec de l'enregistrement", 'error');
        setSaving(false);
        return;
      }
      onSaved();
      setStep('setup');
    } catch {
      showToast("Échec de l'enregistrement", 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  if (step === 'validate') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button onClick={() => setStep('setup')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{mode === 'achat' ? 'Achat' : 'Sortie'}</span> · {scopeLabel} · {new Date(countDate + 'T12:00:00').toLocaleDateString('fr-FR')}
          </div>
        </div>

        {/* Scan attach (stored in Blob for audit; F2b will read it to pre-fill) */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs cursor-pointer hover:bg-secondary transition-colors">
            <Upload className="w-3.5 h-3.5" /> Importer le scan
            <input type="file" accept="image/*,application/pdf" className="hidden"
              onChange={e => { handleScanUpload(e.target.files); e.target.value = ''; }} />
          </label>
          <label className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-xs cursor-pointer hover:bg-secondary transition-colors">
            <Camera className="w-3.5 h-3.5" /> Prendre une photo
            <input type="file" accept="image/*" capture="environment" className="hidden"
              onChange={e => { handleScanUpload(e.target.files); e.target.value = ''; }} />
          </label>
          {uploading && <Loader2 className="w-4 h-4 animate-spin text-[#606338]" />}
          {scanUrl && (
            <a href={scanUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs">
              {scanIsImage ? <ScanLine className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />} Scan joint
            </a>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-secondary z-10">
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2 font-semibold">Produit</th>
                  {mode === 'achat' && <th className="px-3 py-2 font-semibold text-right w-32">Prix unitaire</th>}
                  <th className="px-3 py-2 font-semibold text-right w-32">Quantité</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const active = (parseFloat(r.quantity) || 0) > 0;
                  return (
                    <tr key={r.item_id} className={`border-t border-border ${active ? 'bg-emerald-500/5' : ''}`}>
                      <td className="px-3 py-1.5">
                        <span className="font-medium">{r.name}</span>
                        {r.unit && <span className="text-xs text-muted-foreground ml-2">{r.unit}</span>}
                      </td>
                      {mode === 'achat' && (
                        <td className="px-3 py-1.5 text-right">
                          <input
                            type="number" min="0" step="0.01" max="9999.99"
                            value={r.unit_cost}
                            onChange={e => updateRow(i, { unit_cost: e.target.value })}
                            placeholder="0.00"
                            className="w-24 px-2 py-1 bg-secondary border border-border rounded text-right text-sm"
                          />
                        </td>
                      )}
                      <td className="px-3 py-1.5 text-right">
                        <input
                          type="number" min="0" step="0.1"
                          value={r.quantity}
                          onChange={e => updateRow(i, { quantity: e.target.value })}
                          placeholder="0"
                          className="w-24 px-2 py-1 bg-secondary border border-border rounded text-right text-sm"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <span className="text-sm text-muted-foreground">{filledCount} produit(s) renseigné(s)</span>
          <button
            onClick={save}
            disabled={saving || filledCount === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#606338] text-white rounded-xl text-sm font-semibold hover:bg-[#4d4f2e] disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {mode === 'achat' ? 'Enregistrer les achats' : 'Enregistrer les sorties'}
          </button>
        </div>
      </div>
    );
  }

  // setup step
  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-2">
        <Boxes className="w-5 h-5 text-[#606338]" />
        <h3 className="font-semibold text-foreground">Feuille de comptage</h3>
      </div>
      <p className="text-sm text-muted-foreground -mt-3">
        Imprimez une feuille avec cases à chiffres, remplissez-la à la main, puis scannez-la et saisissez les valeurs pour mettre à jour le stock.
      </p>

      {/* Mode */}
      <div>
        <span className="text-xs font-semibold uppercase text-muted-foreground">Type</span>
        <div className="flex gap-2 mt-1.5">
          <button
            onClick={() => setMode('achat')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${mode === 'achat' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-secondary text-muted-foreground border-border hover:text-foreground'}`}
          >
            Achat (prix + quantité)
          </button>
          <button
            onClick={() => setMode('sortie')}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${mode === 'sortie' ? 'bg-red-500 text-white border-red-500' : 'bg-secondary text-muted-foreground border-border hover:text-foreground'}`}
          >
            Sortie (quantité)
          </button>
        </div>
      </div>

      {/* Scope + date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Catégorie</span>
          <select
            value={scope}
            onChange={e => setScope(e.target.value)}
            className="w-full mt-1.5 px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm"
          >
            <option value="all">Toutes les catégories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase text-muted-foreground">Date</span>
          <input
            type="date"
            value={countDate}
            onChange={e => setCountDate(e.target.value)}
            className="w-full mt-1.5 px-3 py-2.5 bg-secondary border border-border rounded-lg text-sm"
          />
        </label>
      </div>

      <div className="text-sm text-muted-foreground">
        {selectedProducts.length} produit(s) dans cette sélection.
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
        <button
          onClick={generateSheet}
          disabled={generating || selectedProducts.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#606338] text-white rounded-xl text-sm font-semibold hover:bg-[#4d4f2e] disabled:opacity-50 transition-colors"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
          Imprimer la feuille
        </button>
        <button
          onClick={startValidation}
          disabled={selectedProducts.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 border border-border rounded-xl text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-50 transition-colors"
        >
          <ClipboardCheck className="w-4 h-4" />
          Scanner &amp; saisir
        </button>
      </div>
    </div>
  );
}
