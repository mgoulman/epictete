'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Calendar, Clock, DollarSign, Plus, Search, Edit2, Trash2, X, Check,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, UserPlus, Briefcase, Bus, Phone, Mail, MapPin, Download, XCircle, CalendarCheck
} from 'lucide-react';
import { SortHeader, SortDir, sortCompare } from '@/components/backoffice/shared/SortHeader';
import { useTranslation } from '@/lib/i18n/useTranslation';
import ScheduleTable from '@/components/backoffice/personnel/ScheduleTable';
import { plannedShiftFor } from '@/lib/schedule';
import jsPDF from 'jspdf';

interface StaffType {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

interface Shift {
  start_time: string;
  end_time: string;
}

interface DaySchedule {
  enabled: boolean;
  shifts: Shift[];
}

interface WeeklyScheduleConfig {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

interface ComputedShift {
  staff_id: string;
  staff_name: string;
  staff_type: StaffType;
  department: 'cuisine' | 'salle' | null;
  transport_pickup: boolean;
  transport_dropoff: boolean;
  start_time: string;
  end_time: string;
  email: string | null;
  phone: string | null;
  date: string;
  isOff: boolean;
  timeOffId: string | null;
}

type ScheduleView = 'combined' | 'cuisine' | 'salle' | 'transport';

// Transport trip (grouped by time)
interface TransportTripGroup {
  type: 'pickup' | 'dropoff';
  time: string;
  passengers: {
    staff_id: string;
    staff_name: string;
    department: 'cuisine' | 'salle' | null;
    staff_type: StaffType;
    email: string | null;
    phone: string | null;
  }[];
}

// Normalizers for backward compatibility with old DB format
function normalizeWeeklyConfig(raw: Record<string, unknown>): WeeklyScheduleConfig {
  const days: (keyof WeeklyScheduleConfig)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const result: Record<string, DaySchedule> = {};
  for (const day of days) {
    const d = raw[day] as Record<string, unknown> | undefined;
    if (!d) {
      result[day] = { enabled: false, shifts: [{ start_time: '09:00', end_time: '17:00' }] };
      continue;
    }
    // New format already has shifts array
    if (Array.isArray(d.shifts)) {
      result[day] = { enabled: !!d.enabled, shifts: d.shifts as Shift[] };
    } else {
      // Old format: {enabled, start_time, end_time}
      result[day] = {
        enabled: !!d.enabled,
        shifts: [{ start_time: (d.start_time as string) || '09:00', end_time: (d.end_time as string) || '17:00' }]
      };
    }
  }
  return result as unknown as WeeklyScheduleConfig;
}

interface StaffMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  staff_type_id: string;
  staff_type: StaffType;
  hire_date: string;
  hourly_rate: number | null;
  monthly_salary: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  schedule_type: 'weekly' | null;
  schedule_config: WeeklyScheduleConfig | null;
  department: 'cuisine' | 'salle' | null;
  transport_pickup: boolean;
  transport_dropoff: boolean;
  profile_id: string | null;
}

interface TimeOff {
  id: string;
  staff_id: string;
  staff: {
    id: string;
    first_name: string;
    last_name: string;
  };
  start_date: string;
  end_date: string;
  type: string;
  status: string;
  reason: string | null;
  created_at: string;
}

interface SalaryRecord {
  id: string;
  staff_id: string;
  staff: {
    id: string;
    first_name: string;
    last_name: string;
    staff_type: StaffType;
  };
  month: number;
  year: number;
  base_salary: number;
  bonuses: number;
  deductions: number;
  total: number;
  notes: string | null;
  paid_at: string | null;
}

type TabType = 'staff' | 'schedule' | 'presence' | 'time-off' | 'salary';

export default function PersonnelPage() {
  const { t } = useTranslation();
  const pn = t.backoffice.personnelPage;
  const [activeTab, setActiveTab] = useState<TabType>('staff');
  const [staffTypes, setStaffTypes] = useState<StaffType[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [timeOffRecords, setTimeOffRecords] = useState<TimeOff[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StaffMember | TimeOff | SalaryRecord | null>(null);

  // Schedule week navigation
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });

  // Approved time-off for schedule view
  const [approvedTimeOff, setApprovedTimeOff] = useState<TimeOff[]>([]);

  // Weekly summary panel toggle
  const [showWeeklySummary, setShowWeeklySummary] = useState(false);

  // Schedule view filter
  const [scheduleView, setScheduleView] = useState<ScheduleView>('combined');

  // Presence / attendance
  const [presenceDate, setPresenceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [presenceRecords, setPresenceRecords] = useState<{ staff_id: string; check_in_time: string; scheduled_start: string; status: string }[]>([]);

  useEffect(() => {
    if (activeTab !== 'presence') return;
    fetch(`/api/presence?date=${presenceDate}`)
      .then(r => r.json())
      .then(d => setPresenceRecords(d.records || []))
      .catch(() => setPresenceRecords([]));
  }, [activeTab, presenceDate]);

  // Selected shift for detail modal
  const [selectedShift, setSelectedShift] = useState<ComputedShift | null>(null);

  // Salary month/year
  const [salaryMonth, setSalaryMonth] = useState(new Date().getMonth() + 1);
  const [salaryYear, setSalaryYear] = useState(new Date().getFullYear());

  // Salary table sort
  const [salarySort, setSalarySort] = useState('');
  const [salarySortDir, setSalarySortDir] = useState<SortDir>('asc');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [typesRes, staffRes] = await Promise.all([
        fetch('/api/personnel?type=types'),
        fetch('/api/personnel?type=staff')
      ]);

      const typesData = await typesRes.json();
      const staffData = await staffRes.json();

      setStaffTypes(typesData.types || []);
      setStaffMembers(staffData.staff || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTimeOff = useCallback(async () => {
    const res = await fetch('/api/personnel?type=time-off');
    const data = await res.json();
    setTimeOffRecords(data.timeOff || []);
  }, []);

  const fetchSalary = useCallback(async () => {
    const res = await fetch(`/api/personnel?type=salary&year=${salaryYear}&month=${salaryMonth}`);
    const data = await res.json();
    setSalaryRecords(data.salary || []);
  }, [salaryMonth, salaryYear]);

  const fetchApprovedTimeOff = useCallback(async () => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const startStr = currentWeekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];
    const res = await fetch(`/api/personnel?type=time-off&status=approved&startDate=${startStr}&endDate=${endStr}`);
    const data = await res.json();
    setApprovedTimeOff(data.timeOff || []);
  }, [currentWeekStart]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'time-off') fetchTimeOff();
    if (activeTab === 'salary') fetchSalary();
    if (activeTab === 'schedule') fetchApprovedTimeOff();
  }, [activeTab, fetchTimeOff, fetchSalary, fetchApprovedTimeOff]);

  const handleDeleteStaff = async (id: string) => {
    if (!confirm(pn.deleteStaffConfirm)) return;

    await fetch(`/api/personnel?type=staff&id=${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleDeleteTimeOff = async (id: string) => {
    if (!confirm(pn.deleteTimeOff)) return;

    await fetch(`/api/personnel?type=time-off&id=${id}`, { method: 'DELETE' });
    fetchTimeOff();
  };

  const handleDeleteSalary = async (id: string) => {
    if (!confirm(pn.deleteSalaryRecord)) return;

    await fetch(`/api/personnel?type=salary&id=${id}`, { method: 'DELETE' });
    fetchSalary();
  };

  const handleUpdateTimeOffStatus = async (id: string, status: string) => {
    await fetch('/api/personnel', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'time-off', id, status })
    });
    fetchTimeOff();
  };

  const handleMarkDayOff = async (staffId: string, date: string) => {
    await fetch('/api/personnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'time-off',
        staff_id: staffId,
        start_date: date,
        end_date: date,
        time_off_type: 'day_off',
        status: 'approved',
      })
    });
    fetchApprovedTimeOff();
  };

  const handleRemoveDayOff = async (timeOffId: string) => {
    await fetch(`/api/personnel?type=time-off&id=${timeOffId}`, { method: 'DELETE' });
    fetchApprovedTimeOff();
  };

  // Update staff schedule config from ScheduleBoard (DnD)
  const handleUpdateStaffSchedule = useCallback(async (staffId: string, newConfig: WeeklyScheduleConfig) => {
    // Optimistic update
    setStaffMembers(prev => prev.map(s =>
      s.id === staffId
        ? { ...s, schedule_type: 'weekly' as const, schedule_config: newConfig }
        : s
    ));
    // Persist
    await fetch('/api/personnel', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'staff', id: staffId, schedule_type: 'weekly', schedule_config: newConfig }),
    });
  }, []);

  const handleSalarySort = (field: string) => {
    if (salarySort === field) {
      setSalarySortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSalarySort(field);
      setSalarySortDir('asc');
    }
  };

  const filteredStaff = staffMembers.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.staff_type?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getWeekDays = () => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const navigateWeek = (direction: number) => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + (direction * 7));
    setCurrentWeekStart(newStart);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Helper: check if staff has approved time-off on a date
  const isStaffOff = useCallback((staffId: string, dateStr: string): { off: boolean; timeOffId: string | null } => {
    const record = approvedTimeOff.find(t =>
      t.staff_id === staffId && t.start_date <= dateStr && t.end_date >= dateStr
    );
    return { off: !!record, timeOffId: record?.id || null };
  }, [approvedTimeOff]);

  // Auto-compute schedules from staff configs
  const computedSchedules = useMemo(() => {
    const weekDays = getWeekDays();
    const dayMap: Record<number, string> = { 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday', 0: 'sunday' };
    const result: Record<string, ComputedShift[]> = {};

    for (const day of weekDays) {
      const dateStr = day.toISOString().split('T')[0];
      const shifts: ComputedShift[] = [];
      const jsDay = day.getDay();
      const dayName = dayMap[jsDay];

      for (const staff of staffMembers) {
        if (!staff.is_active || !staff.schedule_type || !staff.schedule_config) continue;

        const offStatus = isStaffOff(staff.id, dateStr);

        if (staff.schedule_type === 'weekly') {
          const config = normalizeWeeklyConfig(staff.schedule_config as unknown as Record<string, unknown>);
          const dayConfig = config[dayName as keyof WeeklyScheduleConfig];
          if (dayConfig?.enabled) {
            for (const shift of dayConfig.shifts) {
              shifts.push({
                staff_id: staff.id,
                staff_name: `${staff.first_name} ${staff.last_name}`,
                staff_type: staff.staff_type,
                department: staff.department,
                transport_pickup: staff.transport_pickup ?? false,
                transport_dropoff: staff.transport_dropoff ?? false,
                start_time: shift.start_time,
                end_time: shift.end_time,
                email: staff.email,
                phone: staff.phone,
                date: dateStr,
                isOff: offStatus.off,
                timeOffId: offStatus.timeOffId,
              });
            }
          }
        }
      }

      result[dateStr] = shifts;
    }

    return result;
  }, [staffMembers, currentWeekStart, isStaffOff]);

  const getSchedulesForDay = (date: Date): ComputedShift[] => {
    const dateStr = date.toISOString().split('T')[0];
    const allShifts = computedSchedules[dateStr] || [];

    // Filter by view
    if (scheduleView === 'cuisine') {
      return allShifts.filter(s => s.department === 'cuisine');
    }
    if (scheduleView === 'salle') {
      return allShifts.filter(s => s.department === 'salle');
    }
    if (scheduleView === 'transport') {
      return allShifts.filter(s => s.transport_pickup || s.transport_dropoff);
    }
    return allShifts; // combined
  };

  // Compute transport trips for a day (grouped by time)
  const getTransportTripsForDay = (date: Date): TransportTripGroup[] => {
    const dateStr = date.toISOString().split('T')[0];
    const allShifts = computedSchedules[dateStr] || [];

    const pickupMap = new Map<string, TransportTripGroup['passengers']>();
    const dropoffMap = new Map<string, TransportTripGroup['passengers']>();

    for (const shift of allShifts) {
      const passenger = {
        staff_id: shift.staff_id,
        staff_name: shift.staff_name,
        department: shift.department,
        staff_type: shift.staff_type,
        email: shift.email,
        phone: shift.phone,
      };

      // Pickup at start time
      if (shift.transport_pickup) {
        const time = shift.start_time.slice(0, 5);
        if (!pickupMap.has(time)) pickupMap.set(time, []);
        pickupMap.get(time)!.push(passenger);
      }

      // Dropoff at end time
      if (shift.transport_dropoff) {
        const time = shift.end_time.slice(0, 5);
        if (!dropoffMap.has(time)) dropoffMap.set(time, []);
        dropoffMap.get(time)!.push(passenger);
      }
    }

    const trips: TransportTripGroup[] = [];

    // Add pickup trips
    for (const [time, passengers] of pickupMap) {
      trips.push({ type: 'pickup', time, passengers });
    }

    // Add dropoff trips
    for (const [time, passengers] of dropoffMap) {
      trips.push({ type: 'dropoff', time, passengers });
    }

    // Sort by time
    trips.sort((a, b) => a.time.localeCompare(b.time));

    return trips;
  };

  // State for selected trip (for modal)
  const [selectedTrip, setSelectedTrip] = useState<{ trip: TransportTripGroup; date: string } | null>(null);

  // PDF export state
  const [isExporting, setIsExporting] = useState(false);

  // Download schedule as PDF (built manually with jsPDF)
  const downloadSchedulePDF = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const weekDays = getWeekDays();

      // Title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(96, 99, 56);
      const title = pn.weeklySchedule;
      pdf.text(title, pageWidth / 2, 15, { align: 'center' });

      // Date range
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(80, 80, 80);
      pdf.text(`${formatDate(currentWeekStart)} - ${formatDate(weekDays[6])}`, pageWidth / 2, 22, { align: 'center' });

      // View label
      pdf.setFontSize(11);
      pdf.setTextColor(100, 100, 100);
      const viewLabel = scheduleView === 'combined' ? pn.allStaff :
        scheduleView === 'cuisine' ? pn.cuisineOnly :
        scheduleView === 'salle' ? pn.salleOnly : pn.transportSchedule;
      pdf.text(viewLabel, pageWidth / 2, 28, { align: 'center' });

      let currentY = 35;

      // For each day of the week
      weekDays.forEach((day, dayIdx) => {
        const isToday = day.toDateString() === new Date().toDateString();
        const dayName = day.toLocaleDateString('en-US', { weekday: 'long' });
        const dayDate = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        // Check if we need a new page
        if (currentY > pageHeight - 40) {
          pdf.addPage();
          currentY = 15;
        }

        // Day header
        if (isToday) {
          pdf.setFillColor(96, 99, 56);
          pdf.rect(margin, currentY, pageWidth - margin * 2, 8, 'F');
          pdf.setTextColor(255, 255, 255);
        } else {
          pdf.setFillColor(240, 240, 240);
          pdf.rect(margin, currentY, pageWidth - margin * 2, 8, 'F');
          pdf.setTextColor(50, 50, 50);
        }

        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${dayName}, ${dayDate}`, margin + 3, currentY + 5.5);
        pdf.setFont('helvetica', 'normal');
        currentY += 10;

        if (scheduleView === 'transport') {
          // Transport view - show trips with passengers
          const trips = getTransportTripsForDay(day);

          if (trips.length === 0) {
            pdf.setFontSize(9);
            pdf.setTextColor(150, 150, 150);
            pdf.text(pn.noTransportScheduled, margin + 5, currentY + 4);
            currentY += 8;
          } else {
            trips.forEach(trip => {
              const isPickup = trip.type === 'pickup';
              const boxHeight = 8 + trip.passengers.length * 5;

              // Check for page break
              if (currentY + boxHeight > pageHeight - 15) {
                pdf.addPage();
                currentY = 15;
              }

              // Trip box background
              pdf.setFillColor(isPickup ? 220 : 255, isPickup ? 250 : 230, isPickup ? 220 : 230);
              pdf.rect(margin, currentY, pageWidth - margin * 2, boxHeight, 'F');

              // Left border
              pdf.setFillColor(isPickup ? 34 : 220, isPickup ? 180 : 80, isPickup ? 34 : 80);
              pdf.rect(margin, currentY, 3, boxHeight, 'F');

              // Trip header
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(isPickup ? 34 : 180, isPickup ? 120 : 60, isPickup ? 34 : 60);
              pdf.text(`${isPickup ? `↑ ${pn.pickup.toUpperCase()}` : `↓ ${pn.dropoff.toUpperCase()}`} ${trip.time}`, margin + 6, currentY + 6);

              pdf.setFontSize(10);
              pdf.setTextColor(80, 80, 80);
              pdf.text(`${trip.passengers.length} ${trip.passengers.length > 1 ? pn.passengers : pn.passenger}`, pageWidth - margin - 5, currentY + 6, { align: 'right' });

              // Passenger list
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(10);
              let passengerY = currentY + 12;

              trip.passengers.forEach((p, pIdx) => {
                pdf.setTextColor(60, 60, 60);
                const deptLabel = p.department === 'cuisine' ? ` (${pn.cuisine})` : p.department === 'salle' ? ` (${pn.salle})` : '';
                pdf.text(`• ${p.staff_name}${deptLabel}`, margin + 8, passengerY);
                passengerY += 5;
              });

              currentY += boxHeight + 3;
            });
          }
        } else {
          // Shift view
          const shifts = getSchedulesForDay(day);

          if (shifts.length === 0) {
            pdf.setFontSize(9);
            pdf.setTextColor(150, 150, 150);
            pdf.text(pn.noShiftsScheduled, margin + 5, currentY + 4);
            currentY += 8;
          } else {
            shifts.forEach(shift => {
              // Check for page break
              if (currentY + 10 > pageHeight - 15) {
                pdf.addPage();
                currentY = 15;
              }

              // Get color from staff type
              const color = shift.staff_type?.color || '#606338';
              const r = parseInt(color.slice(1, 3), 16);
              const g = parseInt(color.slice(3, 5), 16);
              const b = parseInt(color.slice(5, 7), 16);

              // Shift box background
              pdf.setFillColor(r + (255 - r) * 0.85, g + (255 - g) * 0.85, b + (255 - b) * 0.85);
              pdf.rect(margin, currentY, pageWidth - margin * 2, 9, 'F');

              // Left border
              pdf.setFillColor(r, g, b);
              pdf.rect(margin, currentY, 3, 9, 'F');

              // Staff name
              pdf.setFontSize(11);
              pdf.setFont('helvetica', 'bold');
              pdf.setTextColor(40, 40, 40);
              pdf.text(shift.staff_name, margin + 6, currentY + 6);

              // Time
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(10);
              pdf.setTextColor(80, 80, 80);
              pdf.text(`${shift.start_time.slice(0, 5)} - ${shift.end_time.slice(0, 5)}`, pageWidth - margin - 40, currentY + 6);

              // Department badge
              if (shift.department) {
                const deptColor = shift.department === 'cuisine' ? [255, 165, 0] : [147, 51, 234];
                pdf.setFillColor(deptColor[0], deptColor[1], deptColor[2]);
                pdf.roundedRect(pageWidth - margin - 25, currentY + 2, 20, 5, 1, 1, 'F');
                pdf.setFontSize(7);
                pdf.setTextColor(255, 255, 255);
                pdf.text(shift.department === 'cuisine' ? pn.cuisine : pn.salle, pageWidth - margin - 15, currentY + 5.5, { align: 'center' });
              }

              // Transport indicator
              if (shift.transport_pickup || shift.transport_dropoff) {
                pdf.setFontSize(8);
                pdf.setTextColor(59, 130, 246);
                const transportLabel = shift.transport_pickup && shift.transport_dropoff ? `↑↓ ${pn.transport}` :
                  shift.transport_pickup ? `↑ ${pn.pickup}` : `↓ ${pn.dropoff}`;
                pdf.text(transportLabel, margin + 80, currentY + 6);
              }

              currentY += 11;
            });
          }
        }

        currentY += 5; // Space between days
      });

      // Footer on last page
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`${pn.generatedOn} ${new Date().toLocaleDateString()}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

      // Download
      const fileName = `schedule-${currentWeekStart.toISOString().split('T')[0]}-${scheduleView}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(pn.failedPdf);
    } finally {
      setIsExporting(false);
    }
  };

  const tabs = [
    { id: 'staff' as TabType, label: pn.tabs.staff, icon: Users },
    { id: 'schedule' as TabType, label: pn.tabs.schedule, icon: Calendar },
    { id: 'presence' as TabType, label: 'Présence', icon: CalendarCheck },
    { id: 'time-off' as TabType, label: pn.tabs.timeOff, icon: Clock },
    { id: 'salary' as TabType, label: pn.tabs.salary, icon: DollarSign },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">{pn.title}</h1>
        <p className="text-muted-foreground mt-1">{pn.subtitle}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-[#606338] text-white'
                : 'text-muted-foreground hover:text-foreground hover:bg-card'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Staff Tab */}
      {activeTab === 'staff' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={pn.searchStaff}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              />
            </div>
            <button
              onClick={() => { setEditingItem(null); setShowStaffModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              {pn.addStaff}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{pn.loading}</div>
          ) : (
            <div className="grid gap-4">
              {filteredStaff.map(staff => (
                <div key={staff.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: staff.staff_type?.color || '#606338' }}
                    >
                      {staff.first_name[0]}{staff.last_name[0]}
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{staff.first_name} {staff.last_name}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: staff.staff_type?.color || '#606338' }}
                        >
                          {staff.staff_type?.name}
                        </span>
{(staff.transport_pickup || staff.transport_dropoff) && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 flex items-center gap-1">
                            <Bus className="w-3 h-3" />
                            {pn.transportBeneficiary}
                          </span>
                        )}
                        {!staff.is_active && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-500">Inactive</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right text-sm">
                      {staff.email && <p className="text-muted-foreground">{staff.email}</p>}
                      {staff.phone && <p className="text-muted-foreground">{staff.phone}</p>}
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-foreground font-medium">
                        {staff.monthly_salary
                          ? `${staff.monthly_salary.toLocaleString()} DH/mo`
                          : '-'
                        }
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Since {new Date(staff.hire_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { setEditingItem(staff); setShowStaffModal(true); }}
                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStaff(staff.id)}
                        className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredStaff.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  {pn.noStaffFound}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigateWeek(-1)}
                className="p-2 hover:bg-card rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-lg font-medium">
                {formatDate(currentWeekStart)} - {formatDate(getWeekDays()[6])}
              </span>
              <button
                onClick={() => navigateWeek(1)}
                className="p-2 hover:bg-card rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            {/* View Filter & Download */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {(['combined', 'cuisine', 'salle', 'transport'] as ScheduleView[]).map(view => (
                  <button
                    key={view}
                    onClick={() => setScheduleView(view)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      scheduleView === view
                        ? view === 'cuisine' ? 'bg-orange-500 text-white'
                          : view === 'salle' ? 'bg-purple-500 text-white'
                          : view === 'transport' ? 'bg-blue-500 text-white'
                          : 'bg-[#606338] text-white'
                        : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {view === 'combined' ? pn.all : view === 'cuisine' ? pn.cuisine : view === 'salle' ? pn.salle : pn.transport}
                  </button>
                ))}
              </div>
              <button
                onClick={downloadSchedulePDF}
                disabled={isExporting}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] transition-colors disabled:opacity-50 text-sm font-medium"
                title={pn.downloadPdf}
              >
                <Download className="w-4 h-4" />
                {isExporting ? pn.exporting : pn.pdf}
              </button>
            </div>
          </div>

          {/* Staff-row schedule table (click a cell to edit) */}
          <ScheduleTable
            staffMembers={staffMembers}
            weekDays={getWeekDays()}
            approvedTimeOff={approvedTimeOff}
            scheduleView={scheduleView}
            onUpdateStaffSchedule={handleUpdateStaffSchedule}
          />

          {/* Weekly Summary Panel */}
          <div className="mt-4">
            <button
              onClick={() => setShowWeeklySummary(!showWeeklySummary)}
              className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium hover:bg-secondary transition-colors w-full justify-between"
            >
              <span>{pn.weeklySummary}</span>
              {showWeeklySummary ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showWeeklySummary && (
              <div className="mt-2 bg-card border border-border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="text-left p-2 font-medium text-muted-foreground sticky left-0 bg-secondary min-w-[150px]">{pn.staff}</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">{pn.type}</th>
                      {getWeekDays().map((day, idx) => (
                        <th key={idx} className="text-center p-2 font-medium text-muted-foreground min-w-[60px]">
                          {day.toLocaleDateString('en-US', { weekday: 'short' })}
                        </th>
                      ))}
                      <th className="text-center p-2 font-medium text-muted-foreground min-w-[70px]">{pn.hours}</th>
                      <th className="text-center p-2 font-medium text-muted-foreground min-w-[60px]">{pn.offLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const weekDays = getWeekDays();
                      const allShifts = weekDays.flatMap(day => computedSchedules[day.toISOString().split('T')[0]] || []);
                      const staffIds = [...new Set(allShifts.map(s => s.staff_id))];
                      return staffIds.map(staffId => {
                        const staffShifts = allShifts.filter(s => s.staff_id === staffId);
                        const staffName = staffShifts[0]?.staff_name || '';
                        const staffType = staffShifts[0]?.staff_type;
                        let totalMinutes = 0;
                        let offDays = 0;

                        return (
                          <tr key={staffId} className="border-t border-border">
                            <td className="p-2 font-medium text-foreground sticky left-0 bg-card">{staffName}</td>
                            <td className="p-2">
                              <span
                                className="text-xs px-2 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: staffType?.color || '#606338' }}
                              >
                                {staffType?.name}
                              </span>
                            </td>
                            {weekDays.map((day, idx) => {
                              const dateStr = day.toISOString().split('T')[0];
                              const dayShifts = (computedSchedules[dateStr] || []).filter(s => s.staff_id === staffId);
                              if (dayShifts.length === 0) return <td key={idx} className="text-center p-2 text-muted-foreground">-</td>;
                              const isOff = dayShifts[0]?.isOff;
                              if (isOff) {
                                offDays++;
                                return <td key={idx} className="text-center p-2 text-red-500 font-bold">{pn.offBadge}</td>;
                              }
                              const dayMinutes = dayShifts.reduce((sum, s) => {
                                const sp = s.start_time.split(':').map(Number);
                                const ep = s.end_time.split(':').map(Number);
                                return sum + ((ep[0] * 60 + ep[1]) - (sp[0] * 60 + sp[1]));
                              }, 0);
                              totalMinutes += dayMinutes;
                              const h = Math.floor(dayMinutes / 60);
                              const m = dayMinutes % 60;
                              return <td key={idx} className="text-center p-2 text-foreground">{h}h{m > 0 ? m : ''}</td>;
                            })}
                            <td className="text-center p-2 font-semibold text-foreground">{Math.floor(totalMinutes / 60)}h{totalMinutes % 60 > 0 ? totalMinutes % 60 : ''}</td>
                            <td className="text-center p-2">
                              {offDays > 0 ? <span className="text-red-500 font-bold">{offDays}</span> : <span className="text-muted-foreground">0</span>}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Presence Tab */}
      {activeTab === 'presence' && (() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
        const recByStaff = new Map(presenceRecords.map(r => [r.staff_id, r]));
        const rows = staffMembers
          .filter(s => s.is_active)
          .map(s => ({ staff: s, planned: plannedShiftFor(s.schedule_config, presenceDate) }))
          .filter(r => r.planned !== null);

        return (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => { const d = new Date(presenceDate); d.setDate(d.getDate() - 1); setPresenceDate(d.toISOString().split('T')[0]); }} className="p-2 hover:bg-card rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
              <input type="date" value={presenceDate} onChange={e => setPresenceDate(e.target.value)} className="px-3 py-2 bg-secondary border border-border rounded-lg text-sm" />
              <button onClick={() => { const d = new Date(presenceDate); d.setDate(d.getDate() + 1); setPresenceDate(d.toISOString().split('T')[0]); }} className="p-2 hover:bg-card rounded-lg"><ChevronRight className="w-5 h-5" /></button>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground min-w-[180px]">{pn.staff}</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Prévu</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Pointage</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ staff, planned }) => {
                    const rec = recByStaff.get(staff.id);
                    let label: string, cls: string;
                    if (rec) {
                      const isLate = rec.status === 'late';
                      label = isLate ? 'En retard' : 'À l’heure';
                      cls = isLate ? 'bg-amber-500/15 text-amber-500' : 'bg-green-500/15 text-green-500';
                    } else {
                      const startMin = parseInt(planned!.start_time.slice(0, 2)) * 60 + parseInt(planned!.start_time.slice(3, 5));
                      const pastStart = presenceDate < todayStr || (presenceDate === todayStr && nowMin > startMin);
                      if (pastStart) { label = 'Absent'; cls = 'bg-red-500/15 text-red-500'; }
                      else { label = 'À venir'; cls = 'bg-secondary text-muted-foreground'; }
                    }
                    const arrival = rec?.check_in_time ? new Date(rec.check_in_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—';
                    return (
                      <tr key={staff.id} className="border-t border-border">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: staff.staff_type?.color || '#606338' }}>{staff.first_name[0]}{staff.last_name[0]}</span>
                            <span className="font-medium text-foreground">{staff.first_name} {staff.last_name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-foreground">{planned!.start_time.slice(0, 5)}–{planned!.end_time.slice(0, 5)}</td>
                        <td className="p-3 text-foreground">{arrival}</td>
                        <td className="p-3"><span className={`text-xs font-medium px-2 py-1 rounded-full ${cls}`}>{label}</span></td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Aucun personnel planifié ce jour.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Time Off Tab */}
      {activeTab === 'time-off' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => { setEditingItem(null); setShowTimeOffModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] transition-colors"
            >
              <Plus className="w-4 h-4" />
              {pn.requestTimeOff}
            </button>
          </div>

          <div className="space-y-4">
            {timeOffRecords.map(record => (
              <div key={record.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-12 rounded-full ${
                      record.status === 'approved' ? 'bg-green-500' :
                      record.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {record.staff?.first_name} {record.staff?.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(record.start_date).toLocaleDateString()} - {new Date(record.end_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        record.type === 'vacation' ? 'bg-blue-500/20 text-blue-500' :
                        record.type === 'sick' ? 'bg-orange-500/20 text-orange-500' :
                        'bg-gray-500/20 text-gray-500'
                      }`}>
                        {record.type}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1 capitalize">{record.status}</p>
                    </div>
                    {record.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleUpdateTimeOffStatus(record.id, 'approved')}
                          className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                          title={pn.approve}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleUpdateTimeOffStatus(record.id, 'rejected')}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title={pn.reject}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => handleDeleteTimeOff(record.id)}
                      className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {record.reason && (
                  <p className="text-sm text-muted-foreground mt-2 ml-6">{record.reason}</p>
                )}
              </div>
            ))}
            {timeOffRecords.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                {pn.noTimeOffRequests}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Salary Tab */}
      {activeTab === 'salary' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <select
                value={salaryMonth}
                onChange={(e) => setSalaryMonth(Number(e.target.value))}
                className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
              <select
                value={salaryYear}
                onChange={(e) => setSalaryYear(Number(e.target.value))}
                className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>
            <button
              onClick={() => { setEditingItem(null); setShowSalaryModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] transition-colors"
            >
              <Briefcase className="w-4 h-4" />
              {pn.addSalaryRecord}
            </button>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left p-3"><SortHeader label={pn.employee} field="staff.first_name" currentSort={salarySort} currentDir={salarySortDir} onSort={handleSalarySort} align="left" className="text-sm font-medium text-muted-foreground" /></th>
                  <th className="text-left p-3"><SortHeader label={pn.type} field="staff.staff_type.name" currentSort={salarySort} currentDir={salarySortDir} onSort={handleSalarySort} align="left" className="text-sm font-medium text-muted-foreground" /></th>
                  <th className="text-right p-3"><SortHeader label={pn.baseSalary} field="base_salary" currentSort={salarySort} currentDir={salarySortDir} onSort={handleSalarySort} align="right" className="text-sm font-medium text-muted-foreground" /></th>
                  <th className="text-right p-3"><SortHeader label={pn.bonuses} field="bonuses" currentSort={salarySort} currentDir={salarySortDir} onSort={handleSalarySort} align="right" className="text-sm font-medium text-muted-foreground" /></th>
                  <th className="text-right p-3"><SortHeader label={pn.deductions} field="deductions" currentSort={salarySort} currentDir={salarySortDir} onSort={handleSalarySort} align="right" className="text-sm font-medium text-muted-foreground" /></th>
                  <th className="text-right p-3"><SortHeader label={pn.total} field="total" currentSort={salarySort} currentDir={salarySortDir} onSort={handleSalarySort} align="right" className="text-sm font-medium text-muted-foreground" /></th>
                  <th className="text-center p-3"><SortHeader label={pn.status} field="paid_at" currentSort={salarySort} currentDir={salarySortDir} onSort={handleSalarySort} align="center" className="text-sm font-medium text-muted-foreground" /></th>
                  <th className="text-right p-3 text-sm font-medium text-muted-foreground">{pn.actions}</th>
                </tr>
              </thead>
              <tbody>
                {[...salaryRecords].sort((a, b) => salarySort ? sortCompare(a, b, salarySort, salarySortDir) : 0).map(record => (
                  <tr key={record.id} className="border-t border-border">
                    <td className="p-3">
                      <span className="font-medium text-foreground">
                        {record.staff?.first_name} {record.staff?.last_name}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: record.staff?.staff_type?.color || '#606338' }}
                      >
                        {record.staff?.staff_type?.name}
                      </span>
                    </td>
                    <td className="p-3 text-right text-foreground">{record.base_salary.toLocaleString()} DH</td>
                    <td className="p-3 text-right text-green-500">+{record.bonuses.toLocaleString()} DH</td>
                    <td className="p-3 text-right text-red-500">-{record.deductions.toLocaleString()} DH</td>
                    <td className="p-3 text-right font-semibold text-foreground">{record.total.toLocaleString()} DH</td>
                    <td className="p-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        record.paid_at ? 'bg-green-500/20 text-green-500' : 'bg-yellow-500/20 text-yellow-500'
                      }`}>
                        {record.paid_at ? pn.paid : pn.pendingStatus}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditingItem(record); setShowSalaryModal(true); }}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSalary(record.id)}
                          className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {salaryRecords.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      {pn.noSalaryRecords}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {salaryRecords.length > 0 && (
            <div className="mt-4 p-4 bg-card border border-border rounded-lg flex justify-between items-center">
              <span className="text-muted-foreground">{pn.totalPayroll}</span>
              <span className="text-xl font-bold text-foreground">
                {salaryRecords.reduce((sum, r) => sum + r.total, 0).toLocaleString()} DH
              </span>
            </div>
          )}
        </div>
      )}

      {/* Staff Modal */}
      {showStaffModal && (
        <StaffModal
          staffTypes={staffTypes}
          editingStaff={editingItem as StaffMember | null}
          onClose={() => { setShowStaffModal(false); setEditingItem(null); }}
          onSave={() => { setShowStaffModal(false); setEditingItem(null); fetchData(); }}
        />
      )}

      {/* Time Off Modal */}
      {showTimeOffModal && (
        <TimeOffModal
          staffMembers={staffMembers}
          onClose={() => { setShowTimeOffModal(false); setEditingItem(null); }}
          onSave={() => { setShowTimeOffModal(false); setEditingItem(null); fetchTimeOff(); }}
        />
      )}

      {/* Salary Modal */}
      {showSalaryModal && (
        <SalaryModal
          staffMembers={staffMembers}
          editingRecord={editingItem as SalaryRecord | null}
          month={salaryMonth}
          year={salaryYear}
          onClose={() => { setShowSalaryModal(false); setEditingItem(null); }}
          onSave={() => { setShowSalaryModal(false); setEditingItem(null); fetchSalary(); }}
        />
      )}

      {/* Shift Detail Modal */}
      {selectedShift && (
        <ShiftDetailModal
          shift={selectedShift}
          onClose={() => setSelectedShift(null)}
          onMarkDayOff={async () => {
            await handleMarkDayOff(selectedShift.staff_id, selectedShift.date);
            setSelectedShift(null);
          }}
          onRemoveDayOff={async () => {
            if (selectedShift.timeOffId) {
              await handleRemoveDayOff(selectedShift.timeOffId);
              setSelectedShift(null);
            }
          }}
        />
      )}

      {/* Transport Trip Modal */}
      {selectedTrip && (
        <TransportTripModal
          trip={selectedTrip.trip}
          date={selectedTrip.date}
          onClose={() => setSelectedTrip(null)}
        />
      )}
    </div>
  );
}


// Staff Modal Component
function StaffModal({
  staffTypes,
  editingStaff,
  onClose,
  onSave
}: {
  staffTypes: StaffType[];
  editingStaff: StaffMember | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const pn = t.backoffice.personnelPage;
  const [formData, setFormData] = useState({
    first_name: editingStaff?.first_name || '',
    last_name: editingStaff?.last_name || '',
    email: editingStaff?.email || '',
    phone: editingStaff?.phone || '',
    staff_type_id: editingStaff?.staff_type_id || staffTypes[0]?.id || '',
    hire_date: editingStaff?.hire_date || new Date().toISOString().split('T')[0],
    monthly_salary: editingStaff?.monthly_salary || '',
    is_active: editingStaff?.is_active ?? true,
    notes: editingStaff?.notes || '',
    department: editingStaff?.department || '',
    transport_pickup: editingStaff?.transport_pickup ?? false,
    transport_dropoff: editingStaff?.transport_dropoff ?? false,
    profile_id: editingStaff?.profile_id || ''
  });

  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<{ id: string; full_name: string | null; email: string }[]>([]);
  // Optional account creation (create mode only)
  const [makeUser, setMakeUser] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');
  const [accountRoleId, setAccountRoleId] = useState('');
  const [roles, setRoles] = useState<{ id: string; display_name: string }[]>([]);

  useEffect(() => {
    fetch('/api/personnel?type=profiles')
      .then(r => r.json())
      .then(d => setProfiles(d.profiles || []))
      .catch(() => {});
    fetch('/api/personnel?type=roles')
      .then(r => r.json())
      .then(d => setRoles((d.roles || []).filter((r: { name: string }) => r.name !== 'admin')))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (makeUser && (!formData.email || !accountPassword)) {
      alert('Email et mot de passe requis pour créer un compte.');
      return;
    }
    setSaving(true);

    const payload = {
      type: 'staff',
      ...formData,
      monthly_salary: formData.monthly_salary ? Number(formData.monthly_salary) : null,
      department: formData.department || null,
      transport_pickup: formData.transport_pickup,
      transport_dropoff: formData.transport_dropoff,
      profile_id: formData.profile_id || null,
      ...(editingStaff && { id: editingStaff.id }),
      ...(!editingStaff && makeUser && { account: { create: true, password: accountPassword, role_id: accountRoleId || null } }),
    };

    const res = await fetch('/api/personnel', {
      method: editingStaff ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (data.accountError) alert(data.accountError);

    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">{editingStaff ? pn.editStaff : pn.addStaffMember}</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{pn.firstName}</label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{pn.lastName}</label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{pn.staffType}</label>
            <select
              required
              value={formData.staff_type_id}
              onChange={(e) => setFormData({ ...formData, staff_type_id: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
            >
              {staffTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{pn.email}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{pn.phone}</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{pn.hireDate}</label>
            <input
              type="date"
              required
              value={formData.hire_date}
              onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{pn.monthlySalary}</label>
            <input
              type="number"
              step="0.01"
              value={formData.monthly_salary}
              onChange={(e) => setFormData({ ...formData, monthly_salary: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{pn.notes}</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
            />
          </div>

          {/* Department & Transport Section */}
          <div className="border-t border-border pt-4 mt-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              {pn.deptTransport}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{pn.department}</label>
                <select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
                >
                  <option value="">{pn.notAssigned}</option>
                  <option value="cuisine">{pn.cuisineKitchen}</option>
                  <option value="salle">{pn.salleDining}</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {pn.deptUsedFor}
                </p>
              </div>

              {/* User account: create a new login, or link an existing one */}
              <div className="space-y-2">
                {!editingStaff && (
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={makeUser}
                      onChange={(e) => { setMakeUser(e.target.checked); if (e.target.checked) setFormData({ ...formData, profile_id: '' }); }}
                      className="w-4 h-4 accent-[#606338]"
                    />
                    <span className="text-sm text-foreground">Créer un compte de connexion</span>
                  </label>
                )}

                {makeUser && !editingStaff ? (
                  <div className="space-y-2 p-3 bg-secondary/50 border border-border rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      L&apos;email du membre ({formData.email || '—'}) servira d&apos;identifiant.
                    </p>
                    <div>
                      <label className="block text-xs font-medium mb-1">Mot de passe *</label>
                      <input
                        type="text"
                        value={accountPassword}
                        onChange={(e) => setAccountPassword(e.target.value)}
                        placeholder="Mot de passe"
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Rôle *</label>
                      <select
                        value={accountRoleId}
                        onChange={(e) => setAccountRoleId(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
                      >
                        <option value="">— Choisir un rôle —</option>
                        {roles.map(r => <option key={r.id} value={r.id}>{r.display_name}</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-1">Compte utilisateur</label>
                    <select
                      value={formData.profile_id}
                      onChange={(e) => setFormData({ ...formData, profile_id: e.target.value })}
                      className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
                    >
                      <option value="">— Aucun compte lié —</option>
                      {profiles.map(p => (
                        <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Liez ce membre à un compte de connexion existant (ex. un serveur verra « Mes tables »).
                    </p>
                  </div>
                )}
              </div>

              {/* Transport Beneficiary Toggle */}
              <div
                className={`rounded-lg border p-3 transition-colors cursor-pointer ${
                  formData.transport_pickup || formData.transport_dropoff
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-secondary border-border'
                }`}
                onClick={() => {
                  const isCurrentlyBeneficiary = formData.transport_pickup || formData.transport_dropoff;
                  if (isCurrentlyBeneficiary) {
                    setFormData({ ...formData, transport_pickup: false, transport_dropoff: false });
                  } else {
                    setFormData({ ...formData, transport_pickup: true, transport_dropoff: true });
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      formData.transport_pickup || formData.transport_dropoff
                        ? 'bg-green-500/20'
                        : 'bg-muted'
                    }`}>
                      <Bus className={`w-5 h-5 ${
                        formData.transport_pickup || formData.transport_dropoff
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{pn.transportBeneficiary}</p>
                      <p className="text-xs text-muted-foreground">{pn.transportBeneficiaryDesc}</p>
                    </div>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-colors relative ${
                    formData.transport_pickup || formData.transport_dropoff
                      ? 'bg-green-500'
                      : 'bg-muted-foreground/30'
                  }`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      formData.transport_pickup || formData.transport_dropoff
                        ? 'translate-x-5'
                        : 'translate-x-1'
                    }`} />
                  </div>
                </div>
              </div>

              {/* Pickup / Dropoff options - shown when beneficiary */}
              {(formData.transport_pickup || formData.transport_dropoff) && (
                <div className="flex items-center gap-6 ml-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="transport_pickup"
                      checked={formData.transport_pickup}
                      onChange={(e) => setFormData({ ...formData, transport_pickup: e.target.checked })}
                      className="w-4 h-4 rounded border-border text-[#606338] focus:ring-[#606338]"
                    />
                    <label htmlFor="transport_pickup" className="text-sm">{pn.needsPickup}</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="transport_dropoff"
                      checked={formData.transport_dropoff}
                      onChange={(e) => setFormData({ ...formData, transport_dropoff: e.target.checked })}
                      className="w-4 h-4 rounded border-border text-[#606338] focus:ring-[#606338]"
                    />
                    <label htmlFor="transport_dropoff" className="text-sm">{pn.needsDropoff}</label>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {pn.transportNote}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-border text-[#606338] focus:ring-[#606338]"
            />
            <label htmlFor="is_active" className="text-sm">{pn.activeEmployee}</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              {pn.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] transition-colors disabled:opacity-50"
            >
              {saving ? pn.saving : editingStaff ? pn.update : pn.addStaff}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Time Off Modal Component
function TimeOffModal({
  staffMembers,
  onClose,
  onSave
}: {
  staffMembers: StaffMember[];
  onClose: () => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const pn = t.backoffice.personnelPage;
  const [formData, setFormData] = useState({
    staff_id: staffMembers[0]?.id || '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    type: 'vacation',
    reason: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    await fetch('/api/personnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'time-off', staff_id: formData.staff_id, start_date: formData.start_date, end_date: formData.end_date, time_off_type: formData.type, reason: formData.reason, status: 'pending' })
    });

    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">{pn.requestTimeOff}</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{pn.staffMember}</label>
            <select
              required
              value={formData.staff_id}
              onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
            >
              {staffMembers.filter(s => s.is_active).map(staff => (
                <option key={staff.id} value={staff.id}>
                  {staff.first_name} {staff.last_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{pn.startDate}</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{pn.endDate}</label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{pn.typeLabel}</label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
            >
              <option value="vacation">{pn.vacation}</option>
              <option value="sick">{pn.sickLeave}</option>
              <option value="personal">{pn.personal}</option>
              <option value="other">{pn.other}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{pn.reason}</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              placeholder={pn.reasonPlaceholder}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              {pn.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] transition-colors disabled:opacity-50"
            >
              {saving ? pn.saving : pn.submitRequest}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Salary Modal Component
function SalaryModal({
  staffMembers,
  editingRecord,
  month,
  year,
  onClose,
  onSave
}: {
  staffMembers: StaffMember[];
  editingRecord: SalaryRecord | null;
  month: number;
  year: number;
  onClose: () => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const pn = t.backoffice.personnelPage;
  const [formData, setFormData] = useState({
    staff_id: editingRecord?.staff_id || staffMembers[0]?.id || '',
    month: editingRecord?.month || month,
    year: editingRecord?.year || year,
    base_salary: editingRecord?.base_salary || '',
    bonuses: editingRecord?.bonuses || 0,
    deductions: editingRecord?.deductions || 0,
    notes: editingRecord?.notes || '',
    paid_at: editingRecord?.paid_at || ''
  });
  const [saving, setSaving] = useState(false);

  // Auto-fill base salary from staff member
  useEffect(() => {
    if (!editingRecord && formData.staff_id) {
      const staff = staffMembers.find(s => s.id === formData.staff_id);
      if (staff?.monthly_salary) {
        setFormData(prev => ({ ...prev, base_salary: staff.monthly_salary || '' }));
      }
    }
  }, [formData.staff_id, staffMembers, editingRecord]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      type: 'salary',
      ...formData,
      base_salary: Number(formData.base_salary),
      bonuses: Number(formData.bonuses),
      deductions: Number(formData.deductions),
      paid_at: formData.paid_at || null,
      ...(editingRecord && { id: editingRecord.id })
    };

    await fetch('/api/personnel', {
      method: editingRecord ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    setSaving(false);
    onSave();
  };

  const total = Number(formData.base_salary || 0) + Number(formData.bonuses || 0) - Number(formData.deductions || 0);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">{editingRecord ? pn.editSalaryRecord : pn.addSalaryRecord}</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{pn.staffMember}</label>
            <select
              required
              value={formData.staff_id}
              onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
              disabled={!!editingRecord}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50 disabled:opacity-50"
            >
              {staffMembers.filter(s => s.is_active).map(staff => (
                <option key={staff.id} value={staff.id}>
                  {staff.first_name} {staff.last_name} ({staff.staff_type?.name})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{pn.month}</label>
              <select
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{pn.year}</label>
              <select
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const y = new Date().getFullYear() - 2 + i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{pn.baseSalaryDH}</label>
            <input
              type="number"
              required
              step="0.01"
              value={formData.base_salary}
              onChange={(e) => setFormData({ ...formData, base_salary: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{pn.bonusesDH}</label>
              <input
                type="number"
                step="0.01"
                value={formData.bonuses}
                onChange={(e) => setFormData({ ...formData, bonuses: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{pn.deductionsDH}</label>
              <input
                type="number"
                step="0.01"
                value={formData.deductions}
                onChange={(e) => setFormData({ ...formData, deductions: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              />
            </div>
          </div>

          <div className="p-3 bg-secondary rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{pn.total}</span>
              <span className="text-lg font-bold text-foreground">{total.toLocaleString()} DH</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{pn.paidDate}</label>
            <input
              type="date"
              value={formData.paid_at ? formData.paid_at.split('T')[0] : ''}
              onChange={(e) => setFormData({ ...formData, paid_at: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
            />
            <p className="text-xs text-muted-foreground mt-1">{pn.leaveEmptyIfNotPaid}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{pn.notes}</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              {pn.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] transition-colors disabled:opacity-50"
            >
              {saving ? pn.saving : editingRecord ? pn.update : pn.addRecord}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Shift Detail Modal Component
function ShiftDetailModal({
  shift,
  onClose,
  onMarkDayOff,
  onRemoveDayOff,
}: {
  shift: ComputedShift;
  onClose: () => void;
  onMarkDayOff: () => void;
  onRemoveDayOff: () => void;
}) {
  const { t } = useTranslation();
  const pn = t.backoffice.personnelPage;
  const [toggling, setToggling] = useState(false);
  // Calculate shift duration
  const startParts = shift.start_time.split(':').map(Number);
  const endParts = shift.end_time.split(':').map(Number);
  const startMinutes = startParts[0] * 60 + startParts[1];
  const endMinutes = endParts[0] * 60 + endParts[1];
  const durationMinutes = endMinutes - startMinutes;
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;
  const durationStr = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;

  // Format date
  const dateObj = new Date(shift.date);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">{pn.shiftDetails}</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Staff Info */}
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: shift.staff_type?.color || '#606338' }}
            >
              {shift.staff_name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg">{shift.staff_name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-xs px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: shift.staff_type?.color || '#606338' }}
                >
                  {shift.staff_type?.name}
                </span>
                {shift.department && (
                  <span className={`text-xs px-2 py-0.5 rounded-full text-white ${
                    shift.department === 'cuisine' ? 'bg-orange-500' : 'bg-purple-500'
                  }`}>
                    {shift.department === 'cuisine' ? pn.cuisine : pn.salle}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Day Off Status */}
          {shift.isOff && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-3">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <p className="font-medium text-red-500">{pn.dayOffLabel}</p>
                <p className="text-sm text-muted-foreground">{pn.dayOffMsg}</p>
              </div>
            </div>
          )}

          {/* Date & Time */}
          <div className="bg-secondary rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{pn.dateLabel}</p>
                <p className="font-medium text-foreground">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{pn.timeLabel}</p>
                <p className="font-medium text-foreground">
                  {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                  <span className="text-muted-foreground ml-2">({durationStr})</span>
                </p>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          {(shift.email || shift.phone) && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">{pn.contact}</h4>
              {shift.phone && (
                <a
                  href={`tel:${shift.phone}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{shift.phone}</span>
                </a>
              )}
              {shift.email && (
                <a
                  href={`mailto:${shift.email}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
                >
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground">{shift.email}</span>
                </a>
              )}
            </div>
          )}

          {/* Transport Info */}
          {(shift.transport_pickup || shift.transport_dropoff) && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bus className="w-5 h-5 text-blue-500" />
                <h4 className="font-medium text-blue-500">{pn.transportRequired}</h4>
              </div>
              <div className="space-y-1 text-sm">
                {shift.transport_pickup && (
                  <div className="flex items-center gap-2 text-foreground">
                    <MapPin className="w-4 h-4 text-green-500" />
                    <span>{pn.pickupAt} <strong>{shift.start_time.slice(0, 5)}</strong></span>
                  </div>
                )}
                {shift.transport_dropoff && (
                  <div className="flex items-center gap-2 text-foreground">
                    <MapPin className="w-4 h-4 text-red-500" />
                    <span>{pn.dropoffAt} <strong>{shift.end_time.slice(0, 5)}</strong></span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border space-y-2">
          {shift.isOff ? (
            <button
              onClick={async () => { setToggling(true); await onRemoveDayOff(); setToggling(false); }}
              disabled={toggling}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              {toggling ? pn.removing : pn.removeDayOff}
            </button>
          ) : (
            <button
              onClick={async () => { setToggling(true); await onMarkDayOff(); setToggling(false); }}
              disabled={toggling}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              {toggling ? pn.marking : pn.markDayOff}
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            {pn.close}
          </button>
        </div>
      </div>
    </div>
  );
}

// Transport Trip Detail Modal Component
function TransportTripModal({
  trip,
  date,
  onClose
}: {
  trip: TransportTripGroup;
  date: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const pn = t.backoffice.personnelPage;
  // Format date
  const dateObj = new Date(date);
  const formattedDate = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const isPickup = trip.type === 'pickup';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isPickup ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              <Bus className={`w-5 h-5 ${isPickup ? 'text-green-500' : 'text-red-500'}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">
                {isPickup ? pn.pickupTrip : pn.dropoffTrip}
              </h2>
              <p className="text-sm text-muted-foreground">{trip.time}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Date & Time */}
          <div className="bg-secondary rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{pn.dateLabel}</p>
                <p className="font-medium text-foreground">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {isPickup ? pn.pickupTime : pn.dropoffTime}
                </p>
                <p className="font-medium text-foreground">{trip.time}</p>
              </div>
            </div>
          </div>

          {/* Trip Type Badge */}
          <div className={`p-3 rounded-lg flex items-center gap-3 ${
            isPickup ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'
          }`}>
            <MapPin className={`w-5 h-5 ${isPickup ? 'text-green-500' : 'text-red-500'}`} />
            <div>
              <p className={`font-medium ${isPickup ? 'text-green-500' : 'text-red-500'}`}>
                {isPickup ? pn.pickupTrip : pn.dropoffTrip}
              </p>
              <p className="text-sm text-muted-foreground">
                {isPickup ? pn.pickupDesc : pn.dropoffDesc}
              </p>
            </div>
          </div>

          {/* Passengers List */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              {pn.passengersLabel} ({trip.passengers.length})
            </h4>
            <div className="space-y-2">
              {trip.passengers.map((passenger) => (
                <div
                  key={passenger.staff_id}
                  className="bg-secondary rounded-lg p-3 flex items-start justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                      style={{ backgroundColor: passenger.staff_type?.color || '#606338' }}
                    >
                      {passenger.staff_name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{passenger.staff_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: passenger.staff_type?.color || '#606338' }}
                        >
                          {passenger.staff_type?.name}
                        </span>
                        {passenger.department && (
                          <span className={`text-xs px-2 py-0.5 rounded-full text-white ${
                            passenger.department === 'cuisine' ? 'bg-orange-500' : 'bg-purple-500'
                          }`}>
                            {passenger.department === 'cuisine' ? pn.cuisine : pn.salle}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Contact icons */}
                  <div className="flex items-center gap-1">
                    {passenger.phone && (
                      <a
                        href={`tel:${passenger.phone}`}
                        className="p-2 hover:bg-card rounded-lg transition-colors"
                        title={passenger.phone}
                      >
                        <Phone className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </a>
                    )}
                    {passenger.email && (
                      <a
                        href={`mailto:${passenger.email}`}
                        className="p-2 hover:bg-card rounded-lg transition-colors"
                        title={passenger.email}
                      >
                        <Mail className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            {pn.close}
          </button>
        </div>
      </div>
    </div>
  );
}
