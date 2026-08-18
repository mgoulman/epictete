'use client';

import { useState } from 'react';
import { Bus, Trash2, Plus, Minus } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface Shift {
  start_time: string;
  end_time: string;
}

interface StaffType {
  id: string;
  name: string;
  color: string;
}

export interface ShiftCardData {
  staffId: string;
  staffName: string;
  staffType: StaffType | null;
  department: string | null;
  transportPickup: boolean;
  transportDropoff: boolean;
  shifts: Shift[];
  isOff: boolean;
}

interface ShiftCardProps {
  data: ShiftCardData;
  dayName: string;
  onEditShifts: (staffId: string, dayName: string, shifts: Shift[]) => void;
  onRemoveFromDay: (staffId: string, dayName: string) => void;
  isDragging?: boolean;
}

export default function ShiftCard({ data, dayName, onEditShifts, onRemoveFromDay, isDragging }: ShiftCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();
  const pn = t.backoffice.personnelPage;

  const color = data.staffType?.color || '#606338';

  return (
    <div
      className={`rounded-lg border text-xs cursor-pointer transition-all ${
        isDragging ? 'opacity-50 shadow-lg ring-2 ring-[#606338]/40' : 'hover:ring-1 hover:ring-[#606338]/30'
      } ${data.isOff ? 'opacity-50' : ''}`}
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: data.isOff ? '#ef4444' : color,
        backgroundColor: data.isOff ? 'rgba(239,68,68,0.08)' : `${color}15`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (!data.isOff) setExpanded(!expanded);
      }}
    >
      <div className="p-2">
        <div className="flex items-center justify-between gap-1">
          <span className={`font-semibold text-foreground truncate ${data.isOff ? 'line-through' : ''}`}>
            {data.staffName}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {data.isOff && (
              <span className="text-[10px] font-bold text-red-500 bg-red-500/20 px-1 py-0.5 rounded">{pn.offBadge}</span>
            )}
            {data.department && !data.isOff && (
              <span className={`w-2 h-2 rounded-full ${
                data.department === 'cuisine' ? 'bg-orange-500' : data.department === 'salle' ? 'bg-purple-500' : 'bg-gray-400'
              }`} />
            )}
            {(data.transportPickup || data.transportDropoff) && !data.isOff && (
              <Bus className="w-3 h-3 text-blue-500" />
            )}
          </div>
        </div>
        {!data.isOff && data.shifts.map((shift, i) => (
          <div key={i} className="text-[11px] text-muted-foreground mt-0.5">
            {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
          </div>
        ))}
      </div>

      {/* Inline Editor */}
      {expanded && !data.isOff && (
        <div className="border-t border-border p-2 space-y-2" onClick={(e) => e.stopPropagation()}>
          {data.shifts.map((shift, sIdx) => (
            <div key={sIdx} className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground w-4">#{sIdx + 1}</span>
              <input
                type="time"
                value={shift.start_time}
                onChange={(e) => {
                  const updated = [...data.shifts];
                  updated[sIdx] = { ...updated[sIdx], start_time: e.target.value };
                  onEditShifts(data.staffId, dayName, updated);
                }}
                className="flex-1 px-1.5 py-1 bg-card border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#606338]/50"
              />
              <span className="text-muted-foreground text-[10px]">-</span>
              <input
                type="time"
                value={shift.end_time}
                onChange={(e) => {
                  const updated = [...data.shifts];
                  updated[sIdx] = { ...updated[sIdx], end_time: e.target.value };
                  onEditShifts(data.staffId, dayName, updated);
                }}
                className="flex-1 px-1.5 py-1 bg-card border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#606338]/50"
              />
              {sIdx > 0 && (
                <button
                  onClick={() => {
                    const updated = data.shifts.filter((_, i) => i !== sIdx);
                    onEditShifts(data.staffId, dayName, updated);
                  }}
                  className="p-0.5 text-red-400 hover:text-red-500"
                >
                  <Minus className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between pt-1">
            {data.shifts.length < 2 && (
              <button
                onClick={() => {
                  const updated = [...data.shifts, { start_time: '18:00', end_time: '22:00' }];
                  onEditShifts(data.staffId, dayName, updated);
                }}
                className="text-[10px] text-[#606338] hover:text-[#4d4f2e] flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                {pn.addShift}
              </button>
            )}
            <button
              onClick={() => onRemoveFromDay(data.staffId, dayName)}
              className="text-[10px] text-red-400 hover:text-red-500 flex items-center gap-0.5 ml-auto"
            >
              <Trash2 className="w-3 h-3" />
              {pn.remove}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
