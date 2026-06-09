'use client';

import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Search, GripVertical, ChevronDown, UserPlus } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface StaffType {
  id: string;
  name: string;
  color: string;
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  staff_type: StaffType | null;
  department: string | null;
  transport_pickup: boolean;
  transport_dropoff: boolean;
  is_active: boolean;
}

type ScheduleView = 'combined' | 'cuisine' | 'salle' | 'transport';

interface StaffPoolProps {
  staffMembers: StaffMember[];
  scheduleView: ScheduleView;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

function StaffChip({ staff }: { staff: StaffMember }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `pool-${staff.id}`,
    data: { staffId: staff.id, type: 'pool' },
  });

  const color = staff.staff_type?.color || '#606338';

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-card cursor-grab active:cursor-grabbing select-none transition-all hover:ring-1 hover:ring-[#606338]/30 touch-manipulation ${
        isDragging ? 'opacity-40 shadow-lg' : ''
      }`}
    >
      <GripVertical className="w-3 h-3 text-muted-foreground flex-shrink-0" />
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        {staff.first_name[0]}
      </div>
      <span className="text-xs font-medium text-foreground whitespace-nowrap">
        {staff.first_name} {staff.last_name.charAt(0)}.
      </span>
    </div>
  );
}

export function StaffChipOverlay({ staff }: { staff: StaffMember }) {
  const color = staff.staff_type?.color || '#606338';
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#606338] bg-card shadow-lg ring-2 ring-[#606338]/40">
      <GripVertical className="w-3 h-3 text-muted-foreground flex-shrink-0" />
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
        style={{ backgroundColor: color }}
      >
        {staff.first_name[0]}
      </div>
      <span className="text-xs font-medium text-foreground whitespace-nowrap">
        {staff.first_name} {staff.last_name.charAt(0)}.
      </span>
    </div>
  );
}

export default function StaffPool({ staffMembers, scheduleView, searchTerm, onSearchChange }: StaffPoolProps) {
  const { t } = useTranslation();
  const pn = t.backoffice.personnelPage;

  const filtered = staffMembers
    .filter(s => s.is_active)
    .filter(s => {
      if (scheduleView === 'cuisine') return s.department === 'cuisine';
      if (scheduleView === 'salle') return s.department === 'salle';
      if (scheduleView === 'transport') return s.transport_pickup || s.transport_dropoff;
      return true;
    })
    .filter(s =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const [open, setOpen] = useState(false);

  return (
    <div className="bg-card border border-border rounded-lg mb-4">
      {/* Collapsible header — keeps the board uncluttered until you add staff */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
      >
        <UserPlus className="w-4 h-4 text-[#606338]" />
        <span className="text-sm font-semibold text-foreground">{pn.staffPool}</span>
        <span className="text-xs text-muted-foreground">· {filtered.length} {pn.staff}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground ml-auto transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="px-3 pb-3">
          <div className="relative max-w-[220px] mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={pn.search}
              className="w-full pl-6 pr-2 py-1 text-xs bg-secondary border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-[#606338]/50"
            />
          </div>
          <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto">
            {filtered.map(staff => (
              <StaffChip key={staff.id} staff={staff} />
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">{pn.noResults}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
