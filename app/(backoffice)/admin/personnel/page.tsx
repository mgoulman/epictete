'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Calendar, Clock, DollarSign, Plus, Search, Edit2, Trash2, X, Check,
  ChevronLeft, ChevronRight, UserPlus, Briefcase, Minus
} from 'lucide-react';
import { SortHeader, SortDir, sortCompare } from '@/components/backoffice/shared/SortHeader';

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

interface MonthlyScheduleConfig {
  default_shifts: Shift[];
  days_per_month: number;
  working_days: string[];
}

interface ComputedShift {
  staff_id: string;
  staff_name: string;
  staff_type: StaffType;
  start_time: string;
  end_time: string;
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

function normalizeMonthlyConfig(raw: Record<string, unknown>): MonthlyScheduleConfig {
  const days_per_month = (raw.days_per_month as number) || 22;
  // New format
  if (Array.isArray(raw.default_shifts)) {
    return {
      default_shifts: raw.default_shifts as Shift[],
      days_per_month,
      working_days: Array.isArray(raw.working_days) ? raw.working_days as string[] : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    };
  }
  // Old format: {default_start_time, default_end_time, days_per_month}
  return {
    default_shifts: [{
      start_time: (raw.default_start_time as string) || '09:00',
      end_time: (raw.default_end_time as string) || '17:00',
    }],
    days_per_month,
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  };
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
  schedule_type: 'weekly' | 'monthly' | null;
  schedule_config: WeeklyScheduleConfig | MonthlyScheduleConfig | null;
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

type TabType = 'staff' | 'schedule' | 'time-off' | 'salary';

export default function PersonnelPage() {
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'time-off') fetchTimeOff();
    if (activeTab === 'salary') fetchSalary();
  }, [activeTab, fetchTimeOff, fetchSalary]);

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;

    await fetch(`/api/personnel?type=staff&id=${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleDeleteTimeOff = async (id: string) => {
    if (!confirm('Delete this time off request?')) return;

    await fetch(`/api/personnel?type=time-off&id=${id}`, { method: 'DELETE' });
    fetchTimeOff();
  };

  const handleDeleteSalary = async (id: string) => {
    if (!confirm('Delete this salary record?')) return;

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
    const days = [];
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

        if (staff.schedule_type === 'weekly') {
          const config = normalizeWeeklyConfig(staff.schedule_config as unknown as Record<string, unknown>);
          const dayConfig = config[dayName as keyof WeeklyScheduleConfig];
          if (dayConfig?.enabled) {
            for (const shift of dayConfig.shifts) {
              shifts.push({
                staff_id: staff.id,
                staff_name: `${staff.first_name} ${staff.last_name}`,
                staff_type: staff.staff_type,
                start_time: shift.start_time,
                end_time: shift.end_time,
              });
            }
          }
        } else if (staff.schedule_type === 'monthly') {
          const config = normalizeMonthlyConfig(staff.schedule_config as unknown as Record<string, unknown>);
          if (config.working_days.includes(dayName)) {
            for (const shift of config.default_shifts) {
              shifts.push({
                staff_id: staff.id,
                staff_name: `${staff.first_name} ${staff.last_name}`,
                staff_type: staff.staff_type,
                start_time: shift.start_time,
                end_time: shift.end_time,
              });
            }
          }
        }
      }

      result[dateStr] = shifts;
    }

    return result;
  }, [staffMembers, currentWeekStart]);

  const getSchedulesForDay = (date: Date): ComputedShift[] => {
    const dateStr = date.toISOString().split('T')[0];
    return computedSchedules[dateStr] || [];
  };

  const tabs = [
    { id: 'staff' as TabType, label: 'Staff', icon: Users },
    { id: 'schedule' as TabType, label: 'Schedule', icon: Calendar },
    { id: 'time-off' as TabType, label: 'Time Off', icon: Clock },
    { id: 'salary' as TabType, label: 'Salary', icon: DollarSign },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Personnel Management</h1>
        <p className="text-muted-foreground mt-1">Manage staff, schedules, time off and payroll</p>
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
                placeholder="Search staff..."
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
              Add Staff
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
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
                        {staff.schedule_type && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {staff.schedule_type === 'weekly' ? 'Weekly' : 'Monthly'}
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
                          : staff.hourly_rate
                            ? `${staff.hourly_rate} DH/hr`
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
                  No staff members found
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Schedule Tab */}
      {activeTab === 'schedule' && (
        <div>
          <div className="flex justify-between items-center mb-4">
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
            <p className="text-sm text-muted-foreground">Auto-computed from staff configs</p>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {getWeekDays().map((day, idx) => (
              <div key={idx} className="bg-card border border-border rounded-lg overflow-hidden">
                <div className={`p-2 text-center text-sm font-medium border-b border-border ${
                  day.toDateString() === new Date().toDateString() ? 'bg-[#606338] text-white' : 'bg-secondary'
                }`}>
                  {formatDate(day)}
                </div>
                <div className="p-2 min-h-[200px] space-y-2">
                  {getSchedulesForDay(day).map((shift, shiftIdx) => (
                    <div
                      key={`${shift.staff_id}-${shiftIdx}`}
                      className="p-2 rounded-lg text-xs"
                      style={{ backgroundColor: `${shift.staff_type?.color || '#606338'}20` }}
                    >
                      <div className="font-medium text-foreground">
                        {shift.staff_name}
                      </div>
                      <div className="text-muted-foreground">
                        {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                      </div>
                      <div className="mt-1">
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: shift.staff_type?.color || '#606338' }}
                        >
                          {shift.staff_type?.name}
                        </span>
                      </div>
                    </div>
                  ))}
                  {getSchedulesForDay(day).length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-4">No shifts</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time Off Tab */}
      {activeTab === 'time-off' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => { setEditingItem(null); setShowTimeOffModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] transition-colors"
            >
              <Plus className="w-4 h-4" />
              Request Time Off
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
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleUpdateTimeOffStatus(record.id, 'rejected')}
                          className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Reject"
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
                No time off requests
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
              Add Salary Record
            </button>
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left p-3"><SortHeader label="Employee" field="staff.first_name" currentSort={salarySort} currentDir={salarySortDir} onSort={handleSalarySort} align="left" className="text-sm font-medium text-muted-foreground" /></th>
                  <th className="text-left p-3"><SortHeader label="Type" field="staff.staff_type.name" currentSort={salarySort} currentDir={salarySortDir} onSort={handleSalarySort} align="left" className="text-sm font-medium text-muted-foreground" /></th>
                  <th className="text-right p-3"><SortHeader label="Base Salary" field="base_salary" currentSort={salarySort} currentDir={salarySortDir} onSort={handleSalarySort} align="right" className="text-sm font-medium text-muted-foreground" /></th>
                  <th className="text-right p-3"><SortHeader label="Bonuses" field="bonuses" currentSort={salarySort} currentDir={salarySortDir} onSort={handleSalarySort} align="right" className="text-sm font-medium text-muted-foreground" /></th>
                  <th className="text-right p-3"><SortHeader label="Deductions" field="deductions" currentSort={salarySort} currentDir={salarySortDir} onSort={handleSalarySort} align="right" className="text-sm font-medium text-muted-foreground" /></th>
                  <th className="text-right p-3"><SortHeader label="Total" field="total" currentSort={salarySort} currentDir={salarySortDir} onSort={handleSalarySort} align="right" className="text-sm font-medium text-muted-foreground" /></th>
                  <th className="text-center p-3"><SortHeader label="Status" field="paid_at" currentSort={salarySort} currentDir={salarySortDir} onSort={handleSalarySort} align="center" className="text-sm font-medium text-muted-foreground" /></th>
                  <th className="text-right p-3 text-sm font-medium text-muted-foreground">Actions</th>
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
                        {record.paid_at ? 'Paid' : 'Pending'}
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
                      No salary records for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {salaryRecords.length > 0 && (
            <div className="mt-4 p-4 bg-card border border-border rounded-lg flex justify-between items-center">
              <span className="text-muted-foreground">Total Payroll</span>
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
          staffMembers={staffMembers}
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
    </div>
  );
}

// Default schedule configurations
const getDefaultWeeklySchedule = (): WeeklyScheduleConfig => ({
  monday: { enabled: true, shifts: [{ start_time: '09:00', end_time: '17:00' }] },
  tuesday: { enabled: true, shifts: [{ start_time: '09:00', end_time: '17:00' }] },
  wednesday: { enabled: true, shifts: [{ start_time: '09:00', end_time: '17:00' }] },
  thursday: { enabled: true, shifts: [{ start_time: '09:00', end_time: '17:00' }] },
  friday: { enabled: true, shifts: [{ start_time: '09:00', end_time: '17:00' }] },
  saturday: { enabled: false, shifts: [{ start_time: '09:00', end_time: '17:00' }] },
  sunday: { enabled: false, shifts: [{ start_time: '09:00', end_time: '17:00' }] },
});

const getDefaultMonthlySchedule = (): MonthlyScheduleConfig => ({
  default_shifts: [{ start_time: '09:00', end_time: '17:00' }],
  days_per_month: 22,
  working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
});

const dayNames: (keyof WeeklyScheduleConfig)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const dayLabels: Record<keyof WeeklyScheduleConfig, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

interface ProfileOption {
  id: string;
  email: string | null;
  full_name: string | null;
}

// Staff Modal Component
function StaffModal({
  staffTypes,
  editingStaff,
  staffMembers,
  onClose,
  onSave
}: {
  staffTypes: StaffType[];
  editingStaff: StaffMember | null;
  staffMembers: StaffMember[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    first_name: editingStaff?.first_name || '',
    last_name: editingStaff?.last_name || '',
    email: editingStaff?.email || '',
    phone: editingStaff?.phone || '',
    staff_type_id: editingStaff?.staff_type_id || staffTypes[0]?.id || '',
    hire_date: editingStaff?.hire_date || new Date().toISOString().split('T')[0],
    hourly_rate: editingStaff?.hourly_rate || '',
    monthly_salary: editingStaff?.monthly_salary || '',
    is_active: editingStaff?.is_active ?? true,
    notes: editingStaff?.notes || '',
    profile_id: (editingStaff as StaffMember & { profile_id?: string })?.profile_id || ''
  });

  const [availableProfiles, setAvailableProfiles] = useState<ProfileOption[]>([]);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const res = await fetch('/api/salle?type=available-profiles');
        const data = await res.json();
        const profiles: ProfileOption[] = data.profiles || [];
        // Include the currently linked profile if editing
        const currentProfileId = (editingStaff as StaffMember & { profile_id?: string })?.profile_id;
        const linkedProfileIds = staffMembers
          .filter(s => s.id !== editingStaff?.id)
          .map(s => (s as StaffMember & { profile_id?: string }).profile_id)
          .filter(Boolean);
        const filtered = profiles.filter(p =>
          !linkedProfileIds.includes(p.id) || p.id === currentProfileId
        );
        setAvailableProfiles(filtered);
      } catch {
        // Ignore fetch errors
      }
    };
    fetchProfiles();
  }, [editingStaff, staffMembers]);

  const [scheduleType, setScheduleType] = useState<'weekly' | 'monthly' | 'none'>(
    editingStaff?.schedule_type || 'none'
  );
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklyScheduleConfig>(
    editingStaff?.schedule_type === 'weekly'
      ? normalizeWeeklyConfig(editingStaff.schedule_config as unknown as Record<string, unknown>)
      : getDefaultWeeklySchedule()
  );
  const [monthlySchedule, setMonthlySchedule] = useState<MonthlyScheduleConfig>(
    editingStaff?.schedule_type === 'monthly'
      ? normalizeMonthlyConfig(editingStaff.schedule_config as unknown as Record<string, unknown>)
      : getDefaultMonthlySchedule()
  );

  const [saving, setSaving] = useState(false);

  // Weekly helpers
  const updateDayEnabled = (day: keyof WeeklyScheduleConfig, enabled: boolean) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], enabled }
    }));
  };

  const updateShift = (day: keyof WeeklyScheduleConfig, shiftIndex: number, field: keyof Shift, value: string) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        shifts: prev[day].shifts.map((s, i) => i === shiftIndex ? { ...s, [field]: value } : s)
      }
    }));
  };

  const addShift = (day: keyof WeeklyScheduleConfig) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        shifts: [...prev[day].shifts, { start_time: '18:00', end_time: '23:00' }]
      }
    }));
  };

  const removeShift = (day: keyof WeeklyScheduleConfig, shiftIndex: number) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        shifts: prev[day].shifts.filter((_, i) => i !== shiftIndex)
      }
    }));
  };

  // Monthly helpers
  const toggleMonthlyWorkingDay = (day: string) => {
    setMonthlySchedule(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter(d => d !== day)
        : [...prev.working_days, day]
    }));
  };

  const updateMonthlyShift = (shiftIndex: number, field: keyof Shift, value: string) => {
    setMonthlySchedule(prev => ({
      ...prev,
      default_shifts: prev.default_shifts.map((s, i) => i === shiftIndex ? { ...s, [field]: value } : s)
    }));
  };

  const addMonthlyShift = () => {
    setMonthlySchedule(prev => ({
      ...prev,
      default_shifts: [...prev.default_shifts, { start_time: '18:00', end_time: '23:00' }]
    }));
  };

  const removeMonthlyShift = (shiftIndex: number) => {
    setMonthlySchedule(prev => ({
      ...prev,
      default_shifts: prev.default_shifts.filter((_, i) => i !== shiftIndex)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      type: 'staff',
      ...formData,
      hourly_rate: formData.hourly_rate ? Number(formData.hourly_rate) : null,
      monthly_salary: formData.monthly_salary ? Number(formData.monthly_salary) : null,
      profile_id: formData.profile_id || null,
      schedule_type: scheduleType === 'none' ? null : scheduleType,
      schedule_config: scheduleType === 'weekly'
        ? weeklySchedule
        : scheduleType === 'monthly'
          ? monthlySchedule
          : null,
      ...(editingStaff && { id: editingStaff.id })
    };

    await fetch('/api/personnel', {
      method: editingStaff ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">{editingStaff ? 'Edit Staff' : 'Add Staff Member'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name *</label>
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
            <label className="block text-sm font-medium mb-1">Staff Type *</label>
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
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Hire Date *</label>
            <input
              type="date"
              required
              value={formData.hire_date}
              onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hourly Rate (DH)</label>
              <input
                type="number"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Monthly Salary (DH)</label>
              <input
                type="number"
                step="0.01"
                value={formData.monthly_salary}
                onChange={(e) => setFormData({ ...formData, monthly_salary: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
            />
          </div>

          {/* Link to Auth Profile */}
          <div>
            <label className="block text-sm font-medium mb-1">Linked Auth Profile</label>
            <select
              value={formData.profile_id}
              onChange={(e) => setFormData({ ...formData, profile_id: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
            >
              <option value="">No linked profile</option>
              {availableProfiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.email || p.id}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Link to a user account so they can log in as this staff member (required for waiters)
            </p>
          </div>

          {/* Schedule Configuration Section */}
          <div className="border-t border-border pt-4 mt-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Schedule Configuration
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Schedule Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleType('none')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    scheduleType === 'none'
                      ? 'bg-[#606338] text-white'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  No Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType('weekly')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    scheduleType === 'weekly'
                      ? 'bg-[#606338] text-white'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Weekly (Days)
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleType('monthly')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    scheduleType === 'monthly'
                      ? 'bg-[#606338] text-white'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Monthly
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {scheduleType === 'weekly' && 'Configure specific working days and hours for each day of the week'}
                {scheduleType === 'monthly' && 'Set default working hours and working days for the month'}
                {scheduleType === 'none' && 'No default schedule - shifts will be assigned manually'}
              </p>
            </div>

            {/* Weekly Schedule Config — double shifts */}
            {scheduleType === 'weekly' && (
              <div className="space-y-3 bg-secondary/50 p-3 rounded-lg">
                {dayNames.map((day) => (
                  <div key={day} className="space-y-1">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`day-${day}`}
                        checked={weeklySchedule[day].enabled}
                        onChange={(e) => updateDayEnabled(day, e.target.checked)}
                        className="w-4 h-4 rounded border-border text-[#606338] focus:ring-[#606338]"
                      />
                      <label htmlFor={`day-${day}`} className="w-20 text-sm font-medium">
                        {dayLabels[day]}
                      </label>
                      {weeklySchedule[day].enabled && weeklySchedule[day].shifts.length < 2 && (
                        <button
                          type="button"
                          onClick={() => addShift(day)}
                          className="ml-auto text-xs text-[#606338] hover:text-[#4d4f2e] flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add shift
                        </button>
                      )}
                    </div>
                    {weeklySchedule[day].enabled && weeklySchedule[day].shifts.map((shift, sIdx) => (
                      <div key={sIdx} className="flex items-center gap-2 ml-7">
                        <span className="text-xs text-muted-foreground w-8">#{sIdx + 1}</span>
                        <input
                          type="time"
                          value={shift.start_time}
                          onChange={(e) => updateShift(day, sIdx, 'start_time', e.target.value)}
                          className="px-2 py-1 bg-card border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#606338]/50"
                        />
                        <span className="text-muted-foreground text-sm">to</span>
                        <input
                          type="time"
                          value={shift.end_time}
                          onChange={(e) => updateShift(day, sIdx, 'end_time', e.target.value)}
                          className="px-2 py-1 bg-card border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#606338]/50"
                        />
                        {sIdx > 0 && (
                          <button
                            type="button"
                            onClick={() => removeShift(day, sIdx)}
                            className="p-1 text-red-400 hover:text-red-500"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Monthly Schedule Config — working days + double shifts */}
            {scheduleType === 'monthly' && (
              <div className="space-y-4 bg-secondary/50 p-3 rounded-lg">
                {/* Working days checkboxes */}
                <div>
                  <label className="block text-xs font-medium mb-2">Working Days</label>
                  <div className="flex flex-wrap gap-2">
                    {dayNames.map((day) => (
                      <label
                        key={day}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                          monthlySchedule.working_days.includes(day)
                            ? 'bg-[#606338] text-white'
                            : 'bg-card text-muted-foreground border border-border hover:text-foreground'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={monthlySchedule.working_days.includes(day)}
                          onChange={() => toggleMonthlyWorkingDay(day)}
                          className="sr-only"
                        />
                        {dayLabels[day].slice(0, 3)}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Default shifts */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium">Default Shifts</label>
                    {monthlySchedule.default_shifts.length < 2 && (
                      <button
                        type="button"
                        onClick={addMonthlyShift}
                        className="text-xs text-[#606338] hover:text-[#4d4f2e] flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add shift
                      </button>
                    )}
                  </div>
                  {monthlySchedule.default_shifts.map((shift, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-muted-foreground w-8">#{sIdx + 1}</span>
                      <input
                        type="time"
                        value={shift.start_time}
                        onChange={(e) => updateMonthlyShift(sIdx, 'start_time', e.target.value)}
                        className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
                      />
                      <span className="text-muted-foreground text-sm">to</span>
                      <input
                        type="time"
                        value={shift.end_time}
                        onChange={(e) => updateMonthlyShift(sIdx, 'end_time', e.target.value)}
                        className="flex-1 px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
                      />
                      {sIdx > 0 && (
                        <button
                          type="button"
                          onClick={() => removeMonthlyShift(sIdx)}
                          className="p-1 text-red-400 hover:text-red-500"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Working Days per Month</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={monthlySchedule.days_per_month}
                    onChange={(e) => setMonthlySchedule(prev => ({ ...prev, days_per_month: parseInt(e.target.value) || 22 }))}
                    className="w-full px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Total expected working days in a month (used for salary calculations)
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-border text-[#606338] focus:ring-[#606338]"
            />
            <label htmlFor="is_active" className="text-sm">Active employee</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingStaff ? 'Update' : 'Add Staff'}
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
          <h2 className="text-lg font-semibold">Request Time Off</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Staff Member *</label>
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
              <label className="block text-sm font-medium mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date *</label>
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
            <label className="block text-sm font-medium mb-1">Type *</label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
            >
              <option value="vacation">Vacation</option>
              <option value="sick">Sick Leave</option>
              <option value="personal">Personal</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <textarea
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              placeholder="Optional reason for the time off request..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Submit Request'}
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
          <h2 className="text-lg font-semibold">{editingRecord ? 'Edit Salary Record' : 'Add Salary Record'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Staff Member *</label>
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
              <label className="block text-sm font-medium mb-1">Month</label>
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
              <label className="block text-sm font-medium mb-1">Year</label>
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
            <label className="block text-sm font-medium mb-1">Base Salary (DH) *</label>
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
              <label className="block text-sm font-medium mb-1">Bonuses (DH)</label>
              <input
                type="number"
                step="0.01"
                value={formData.bonuses}
                onChange={(e) => setFormData({ ...formData, bonuses: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Deductions (DH)</label>
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
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-bold text-foreground">{total.toLocaleString()} DH</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Paid Date</label>
            <input
              type="date"
              value={formData.paid_at ? formData.paid_at.split('T')[0] : ''}
              onChange={(e) => setFormData({ ...formData, paid_at: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
            />
            <p className="text-xs text-muted-foreground mt-1">Leave empty if not yet paid</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingRecord ? 'Update' : 'Add Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
