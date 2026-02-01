'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ClipboardList, Users, Plus, X, Search, Check, ChevronLeft, Receipt,
  Minus, UserCheck, Sparkles, ShowerHead, ArrowRight
} from 'lucide-react';
import { useAuth, usePermissions } from '@/lib/auth/hooks';
import type {
  FloorZone, Table, TableSession, TableOrder, TableStatus, TableShape,
  SessionStatus, OrderItemStatus
} from '@/lib/types/salle';
import { TABLE_STATUS_CONFIG, SESSION_STATUS_CONFIG, ORDER_STATUS_CONFIG, SHAPE_DEFAULTS } from '@/lib/types/salle';

// ─── Seat dots around a table ───────────────────────────────────────────────
function SeatDots({ seats, shape, width, height }: { seats: number; shape: TableShape; width: number; height: number }) {
  const chairW = Math.max(8, Math.min(14, width * 0.15));
  const chairH = chairW * 0.65;
  const gap = 2;

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
    const lens = [width, height, width, height];
    const total = 2 * (width + height);
    const raw = lens.map(l => (l / total) * seats);
    const fl = raw.map(Math.floor);
    let rem = seats - fl.reduce((a, b) => a + b, 0);
    const rs = raw.map((r, i) => ({ i, v: r - fl[i] })).sort((a, b) => b.v - a.v);
    for (let r = 0; r < rem; r++) fl[rs[r].i]++;

    for (let edge = 0; edge < 4; edge++) {
      const count = fl[edge];
      for (let j = 0; j < count; j++) {
        const pct = ((j + 1) / (count + 1)) * 100;
        switch (edge) {
          case 0:
            styles.push({ ...base,
              left: `calc(${pct}% - ${chairW / 2}px)`,
              top: `${-(gap + chairH)}px`,
              transform: 'rotate(0deg)',
            }); break;
          case 1:
            styles.push({ ...base,
              left: `calc(100% + ${gap + (chairH - chairW) / 2}px)`,
              top: `calc(${pct}% - ${chairH / 2}px)`,
              transform: 'rotate(90deg)',
            }); break;
          case 2:
            styles.push({ ...base,
              left: `calc(${100 - pct}% - ${chairW / 2}px)`,
              top: `calc(100% + ${gap}px)`,
              transform: 'rotate(180deg)',
            }); break;
          case 3:
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

interface MenuItemOption {
  id: string;
  name: string;
  name_fr: string;
  price: number;
  category_id: string | null;
  is_available: boolean;
  image_url: string | null;
}

interface MenuCategory {
  id: string;
  name: string;
  name_fr: string;
}

export default function ServicePage() {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const [zones, setZones] = useState<FloorZone[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [activeZoneId, setActiveZoneId] = useState<string>('');
  const [myStaffId, setMyStaffId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>({ w: 800, h: 600 });

  // Session / order panel
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [activeSession, setActiveSession] = useState<TableSession | null>(null);
  const [orders, setOrders] = useState<TableOrder[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);

  // Seat guests modal
  const [showSeatModal, setShowSeatModal] = useState(false);
  const [guestCount, setGuestCount] = useState(2);

  // Menu picker
  const [showMenuPicker, setShowMenuPicker] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [menuSearch, setMenuSearch] = useState('');
  const [menuCategoryFilter, setMenuCategoryFilter] = useState<string>('');
  const [menuLoaded, setMenuLoaded] = useState(false);

  // Bill view
  const [showBill, setShowBill] = useState(false);

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

  // Resolve staff ID for current user
  useEffect(() => {
    if (!user) return;
    const fetchStaffId = async () => {
      const res = await fetch('/api/salle?type=staff');
      const data = await res.json();
      // We need to check staff_members for profile_id match
      // Use a separate query through sessions API
      const staffRes = await fetch(`/api/personnel?type=staff`);
      const staffData = await staffRes.json();
      const staffMembers = staffData.staff || [];
      // Find the staff member whose profile_id matches current user
      // profile_id might be set on the staff record
      const myStaff = staffMembers.find((s: Record<string, unknown>) => s.profile_id === user.id);
      if (myStaff) {
        setMyStaffId(myStaff.id);
      } else if (isAdmin()) {
        // Admin can use any staff - try to pick first available
        if (staffMembers.length > 0) {
          setMyStaffId(staffMembers[0].id);
        }
      }
    };
    fetchStaffId();
  }, [user, isAdmin]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const zonesRes = await fetch('/api/salle?type=zones');
    const zonesData = await zonesRes.json();
    setZones(zonesData.zones || []);
    if (zonesData.zones?.length > 0 && !activeZoneId) {
      setActiveZoneId(zonesData.zones[0].id);
    }
    setLoading(false);
  }, [activeZoneId]);

  const fetchTables = useCallback(async (zoneId: string) => {
    const res = await fetch(`/api/salle?type=tables-with-sessions&zone_id=${zoneId}`);
    const data = await res.json();
    let filtered = data.tables || [];

    // If waiter (not admin), only show assigned tables
    if (!isAdmin() && myStaffId) {
      filtered = filtered.filter((t: Table) => t.assigned_waiter_id === myStaffId);
    }

    setTables(filtered);
  }, [isAdmin, myStaffId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeZoneId) {
      fetchTables(activeZoneId);
    }
  }, [activeZoneId, fetchTables]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!activeZoneId) return;
    const interval = setInterval(() => fetchTables(activeZoneId), 15000);
    return () => clearInterval(interval);
  }, [activeZoneId, fetchTables]);

  const loadMenuItems = async () => {
    if (menuLoaded) return;
    const [itemsRes, catsRes] = await Promise.all([
      fetch('/api/menu-items?available=true'),
      fetch('/api/salle?type=menu-categories'),
    ]);
    const itemsData = await itemsRes.json();
    const catsData = await catsRes.json();
    setMenuItems(itemsData.items || []);
    setMenuCategories(catsData.categories || []);
    setMenuLoaded(true);
  };

  const handleTableClick = async (table: Table) => {
    setSelectedTable(table);

    if (table.status === 'free') {
      setGuestCount(2);
      setShowSeatModal(true);
      return;
    }

    if (table.status === 'cleaning') {
      // Mark as free
      await fetch('/api/salle', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'table-status', id: table.id, status: 'free' }),
      });
      fetchTables(activeZoneId);
      return;
    }

    // occupied/reserved - open session panel
    if (table.active_session) {
      setActiveSession(table.active_session as TableSession);
      await fetchOrders(table.active_session.id);
      setPanelOpen(true);
    }
  };

  const fetchOrders = async (sessionId: string) => {
    const res = await fetch(`/api/salle/orders?session_id=${sessionId}`);
    const data = await res.json();
    setOrders(data.orders || []);
  };

  const handleSeatGuests = async () => {
    if (!selectedTable || !myStaffId) return;
    const res = await fetch('/api/salle/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table_id: selectedTable.id,
        waiter_id: myStaffId,
        guests_count: guestCount,
      }),
    });
    const data = await res.json();
    setShowSeatModal(false);
    if (data.session) {
      setActiveSession(data.session);
      setOrders([]);
      setPanelOpen(true);
      fetchTables(activeZoneId);
    }
  };

  const handleAddOrderItem = async (menuItem: MenuItemOption) => {
    if (!activeSession) return;
    const res = await fetch('/api/salle/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: activeSession.id,
        menu_item_id: menuItem.id,
        quantity: 1,
      }),
    });
    const data = await res.json();
    if (data.order) {
      setOrders(prev => [...prev, data.order]);
    }
    setShowMenuPicker(false);
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderItemStatus) => {
    await fetch('/api/salle/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, status }),
    });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  const handleUpdateOrderQuantity = async (orderId: string, quantity: number) => {
    if (quantity < 1) return;
    await fetch('/api/salle/orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: orderId, quantity }),
    });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, quantity } : o));
  };

  const handleDeleteOrder = async (orderId: string) => {
    await fetch(`/api/salle/orders?id=${orderId}`, { method: 'DELETE' });
    setOrders(prev => prev.filter(o => o.id !== orderId));
  };

  const handleMarkAllServed = async () => {
    const orderedItems = orders.filter(o => o.status === 'ordered' || o.status === 'preparing');
    for (const order of orderedItems) {
      await handleUpdateOrderStatus(order.id, 'served');
    }
    if (activeSession) {
      await fetch('/api/salle/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: activeSession.id, status: 'served' }),
      });
      setActiveSession(prev => prev ? { ...prev, status: 'served' } : null);
    }
  };

  const handleGenerateBill = async () => {
    if (!activeSession) return;
    await fetch('/api/salle/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activeSession.id, status: 'billed' }),
    });
    const res = await fetch(`/api/salle/sessions?session_id=${activeSession.id}`);
    const data = await res.json();
    if (data.session) setActiveSession(data.session);
    setShowBill(true);
  };

  const handleCloseTable = async () => {
    if (!activeSession) return;
    await fetch('/api/salle/sessions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activeSession.id, status: 'closed' }),
    });
    setPanelOpen(false);
    setShowBill(false);
    setSelectedTable(null);
    setActiveSession(null);
    setOrders([]);
    fetchTables(activeZoneId);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setShowBill(false);
    setSelectedTable(null);
    setActiveSession(null);
    setOrders([]);
  };

  const orderTotal = orders
    .filter(o => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.quantity * o.unit_price, 0);

  const getTableDisplayStyle = (table: Table): React.CSSProperties => {
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
      borderRadius: table.shape === 'round' ? '50%' : '8px',
      backgroundColor: statusConfig?.bg || '#22c55e20',
      border: `2.5px solid ${statusConfig?.color || '#22c55e'}`,
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      userSelect: 'none' as const,
      transition: 'transform 0.15s, box-shadow 0.15s',
    };
  };

  // Pixel sizes of a table element for seat dot placement
  const tablePx = (table: Table) => {
    const w = table.width || SHAPE_DEFAULTS[table.shape].width;
    const h = table.height || SHAPE_DEFAULTS[table.shape].height;
    return { pw: (w / 100) * canvasSize.w, ph: (h / 100) * canvasSize.h };
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.is_available) return false;
    if (menuCategoryFilter && item.category_id !== menuCategoryFilter) return false;
    if (menuSearch) {
      const q = menuSearch.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.name_fr.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-20 text-muted-foreground">Loading service view...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="w-5 h-5 md:w-6 md:h-6" />
            Service
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isAdmin() ? 'All tables' : 'Your assigned tables'}
          </p>
        </div>
      </div>

      {/* Zone tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {zones.map(zone => (
          <button
            key={zone.id}
            onClick={() => setActiveZoneId(zone.id)}
            className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium whitespace-nowrap ${
              activeZoneId === zone.id
                ? 'bg-[#606338] text-white'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            {zone.name} ({tables.filter(t => t.zone_id === zone.id).length})
          </button>
        ))}
      </div>

      {/* Floor plan (read only) */}
      <div
        ref={canvasRef}
        className="relative bg-card border border-border rounded-xl overflow-visible"
        style={{ aspectRatio: '4 / 3', maxHeight: '60vh' }}
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
            <p className="text-sm">No tables assigned to you in this zone.</p>
          </div>
        )}

        {tables.map(table => {
          const { pw, ph } = tablePx(table);
          return (
            <div
              key={table.id}
              style={getTableDisplayStyle(table)}
              onClick={() => handleTableClick(table)}
              className="hover:scale-110 hover:shadow-lg active:scale-95"
            >
              {/* Seat dots */}
              <SeatDots seats={table.seats} shape={table.shape} width={pw} height={ph} />

              <span className="text-xs font-bold text-foreground leading-none">{table.table_number}</span>
              <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
                {table.status === 'occupied' && table.active_session
                  ? `${(table.active_session as TableSession).guests_count}p`
                  : `${table.seats}p`
                }
              </span>
              {table.status === 'occupied' && table.active_session && (
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white"
                  style={{
                    backgroundColor: SESSION_STATUS_CONFIG[(table.active_session as TableSession).status as SessionStatus]?.color || '#ef4444',
                    transform: `rotate(${-(table.rotation || 0)}deg)`,
                  }}
                >
                  {SESSION_STATUS_CONFIG[(table.active_session as TableSession).status as SessionStatus]?.label?.substring(0, 3) || ''}
                </span>
              )}
              {table.status === 'cleaning' && (
                <ShowerHead className="w-3 h-3 text-gray-500 mt-0.5" />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground flex-wrap">
        {Object.entries(TABLE_STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
            <span>{cfg.label}</span>
          </div>
        ))}
        <span className="text-muted-foreground/50">|</span>
        <span>Tap table to interact</span>
      </div>

      {/* Seat Guests Modal */}
      {showSeatModal && selectedTable && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center">
          <div className="bg-card border border-border rounded-t-2xl md:rounded-xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Seat Guests at {selectedTable.table_number}</h3>
              <button onClick={() => setShowSeatModal(false)} className="p-2 hover:bg-secondary rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center hover:bg-[#606338]/10 active:scale-95"
              >
                <Minus className="w-5 h-5" />
              </button>
              <div className="text-center">
                <span className="text-4xl font-bold text-foreground">{guestCount}</span>
                <p className="text-sm text-muted-foreground mt-1">guests</p>
              </div>
              <button
                onClick={() => setGuestCount(Math.min(selectedTable.seats, guestCount + 1))}
                className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center hover:bg-[#606338]/10 active:scale-95"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={handleSeatGuests}
              disabled={!myStaffId}
              className="w-full py-3 bg-[#606338] text-white rounded-xl text-sm font-medium hover:bg-[#4d4f2e] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              Seat {guestCount} Guests
            </button>
            {!myStaffId && (
              <p className="text-xs text-red-500 mt-2 text-center">
                No staff profile linked to your account. Ask admin to link your profile.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Session Panel (slide-up on mobile, side panel on desktop) */}
      {panelOpen && activeSession && (
        <div className="fixed inset-0 z-50 flex items-end md:items-stretch md:justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={closePanel} />
          <div className="relative bg-card border-t md:border-l border-border w-full md:w-[440px] max-h-[85vh] md:max-h-full md:h-full overflow-y-auto rounded-t-2xl md:rounded-none">
            {/* Panel header */}
            <div className="sticky top-0 bg-card border-b border-border p-4 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">
                    {selectedTable?.table_number} - Session
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: SESSION_STATUS_CONFIG[activeSession.status as SessionStatus]?.color }}
                    >
                      {SESSION_STATUS_CONFIG[activeSession.status as SessionStatus]?.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {activeSession.guests_count} guests
                    </span>
                  </div>
                </div>
                <button onClick={closePanel} className="p-2 hover:bg-secondary rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Orders list */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-foreground text-sm">Orders</h4>
                <button
                  onClick={() => { loadMenuItems(); setShowMenuPicker(true); }}
                  disabled={activeSession.status === 'billed' || activeSession.status === 'closed'}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#606338] text-white rounded-lg text-xs font-medium hover:bg-[#4d4f2e] disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Item
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No orders yet. Add items from the menu.
                </div>
              ) : (
                <div className="space-y-2">
                  {orders.map(order => (
                    <div key={order.id} className={`bg-secondary/50 rounded-lg p-3 ${order.status === 'cancelled' ? 'opacity-50' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {order.menu_item?.name_fr || order.menu_item?.name || 'Item'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-1.5 py-0.5 rounded text-white"
                              style={{ backgroundColor: ORDER_STATUS_CONFIG[order.status as OrderItemStatus]?.color }}
                            >
                              {ORDER_STATUS_CONFIG[order.status as OrderItemStatus]?.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {order.unit_price.toFixed(2)} DH x {order.quantity}
                            </span>
                          </div>
                          {order.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">{order.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {order.status === 'ordered' && (
                            <>
                              <button
                                onClick={() => handleUpdateOrderQuantity(order.id, order.quantity - 1)}
                                disabled={order.quantity <= 1}
                                className="w-7 h-7 rounded bg-secondary flex items-center justify-center hover:bg-card disabled:opacity-30"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-sm font-medium w-6 text-center">{order.quantity}</span>
                              <button
                                onClick={() => handleUpdateOrderQuantity(order.id, order.quantity + 1)}
                                className="w-7 h-7 rounded bg-secondary flex items-center justify-center hover:bg-card"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteOrder(order.id)}
                                className="w-7 h-7 rounded flex items-center justify-center text-red-500 hover:bg-red-500/10 ml-1"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {order.status !== 'cancelled' && order.status !== 'ordered' && (
                            <span className="text-sm font-medium text-foreground">
                              {(order.unit_price * order.quantity).toFixed(2)} DH
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Total */}
              {orders.length > 0 && (
                <div className="mt-4 p-3 bg-secondary rounded-lg flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Total</span>
                  <span className="text-lg font-bold text-foreground">{orderTotal.toFixed(2)} DH</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-4 space-y-2">
                {activeSession.status === 'active' && orders.length > 0 && (
                  <button
                    onClick={handleMarkAllServed}
                    className="w-full py-3 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    Mark All Served
                  </button>
                )}

                {activeSession.status === 'served' && (
                  <button
                    onClick={handleGenerateBill}
                    className="w-full py-3 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 flex items-center justify-center gap-2"
                  >
                    <Receipt className="w-4 h-4" />
                    Generate Bill
                  </button>
                )}

                {activeSession.status === 'billed' && (
                  <button
                    onClick={() => setShowBill(true)}
                    className="w-full py-3 bg-amber-500/20 text-amber-600 rounded-xl text-sm font-medium hover:bg-amber-500/30 flex items-center justify-center gap-2 mb-2"
                  >
                    <Receipt className="w-4 h-4" />
                    View Bill
                  </button>
                )}

                {activeSession.status === 'billed' && (
                  <button
                    onClick={handleCloseTable}
                    className="w-full py-3 bg-red-500 text-white rounded-xl text-sm font-medium hover:bg-red-600 flex items-center justify-center gap-2"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Close Table
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bill Modal */}
      {showBill && activeSession && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white text-black rounded-xl w-full max-w-sm overflow-hidden shadow-2xl">
            {/* Receipt header */}
            <div className="text-center p-4 border-b border-dashed border-gray-300">
              <Sparkles className="w-5 h-5 mx-auto mb-1 text-[#606338]" />
              <h3 className="font-bold text-lg">Epictète</h3>
              <p className="text-xs text-gray-500 mt-1">
                Table {selectedTable?.table_number} - {activeSession.guests_count} guests
              </p>
              <p className="text-xs text-gray-400">
                {new Date().toLocaleDateString('fr-FR')} {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Items */}
            <div className="p-4 space-y-2 border-b border-dashed border-gray-300">
              {orders.filter(o => o.status !== 'cancelled').map(order => (
                <div key={order.id} className="flex justify-between text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-800">{order.quantity}x </span>
                    <span className="text-gray-700">{order.menu_item?.name_fr || order.menu_item?.name}</span>
                  </div>
                  <span className="font-medium ml-2">{(order.unit_price * order.quantity).toFixed(2)} DH</span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="p-4 border-b border-dashed border-gray-300">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Total</span>
                <span className="font-bold text-xl">{(activeSession.total_amount || orderTotal).toFixed(2)} DH</span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 flex gap-2">
              <button
                onClick={() => setShowBill(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleCloseTable}
                className="flex-1 py-2.5 bg-[#606338] text-white rounded-lg text-sm font-medium hover:bg-[#4d4f2e]"
              >
                Close Table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Picker */}
      {showMenuPicker && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMenuPicker(false)} />
          <div className="relative bg-card border-t md:border border-border w-full md:max-w-lg md:rounded-xl max-h-[85vh] md:max-h-[80vh] flex flex-col rounded-t-2xl">
            {/* Search header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Menu Item
                </h3>
                <button onClick={() => setShowMenuPicker(false)} className="p-2 hover:bg-secondary rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  placeholder="Search menu..."
                  className="w-full pl-10 pr-4 py-2.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
                  autoFocus
                />
              </div>
              {/* Category chips */}
              <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
                <button
                  onClick={() => setMenuCategoryFilter('')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    !menuCategoryFilter
                      ? 'bg-[#606338] text-white'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  All
                </button>
                {menuCategories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setMenuCategoryFilter(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      menuCategoryFilter === cat.id
                        ? 'bg-[#606338] text-white'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {cat.name_fr || cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Items grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-2">
                {filteredMenuItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleAddOrderItem(item)}
                    className="bg-secondary/50 hover:bg-secondary border border-border rounded-lg p-3 text-left transition-colors active:scale-95 min-h-[60px]"
                  >
                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      {item.name_fr || item.name}
                    </p>
                    <p className="text-xs font-semibold text-[#606338] mt-1">
                      {item.price.toFixed(2)} DH
                    </p>
                  </button>
                ))}
              </div>
              {filteredMenuItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No items match your search.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
