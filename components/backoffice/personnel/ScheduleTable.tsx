'use client';

import { useState, useMemo } from 'react';
import { Plus, Trash2, X, Bus } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface Shift { start_time: string; end_time: string; }
interface DaySchedule { enabled: boolean; shifts: Shift[]; }
interface WeeklyScheduleConfig {
  monday: DaySchedule; tuesday: DaySchedule; wednesday: DaySchedule; thursday: DaySchedule;
  friday: DaySchedule; saturday: DaySchedule; sunday: DaySchedule;
}
interface StaffType { id: string; name: string; color: string; }
interface StaffMember {
  id: string; first_name: string; last_name: string;
  staff_type: StaffType | null; department: string | null;
  transport_pickup: boolean; transport_dropoff: boolean;
  is_active: boolean;
  schedule_config: WeeklyScheduleConfig | null;
}
interface TimeOff { id: string; staff_id: string; start_date: string; end_date: string; status: string; }
type ScheduleView = 'combined' | 'cuisine' | 'salle' | 'transport';
type DayName = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

const DAY_NAMES: DayName[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function getDefaultWeeklySchedule(): WeeklyScheduleConfig {
  const day: DaySchedule = { enabled: false, shifts: [{ start_time: '10:00', end_time: '18:00' }] };
  return { monday: { ...day }, tuesday: { ...day }, wednesday: { ...day }, thursday: { ...day }, friday: { ...day }, saturday: { ...day }, sunday: { ...day } };
}
function normalizeWeeklyConfig(raw: Record<string, unknown>): WeeklyScheduleConfig {
  const result: Record<string, DaySchedule> = {};
  for (const day of DAY_NAMES) {
    const d = raw[day] as Record<string, unknown> | undefined;
    if (!d) { result[day] = { enabled: false, shifts: [{ start_time: '10:00', end_time: '18:00' }] }; continue; }
    if (Array.isArray(d.shifts)) result[day] = { enabled: !!d.enabled, shifts: d.shifts as Shift[] };
    else result[day] = { enabled: !!d.enabled, shifts: [{ start_time: (d.start_time as string) || '10:00', end_time: (d.end_time as string) || '18:00' }] };
  }
  return result as unknown as WeeklyScheduleConfig;
}
function getDayNameFromDate(date: Date): DayName {
  const idx = date.getDay();
  return DAY_NAMES[idx === 0 ? 6 : idx - 1];
}
function minutesOf(shifts: Shift[]): number {
  return shifts.reduce((sum, s) => {
    const sp = s.start_time.split(':').map(Number);
    const ep = s.end_time.split(':').map(Number);
    return sum + ((ep[0] * 60 + ep[1]) - (sp[0] * 60 + sp[1]));
  }, 0);
}
function fmtH(min: number): string {
  if (min <= 0) return '0h';
  const h = Math.floor(min / 60); const m = min % 60;
  return `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`;
}

interface Props {
  staffMembers: StaffMember[];
  weekDays: Date[];
  approvedTimeOff: TimeOff[];
  scheduleView: ScheduleView;
  onUpdateStaffSchedule: (staffId: string, newConfig: WeeklyScheduleConfig) => Promise<void>;
}

export default function ScheduleTable({ staffMembers, weekDays, approvedTimeOff, scheduleView, onUpdateStaffSchedule }: Props) {
  const { t } = useTranslation();
  const pn = t.backoffice.personnelPage;
  const [editing, setEditing] = useState<{ staffId: string; dayName: DayName; label: string } | null>(null);

  const isOff = (staffId: string, date: Date) => {
    const ds = date.toISOString().split('T')[0];
    return approvedTimeOff.some(to => to.staff_id === staffId && to.status === 'approved' && ds >= to.start_date && ds <= to.end_date);
  };
  const getConfig = (s: StaffMember): WeeklyScheduleConfig =>
    s.schedule_config ? normalizeWeeklyConfig(s.schedule_config as unknown as Record<string, unknown>) : getDefaultWeeklySchedule();

  const rows = useMemo(() => staffMembers.filter(s => {
    if (!s.is_active) return false;
    if (scheduleView === 'cuisine') return s.department === 'cuisine';
    if (scheduleView === 'salle') return s.department === 'salle';
    if (scheduleView === 'transport') return s.transport_pickup || s.transport_dropoff;
    return true;
  }), [staffMembers, scheduleView]);

  const update = async (staff: StaffMember, mutate: (c: WeeklyScheduleConfig) => void) => {
    const config = getConfig(staff);
    mutate(config);
    await onUpdateStaffSchedule(staff.id, config);
  };

  // Add a shift to an empty day, then open the editor.
  const addDay = async (staff: StaffMember, dayName: DayName, label: string) => {
    await update(staff, c => { c[dayName] = { enabled: true, shifts: [{ start_time: '10:00', end_time: '18:00' }] }; });
    setEditing({ staffId: staff.id, dayName, label });
  };
  const removeDay = async (staff: StaffMember, dayName: DayName) => {
    await update(staff, c => { c[dayName] = { enabled: false, shifts: [{ start_time: '10:00', end_time: '18:00' }] }; });
    setEditing(null);
  };
  const setShifts = async (staff: StaffMember, dayName: DayName, shifts: Shift[]) => {
    await update(staff, c => { c[dayName] = { enabled: true, shifts }; });
  };

  const editingStaff = editing ? rows.find(s => s.id === editing.staffId) || staffMembers.find(s => s.id === editing.staffId) || null : null;
  const editingShifts = editing && editingStaff ? getConfig(editingStaff)[editing.dayName].shifts : [];

  return (
    <div className="bg-card border border-border rounded-xl overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-secondary">
            <th className="sticky left-0 z-10 bg-secondary text-left p-2.5 font-medium text-muted-foreground min-w-[170px] border-b border-border">{pn.staff}</th>
            {weekDays.map((day, i) => {
              const today = day.toDateString() === new Date().toDateString();
              return (
                <th key={i} className={`p-2 text-center font-medium border-b border-l border-border min-w-[92px] ${today ? 'text-[#606338]' : 'text-muted-foreground'}`}>
                  <div className="text-[11px] uppercase">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                  <div className={`text-base font-bold ${today ? 'text-[#606338]' : 'text-foreground'}`}>{day.getDate()}</div>
                </th>
              );
            })}
            <th className="p-2 text-center font-medium text-muted-foreground border-b border-l border-border min-w-[70px]">{pn.hours}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(staff => {
            const config = getConfig(staff);
            let weekMin = 0;
            return (
              <tr key={staff.id} className="border-t border-border hover:bg-secondary/40">
                {/* Staff cell */}
                <td className="sticky left-0 z-10 bg-card p-2.5 align-top">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: staff.staff_type?.color || '#606338' }}>
                      {staff.first_name[0]}{staff.last_name[0]}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium text-foreground truncate flex items-center gap-1">
                        {staff.first_name} {staff.last_name}
                        {(staff.transport_pickup || staff.transport_dropoff) && <Bus className="w-3 h-3 text-blue-500 shrink-0" />}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">{staff.staff_type?.name}</div>
                    </div>
                  </div>
                </td>

                {/* Day cells */}
                {weekDays.map((day, i) => {
                  const dayName = getDayNameFromDate(day);
                  const dc = config[dayName];
                  const off = isOff(staff.id, day);
                  if (off) {
                    return <td key={i} className="p-1.5 text-center border-l border-border align-middle"><span className="text-[11px] font-bold text-red-500 bg-red-500/10 rounded px-1.5 py-0.5">{pn.offBadge}</span></td>;
                  }
                  if (dc.enabled) {
                    weekMin += minutesOf(dc.shifts);
                    return (
                      <td key={i} className="p-1 border-l border-border align-middle">
                        <button onClick={() => setEditing({ staffId: staff.id, dayName, label: day.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' }) })}
                          className="w-full rounded-md px-1.5 py-1 text-[11px] leading-tight hover:ring-1 hover:ring-[#606338]/40 transition-all"
                          style={{ backgroundColor: `${staff.staff_type?.color || '#606338'}18` }}>
                          {dc.shifts.map((s, k) => <div key={k} className="text-foreground font-medium">{s.start_time.slice(0, 5)}–{s.end_time.slice(0, 5)}</div>)}
                        </button>
                      </td>
                    );
                  }
                  return (
                    <td key={i} className="p-1 border-l border-border align-middle">
                      <button onClick={() => addDay(staff, dayName, day.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' }))}
                        className="w-full h-7 rounded-md text-muted-foreground/40 hover:text-[#606338] hover:bg-[#606338]/5 flex items-center justify-center transition-colors" title={pn.addShift}>
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  );
                })}

                {/* Weekly total */}
                <td className="p-2 text-center border-l border-border font-semibold text-foreground">{fmtH(weekMin)}</td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr><td colSpan={weekDays.length + 2} className="p-8 text-center text-muted-foreground">{pn.noResults}</td></tr>
          )}
        </tbody>
      </table>

      {/* Cell editor */}
      {editing && editingStaff && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-foreground">{editingStaff.first_name} {editingStaff.last_name}</h3>
                <p className="text-[12px] text-muted-foreground capitalize">{editing.label}</p>
              </div>
              <button onClick={() => setEditing(null)} className="p-2 rounded-full hover:bg-secondary text-muted-foreground"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-2">
              {editingShifts.map((shift, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground w-5">#{idx + 1}</span>
                  <input type="time" value={shift.start_time}
                    onChange={(e) => { const u = editingShifts.map((s, k) => k === idx ? { ...s, start_time: e.target.value } : s); setShifts(editingStaff, editing.dayName, u); }}
                    className="flex-1 px-2 py-1.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50" />
                  <span className="text-muted-foreground">–</span>
                  <input type="time" value={shift.end_time}
                    onChange={(e) => { const u = editingShifts.map((s, k) => k === idx ? { ...s, end_time: e.target.value } : s); setShifts(editingStaff, editing.dayName, u); }}
                    className="flex-1 px-2 py-1.5 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50" />
                  {idx > 0 && (
                    <button onClick={() => setShifts(editingStaff, editing.dayName, editingShifts.filter((_, k) => k !== idx))} className="p-1 text-red-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-4">
              {editingShifts.length < 2 ? (
                <button onClick={() => setShifts(editingStaff, editing.dayName, [...editingShifts, { start_time: '18:00', end_time: '22:00' }])}
                  className="flex items-center gap-1 text-[13px] text-[#606338] hover:text-[#4d4f2e]">
                  <Plus className="w-3.5 h-3.5" /> {pn.addShift}
                </button>
              ) : <span />}
              <button onClick={() => removeDay(editingStaff, editing.dayName)} className="flex items-center gap-1 text-[13px] text-red-500 hover:text-red-600">
                <Trash2 className="w-3.5 h-3.5" /> {pn.remove}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
