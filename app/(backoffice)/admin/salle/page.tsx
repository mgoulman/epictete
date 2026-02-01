'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Save, Trash2, X, Map, Users, CircleDot, Square, RectangleHorizontal,
  GripVertical, Settings2, RotateCw, Maximize2
} from 'lucide-react';
import type { FloorZone, Table, TableShape, TableStatus } from '@/lib/types/salle';
import { TABLE_STATUS_CONFIG, SHAPE_DEFAULTS } from '@/lib/types/salle';

interface StaffOption {
  id: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
}

// ─── Chair shapes around a table ────────────────────────────────────────────
// Positions use CSS calc() with percentages so chairs always sit at the table edge.
function SeatDots({ seats, shape, width, height }: { seats: number; shape: TableShape; width: number; height: number }) {
  const chairW = Math.max(8, Math.min(14, width * 0.15));
  const chairH = chairW * 0.65;
  const gap = 2; // px between chair and table edge

  const base: React.CSSProperties = {
    borderRadius: `${chairW / 2}px ${chairW / 2}px 2px 2px`,
    background: 'color-mix(in srgb, var(--color-foreground) 20%, transparent)',
    border: '1.5px solid color-mix(in srgb, var(--color-foreground) 35%, transparent)',
    pointerEvents: 'none',
    width: chairW,
    height: chairH,
  };

  const styles: React.CSSProperties[] = [];

  if (shape === 'round') {
    for (let i = 0; i < seats; i++) {
      const rad = (2 * Math.PI * i) / seats - Math.PI / 2;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const off = gap + chairH / 2;
      styles.push({
        ...base,
        left: `calc(${50 + 50 * cos}% + ${cos * off - chairW / 2}px)`,
        top: `calc(${50 + 50 * sin}% + ${sin * off - chairH / 2}px)`,
        transform: `rotate(${(rad * 180) / Math.PI + 90}deg)`,
      });
    }
  } else {
    // Allocate seats to edges proportionally (largest-remainder)
    const lens = [width, height, width, height]; // top, right, bottom, left
    const total = 2 * (width + height);
    const raw = lens.map(l => (l / total) * seats);
    const fl = raw.map(Math.floor);
    let rem = seats - fl.reduce((a, b) => a + b, 0);
    const rs = raw.map((r, i) => ({ i, v: r - fl[i] })).sort((a, b) => b.v - a.v);
    for (let r = 0; r < rem; r++) fl[rs[r].i]++;

    for (let edge = 0; edge < 4; edge++) {
      const count = fl[edge];
      for (let j = 0; j < count; j++) {
        const pct = ((j + 1) / (count + 1)) * 100; // evenly spaced with margin
        switch (edge) {
          case 0: // top — chair sits above, flat side faces down
            styles.push({ ...base,
              left: `calc(${pct}% - ${chairW / 2}px)`,
              top: `${-(gap + chairH)}px`,
              transform: 'rotate(0deg)',
            }); break;
          case 1: // right — chair sits right, flat side faces left
            styles.push({ ...base,
              left: `calc(100% + ${gap + (chairH - chairW) / 2}px)`,
              top: `calc(${pct}% - ${chairH / 2}px)`,
              transform: 'rotate(90deg)',
            }); break;
          case 2: // bottom — chair sits below, flat side faces up
            styles.push({ ...base,
              left: `calc(${100 - pct}% - ${chairW / 2}px)`,
              top: `calc(100% + ${gap}px)`,
              transform: 'rotate(180deg)',
            }); break;
          case 3: // left — chair sits left, flat side faces right
            styles.push({ ...base,
              left: `${-(gap + (chairH + chairW) / 2)}px`,
              top: `calc(${100 - pct}% - ${chairH / 2}px)`,
              transform: 'rotate(270deg)',
            }); break;
        }
      }
    }
  }

  return (
    <>
      {styles.map((s, i) => <div key={i} className="absolute" style={s} />)}
    </>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function SallePlanPage() {
  const [zones, setZones] = useState<FloorZone[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [activeZoneId, setActiveZoneId] = useState<string>('');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ tableId: string; offsetX: number; offsetY: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>({ w: 800, h: 600 });

  // Zone management
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');

  // Observe canvas size for seat dot rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setCanvasSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  const fetchZones = useCallback(async () => {
    const res = await fetch('/api/salle?type=zones');
    const data = await res.json();
    setZones(data.zones || []);
    if (data.zones?.length > 0 && !activeZoneId) {
      setActiveZoneId(data.zones[0].id);
    }
  }, [activeZoneId]);

  const fetchTables = useCallback(async (zoneId: string) => {
    const res = await fetch(`/api/salle?type=tables&zone_id=${zoneId}`);
    const data = await res.json();
    setTables(data.tables || []);
  }, []);

  const fetchStaff = useCallback(async () => {
    const res = await fetch('/api/salle?type=staff');
    const data = await res.json();
    setStaff(data.staff || []);
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchZones(), fetchStaff()]);
      setLoading(false);
    };
    init();
  }, [fetchZones, fetchStaff]);

  useEffect(() => {
    if (activeZoneId) {
      fetchTables(activeZoneId);
      setSelectedTableId(null);
      setHasUnsavedChanges(false);
    }
  }, [activeZoneId, fetchTables]);

  const selectedTable = tables.find(t => t.id === selectedTableId) || null;

  // ─── Zone CRUD ────────────────────────────────────────────────────────────
  const handleAddZone = async () => {
    if (!newZoneName.trim()) return;
    const res = await fetch('/api/salle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'zone', name: newZoneName, sort_order: zones.length + 1 }),
    });
    const data = await res.json();
    if (data.zone) {
      setZones(prev => [...prev, data.zone]);
      setActiveZoneId(data.zone.id);
    }
    setNewZoneName('');
    setShowZoneModal(false);
  };

  const handleDeleteZone = async (zoneId: string) => {
    if (!confirm('Delete this zone and all its tables?')) return;
    await fetch(`/api/salle?type=zone&id=${zoneId}`, { method: 'DELETE' });
    setZones(prev => prev.filter(z => z.id !== zoneId));
    if (activeZoneId === zoneId) {
      setActiveZoneId(zones.find(z => z.id !== zoneId)?.id || '');
    }
  };

  // ─── Table CRUD ───────────────────────────────────────────────────────────
  const handleAddTable = async () => {
    if (!activeZoneId) return;
    const existingNumbers = tables.map(t => {
      const match = t.table_number.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    });
    const nextNum = Math.max(0, ...existingNumbers) + 1;
    const defaults = SHAPE_DEFAULTS['round'];

    const res = await fetch('/api/salle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'table',
        zone_id: activeZoneId,
        table_number: `T${nextNum}`,
        seats: 4,
        shape: 'round',
        x: 20 + Math.random() * 60,
        y: 20 + Math.random() * 60,
        width: defaults.width,
        height: defaults.height,
      }),
    });
    const data = await res.json();
    if (data.table) {
      setTables(prev => [...prev, data.table]);
      setSelectedTableId(data.table.id);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('Delete this table?')) return;
    await fetch(`/api/salle?type=table&id=${tableId}`, { method: 'DELETE' });
    setTables(prev => prev.filter(t => t.id !== tableId));
    if (selectedTableId === tableId) setSelectedTableId(null);
  };

  const handleSaveLayout = async () => {
    setSaving(true);
    const positions = tables.map(t => ({
      id: t.id,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      rotation: t.rotation,
    }));
    await fetch('/api/salle', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'tables-positions', positions }),
    });
    setHasUnsavedChanges(false);
    setSaving(false);
  };

  const handleUpdateTable = async (tableId: string, updates: Partial<Table>) => {
    const res = await fetch('/api/salle', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'table', id: tableId, ...updates }),
    });
    const data = await res.json();
    if (data.table) {
      setTables(prev => prev.map(t => t.id === tableId ? data.table : t));
    }
  };

  // Local-only property change (marks unsaved)
  const setTableLocal = (tableId: string, patch: Partial<Table>) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, ...patch } : t));
    setHasUnsavedChanges(true);
  };

  // ─── Drag handlers ────────────────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent, tableId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    const tableX = (table.x / 100) * rect.width;
    const tableY = (table.y / 100) * rect.height;

    setDragging({
      tableId,
      offsetX: e.clientX - rect.left - tableX,
      offsetY: e.clientY - rect.top - tableY,
    });
    setSelectedTableId(tableId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    let newX = ((e.clientX - rect.left - dragging.offsetX) / rect.width) * 100;
    let newY = ((e.clientY - rect.top - dragging.offsetY) / rect.height) * 100;
    newX = Math.max(2, Math.min(98, newX));
    newY = Math.max(2, Math.min(98, newY));

    setTables(prev =>
      prev.map(t => t.id === dragging.tableId ? { ...t, x: newX, y: newY } : t)
    );
    setHasUnsavedChanges(true);
  };

  const handlePointerUp = () => {
    setDragging(null);
  };

  // ─── Table element style ──────────────────────────────────────────────────
  const getTableStyle = (table: Table): React.CSSProperties => {
    const statusConfig = TABLE_STATUS_CONFIG[table.status as TableStatus];
    const w = table.width || SHAPE_DEFAULTS[table.shape].width;
    const h = table.height || SHAPE_DEFAULTS[table.shape].height;
    const rot = table.rotation || 0;

    return {
      position: 'absolute',
      left: `${table.x}%`,
      top: `${table.y}%`,
      width: `${w}%`,
      height: `${h}%`,
      transform: `translate(-50%, -50%) rotate(${rot}deg)`,
      borderRadius: table.shape === 'round' ? '50%' : '6px',
      backgroundColor: statusConfig?.bg || '#22c55e20',
      border: `2px solid ${selectedTableId === table.id ? '#606338' : (statusConfig?.color || '#22c55e')}`,
      cursor: 'grab',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      userSelect: 'none' as const,
      touchAction: 'none',
      boxShadow: selectedTableId === table.id ? '0 0 0 3px rgba(96,99,56,0.3)' : undefined,
      transition: dragging?.tableId === table.id ? 'none' : 'box-shadow 0.15s',
      zIndex: selectedTableId === table.id ? 10 : 1,
    };
  };

  // Pixel sizes of a table element for seat dot placement
  const tablePx = (table: Table) => {
    const w = table.width || SHAPE_DEFAULTS[table.shape].width;
    const h = table.height || SHAPE_DEFAULTS[table.shape].height;
    return { pw: (w / 100) * canvasSize.w, ph: (h / 100) * canvasSize.h };
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-20 text-muted-foreground">Loading floor plan...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Map className="w-6 h-6" />
            Plan de Salle
          </h1>
          <p className="text-muted-foreground mt-1">Manage floor layout and table assignments</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddTable}
            disabled={!activeZoneId}
            className="flex items-center gap-2 px-4 py-2 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add Table
          </button>
          <button
            onClick={handleSaveLayout}
            disabled={!hasUnsavedChanges || saving}
            className="flex items-center gap-2 px-4 py-2 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Layout'}
          </button>
        </div>
      </div>

      {/* Zone tabs */}
      <div className="flex items-center gap-2 mb-4 border-b border-border pb-2">
        {zones.map(zone => (
          <div key={zone.id} className="flex items-center">
            <button
              onClick={() => setActiveZoneId(zone.id)}
              className={`px-4 py-2 rounded-t-lg transition-colors text-sm font-medium ${
                activeZoneId === zone.id
                  ? 'bg-[#606338] text-white'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card'
              }`}
            >
              {zone.name}
            </button>
            {zones.length > 1 && (
              <button
                onClick={() => handleDeleteZone(zone.id)}
                className="p-1 text-muted-foreground hover:text-red-500 ml-1"
                title="Delete zone"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setShowZoneModal(true)}
          className="flex items-center gap-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-card rounded-lg"
        >
          <Plus className="w-3 h-3" />
          Zone
        </button>
      </div>

      {hasUnsavedChanges && (
        <div className="mb-3 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm text-yellow-600">
          Unsaved changes — drag tables to reposition, then click Save Layout
        </div>
      )}

      <div className="flex gap-6">
        {/* Canvas */}
        <div className="flex-1 min-w-0">
          <div
            ref={canvasRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onClick={() => setSelectedTableId(null)}
            className="relative bg-card border border-border rounded-xl overflow-visible"
            style={{ aspectRatio: '4 / 3' }}
          >
            {/* Grid background */}
            <div className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                backgroundSize: '5% 5%',
              }}
            />

            {tables.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <GripVertical className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No tables yet. Click &ldquo;Add Table&rdquo; to begin.</p>
                </div>
              </div>
            )}

            {tables.map(table => {
              const { pw, ph } = tablePx(table);
              return (
                <div
                  key={table.id}
                  style={getTableStyle(table)}
                  onPointerDown={(e) => handlePointerDown(e, table.id)}
                  onClick={(e) => { e.stopPropagation(); setSelectedTableId(table.id); }}
                >
                  {/* Seat dots (positioned relative to this element) */}
                  <SeatDots seats={table.seats} shape={table.shape} width={pw} height={ph} />

                  {/* Label */}
                  <span className="text-xs font-bold text-foreground leading-none pointer-events-none select-none">
                    {table.table_number}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-none mt-0.5 pointer-events-none select-none">
                    {table.seats}p
                  </span>

                  {/* Waiter badge */}
                  {table.assigned_waiter && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#606338] text-white text-[9px] font-bold flex items-center justify-center pointer-events-none"
                      style={{ transform: `rotate(${-(table.rotation || 0)}deg)` }}
                    >
                      {table.assigned_waiter.first_name[0]}{table.assigned_waiter.last_name[0]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            {Object.entries(TABLE_STATUS_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cfg.color }} />
                <span>{cfg.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Properties panel ─────────────────────────────────────────── */}
        {selectedTable && (
          <div className="w-72 bg-card border border-border rounded-xl p-4 self-start shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Table {selectedTable.table_number}
              </h3>
              <button
                onClick={() => handleDeleteTable(selectedTable.id)}
                className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Table number */}
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Table Number</label>
                <input
                  type="text"
                  value={selectedTable.table_number}
                  onChange={(e) => {
                    setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, table_number: e.target.value } : t));
                  }}
                  onBlur={() => handleUpdateTable(selectedTable.id, { table_number: selectedTable.table_number })}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
                />
              </div>

              {/* Seats */}
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Seats</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const v = Math.max(1, selectedTable.seats - 1);
                      setTableLocal(selectedTable.id, { seats: v });
                    }}
                    className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-[#606338]/10 text-foreground"
                  >
                    <span className="text-lg leading-none">−</span>
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={selectedTable.seats}
                    onChange={(e) => {
                      const v = Math.max(1, Math.min(20, parseInt(e.target.value) || 1));
                      setTableLocal(selectedTable.id, { seats: v });
                    }}
                    onBlur={() => handleUpdateTable(selectedTable.id, { seats: selectedTable.seats })}
                    className="w-14 text-center px-2 py-1.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
                  />
                  <button
                    onClick={() => {
                      const v = Math.min(20, selectedTable.seats + 1);
                      setTableLocal(selectedTable.id, { seats: v });
                    }}
                    className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-[#606338]/10 text-foreground"
                  >
                    <span className="text-lg leading-none">+</span>
                  </button>
                </div>
              </div>

              {/* Shape */}
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Shape</label>
                <div className="flex gap-2">
                  {([
                    { shape: 'round' as TableShape, icon: CircleDot, label: 'Round' },
                    { shape: 'square' as TableShape, icon: Square, label: 'Square' },
                    { shape: 'rectangle' as TableShape, icon: RectangleHorizontal, label: 'Rect' },
                  ]).map(opt => (
                    <button
                      key={opt.shape}
                      onClick={() => {
                        const defaults = SHAPE_DEFAULTS[opt.shape];
                        setTableLocal(selectedTable.id, {
                          shape: opt.shape,
                          width: defaults.width,
                          height: defaults.height,
                        });
                        handleUpdateTable(selectedTable.id, {
                          shape: opt.shape,
                          width: defaults.width,
                          height: defaults.height,
                        });
                      }}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                        selectedTable.shape === opt.shape
                          ? 'bg-[#606338] text-white'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <opt.icon className="w-4 h-4" />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size (width × height) */}
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground flex items-center gap-1">
                  <Maximize2 className="w-3 h-3" />
                  Size (% of canvas)
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] text-muted-foreground mb-0.5">Width</label>
                    <input
                      type="number"
                      min="3"
                      max="40"
                      step="0.5"
                      value={selectedTable.width || SHAPE_DEFAULTS[selectedTable.shape].width}
                      onChange={(e) => {
                        const v = Math.max(3, Math.min(40, parseFloat(e.target.value) || 5));
                        setTableLocal(selectedTable.id, { width: v });
                      }}
                      className="w-full px-2 py-1.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
                    />
                  </div>
                  <span className="text-muted-foreground mt-4">×</span>
                  <div className="flex-1">
                    <label className="block text-[10px] text-muted-foreground mb-0.5">Height</label>
                    <input
                      type="number"
                      min="3"
                      max="40"
                      step="0.5"
                      value={selectedTable.height || SHAPE_DEFAULTS[selectedTable.shape].height}
                      onChange={(e) => {
                        const v = Math.max(3, Math.min(40, parseFloat(e.target.value) || 5));
                        setTableLocal(selectedTable.id, { height: v });
                      }}
                      className="w-full px-2 py-1.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
                    />
                  </div>
                </div>
              </div>

              {/* Rotation */}
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground flex items-center gap-1">
                  <RotateCw className="w-3 h-3" />
                  Rotation
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={selectedTable.rotation || 0}
                    onChange={(e) => {
                      setTableLocal(selectedTable.id, { rotation: parseFloat(e.target.value) });
                    }}
                    className="flex-1 accent-[#606338]"
                  />
                  <span className="text-sm text-foreground w-10 text-right tabular-nums">
                    {selectedTable.rotation || 0}°
                  </span>
                </div>
                <div className="flex gap-1 mt-1.5">
                  {[0, 45, 90, 135, 180].map(deg => (
                    <button
                      key={deg}
                      onClick={() => setTableLocal(selectedTable.id, { rotation: deg })}
                      className={`flex-1 py-1 text-[10px] rounded font-medium transition-colors ${
                        (selectedTable.rotation || 0) === deg
                          ? 'bg-[#606338] text-white'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Assigned waiter */}
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Assigned Waiter
                </label>
                <select
                  value={selectedTable.assigned_waiter_id || ''}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    setTables(prev => prev.map(t => t.id === selectedTable.id ? { ...t, assigned_waiter_id: val } : t));
                    handleUpdateTable(selectedTable.id, { assigned_waiter_id: val } as Partial<Table>);
                  }}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
                >
                  <option value="">Unassigned</option>
                  {staff.map(s => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium mb-1 text-muted-foreground">Status</label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: TABLE_STATUS_CONFIG[selectedTable.status as TableStatus]?.color }}
                  />
                  <span className="text-sm text-foreground">
                    {TABLE_STATUS_CONFIG[selectedTable.status as TableStatus]?.label || selectedTable.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Zone modal */}
      {showZoneModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl w-full max-w-sm">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold">Add Zone</h2>
              <button onClick={() => setShowZoneModal(false)} className="p-2 hover:bg-secondary rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Zone Name</label>
                <input
                  type="text"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="e.g. Terrasse"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddZone()}
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowZoneModal(false)}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddZone}
                  disabled={!newZoneName.trim()}
                  className="px-4 py-2 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] disabled:opacity-50"
                >
                  Add Zone
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
