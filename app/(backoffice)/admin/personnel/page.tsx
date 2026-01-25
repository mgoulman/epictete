'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users, Calendar, Clock, DollarSign, Plus, Search, Edit2, Trash2, X, Check,
  ChevronLeft, ChevronRight, UserPlus, CalendarDays, Briefcase
} from 'lucide-react';

interface StaffType {
  id: string;
  name: string;
  description: string | null;
  color: string;
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
}

interface Schedule {
  id: string;
  staff_id: string;
  staff: {
    id: string;
    first_name: string;
    last_name: string;
    staff_type: StaffType;
  };
  date: string;
  start_time: string;
  end_time: string;
  shift_type: string;
  notes: string | null;
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
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [timeOffRecords, setTimeOffRecords] = useState<TimeOff[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showTimeOffModal, setShowTimeOffModal] = useState(false);
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StaffMember | Schedule | TimeOff | SalaryRecord | null>(null);

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

  const fetchSchedules = useCallback(async () => {
    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 6);

    const res = await fetch(
      `/api/personnel?type=schedules&startDate=${currentWeekStart.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`
    );
    const data = await res.json();
    setSchedules(data.schedules || []);
  }, [currentWeekStart]);

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
    if (activeTab === 'schedule') fetchSchedules();
    if (activeTab === 'time-off') fetchTimeOff();
    if (activeTab === 'salary') fetchSalary();
  }, [activeTab, fetchSchedules, fetchTimeOff, fetchSalary]);

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;

    await fetch(`/api/personnel?type=staff&id=${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Delete this schedule entry?')) return;

    await fetch(`/api/personnel?type=schedule&id=${id}`, { method: 'DELETE' });
    fetchSchedules();
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

  const getSchedulesForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return schedules.filter(s => s.date === dateStr);
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
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: staff.staff_type?.color || '#606338' }}
                        >
                          {staff.staff_type?.name}
                        </span>
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
            <button
              onClick={() => { setEditingItem(null); setShowScheduleModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] transition-colors"
            >
              <CalendarDays className="w-4 h-4" />
              Add Shift
            </button>
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
                  {getSchedulesForDay(day).map(schedule => (
                    <div
                      key={schedule.id}
                      className="p-2 rounded-lg text-xs"
                      style={{ backgroundColor: `${schedule.staff?.staff_type?.color || '#606338'}20` }}
                    >
                      <div className="font-medium text-foreground">
                        {schedule.staff?.first_name} {schedule.staff?.last_name}
                      </div>
                      <div className="text-muted-foreground">
                        {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: schedule.staff?.staff_type?.color || '#606338' }}
                        >
                          {schedule.shift_type}
                        </span>
                        <button
                          onClick={() => handleDeleteSchedule(schedule.id)}
                          className="text-red-400 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
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
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Employee</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Type</th>
                  <th className="text-right p-3 text-sm font-medium text-muted-foreground">Base Salary</th>
                  <th className="text-right p-3 text-sm font-medium text-muted-foreground">Bonuses</th>
                  <th className="text-right p-3 text-sm font-medium text-muted-foreground">Deductions</th>
                  <th className="text-right p-3 text-sm font-medium text-muted-foreground">Total</th>
                  <th className="text-center p-3 text-sm font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 text-sm font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {salaryRecords.map(record => (
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
          onClose={() => { setShowStaffModal(false); setEditingItem(null); }}
          onSave={() => { setShowStaffModal(false); setEditingItem(null); fetchData(); }}
        />
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <ScheduleModal
          staffMembers={staffMembers}
          onClose={() => { setShowScheduleModal(false); setEditingItem(null); }}
          onSave={() => { setShowScheduleModal(false); setEditingItem(null); fetchSchedules(); }}
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
    notes: editingStaff?.notes || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      type: 'staff',
      ...formData,
      hourly_rate: formData.hourly_rate ? Number(formData.hourly_rate) : null,
      monthly_salary: formData.monthly_salary ? Number(formData.monthly_salary) : null,
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

// Schedule Modal Component
function ScheduleModal({
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
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '17:00',
    shift_type: 'regular',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    await fetch('/api/personnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'schedule', ...formData })
    });

    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add Shift</h2>
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
                  {staff.first_name} {staff.last_name} ({staff.staff_type?.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date *</label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Time *</label>
              <input
                type="time"
                required
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Time *</label>
              <input
                type="time"
                required
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Shift Type</label>
            <select
              value={formData.shift_type}
              onChange={(e) => setFormData({ ...formData, shift_type: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
            >
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
              <option value="night">Night</option>
              <option value="regular">Regular</option>
            </select>
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
              {saving ? 'Saving...' : 'Add Shift'}
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
