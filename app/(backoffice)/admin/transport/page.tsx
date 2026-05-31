'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bus, Users, Car, Settings, Calendar, Plus, Edit2, Trash2, X, Check,
  ChevronLeft, ChevronRight, Search, RefreshCw, UserCheck, Clock
} from 'lucide-react';
import {
  Driver, Vehicle, TransportTrip, StaffWithTransport,
  TripType, Department, TRIP_TYPE_CONFIG, DEPARTMENT_CONFIG
} from '@/lib/types/transport';
import { useTranslation } from '@/lib/i18n/useTranslation';
import DraggableScheduleGrid from '@/components/backoffice/transport/DraggableScheduleGrid';

// Types for schedule computation
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

interface TimeOff {
  id: string;
  staff_id: string;
  start_date: string;
  end_date: string;
}

interface ComputedShift {
  staff_id: string;
  staff_name: string;
  department: Department | null;
  staff_type?: { id: string; name: string; color: string };
  start_time: string;
  end_time: string;
}

// Normalize functions
function normalizeWeeklyConfig(raw: Record<string, unknown>): WeeklyScheduleConfig {
  const days: (keyof WeeklyScheduleConfig)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const result = {} as WeeklyScheduleConfig;
  for (const day of days) {
    const d = raw[day] as Record<string, unknown> | undefined;
    if (!d) {
      result[day] = { enabled: false, shifts: [{ start_time: '09:00', end_time: '17:00' }] };
      continue;
    }
    if (Array.isArray(d.shifts)) {
      result[day] = { enabled: !!d.enabled, shifts: d.shifts as Shift[] };
    } else {
      result[day] = {
        enabled: !!d.enabled,
        shifts: [{ start_time: (d.start_time as string) || '09:00', end_time: (d.end_time as string) || '17:00' }]
      };
    }
  }
  return result;
}

function normalizeMonthlyConfig(raw: Record<string, unknown>): MonthlyScheduleConfig {
  const days_per_month = (raw.days_per_month as number) || 22;
  if (Array.isArray(raw.default_shifts)) {
    return {
      default_shifts: raw.default_shifts as Shift[],
      days_per_month,
      working_days: Array.isArray(raw.working_days) ? raw.working_days as string[] : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    };
  }
  return {
    default_shifts: [{
      start_time: (raw.default_start_time as string) || '09:00',
      end_time: (raw.default_end_time as string) || '17:00',
    }],
    days_per_month,
    working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  };
}

type TabType = 'cuisine' | 'salle' | 'resources' | 'settings' | 'schedule';

export default function TransportPage() {
  const { t } = useTranslation();
  const tp = t.backoffice.transportPage;
  const [activeTab, setActiveTab] = useState<TabType>('cuisine');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [trips, setTrips] = useState<TransportTrip[]>([]);
  const [staff, setStaff] = useState<StaffWithTransport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  // Week navigation
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });

  // Trip filter
  const [tripTypeFilter, setTripTypeFilter] = useState<'all' | TripType>('all');

  // Generating state
  const [generating, setGenerating] = useState(false);

  // Approved time-off for filtering
  const [approvedTimeOff, setApprovedTimeOff] = useState<TimeOff[]>([]);

  const fetchDriversAndVehicles = useCallback(async () => {
    try {
      const [driversRes, vehiclesRes] = await Promise.all([
        fetch('/api/transport?type=drivers'),
        fetch('/api/transport?type=vehicles')
      ]);

      const driversData = await driversRes.json();
      const vehiclesData = await vehiclesRes.json();

      setDrivers(driversData.drivers || []);
      setVehicles(vehiclesData.vehicles || []);
    } catch (error) {
      console.error('Error fetching drivers/vehicles:', error);
    }
  }, []);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch('/api/transport?type=staff-transport');
      const data = await res.json();
      setStaff(data.staff || []);
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  }, []);

  const fetchTrips = useCallback(async () => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const startStr = currentWeekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];

    try {
      const res = await fetch(`/api/transport?type=trips&start=${startStr}&end=${endStr}`);
      const data = await res.json();
      setTrips(data.trips || []);
    } catch (error) {
      console.error('Error fetching trips:', error);
    }
  }, [currentWeekStart]);

  const fetchApprovedTimeOff = useCallback(async () => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const startStr = currentWeekStart.toISOString().split('T')[0];
    const endStr = weekEnd.toISOString().split('T')[0];
    try {
      const res = await fetch(`/api/personnel?type=time-off&status=approved&startDate=${startStr}&endDate=${endStr}`);
      const data = await res.json();
      setApprovedTimeOff(data.timeOff || []);
    } catch (error) {
      console.error('Error fetching time-off:', error);
    }
  }, [currentWeekStart]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchDriversAndVehicles(), fetchStaff(), fetchApprovedTimeOff()]);
      setLoading(false);
    };
    loadData();
  }, [fetchDriversAndVehicles, fetchStaff, fetchApprovedTimeOff]);

  useEffect(() => {
    if (activeTab === 'schedule') {
      fetchTrips();
    }
  }, [activeTab, fetchTrips]);

  // Week navigation
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

  // Computed schedules for Cuisine/Salle tabs (filters out staff on approved time-off)
  const computedSchedules = useMemo(() => {
    const weekDays = getWeekDays();
    const dayMap: Record<number, string> = { 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday', 0: 'sunday' };
    const result: Record<string, ComputedShift[]> = {};

    for (const day of weekDays) {
      const dateStr = day.toISOString().split('T')[0];
      const shifts: ComputedShift[] = [];
      const jsDay = day.getDay();
      const dayName = dayMap[jsDay];

      for (const s of staff) {
        if (!s.is_active || !s.schedule_type || !s.schedule_config) continue;

        // Skip staff on approved day off
        const isOff = approvedTimeOff.some(t =>
          t.staff_id === s.id && t.start_date <= dateStr && t.end_date >= dateStr
        );
        if (isOff) continue;

        let staffShifts: Shift[] = [];

        if (s.schedule_type === 'weekly') {
          const config = normalizeWeeklyConfig(s.schedule_config as unknown as Record<string, unknown>);
          const dayConfig = config[dayName as keyof WeeklyScheduleConfig];
          if (dayConfig?.enabled) {
            staffShifts = dayConfig.shifts;
          }
        } else if (s.schedule_type === 'monthly') {
          const config = normalizeMonthlyConfig(s.schedule_config as unknown as Record<string, unknown>);
          if (config.working_days.includes(dayName)) {
            staffShifts = config.default_shifts;
          }
        }

        for (const shift of staffShifts) {
          shifts.push({
            staff_id: s.id,
            staff_name: `${s.first_name} ${s.last_name}`,
            department: s.department,
            staff_type: s.staff_type,
            start_time: shift.start_time,
            end_time: shift.end_time,
          });
        }
      }

      result[dateStr] = shifts;
    }

    return result;
  }, [staff, currentWeekStart, approvedTimeOff]);

  const getSchedulesForDay = (date: Date, department: Department): ComputedShift[] => {
    const dateStr = date.toISOString().split('T')[0];
    const allShifts = computedSchedules[dateStr] || [];
    return allShifts.filter(s => s.department === department);
  };

  // Generate trips
  const handleGenerateTrips = async () => {
    setGenerating(true);
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    try {
      const res = await fetch('/api/transport/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: currentWeekStart.toISOString().split('T')[0],
          endDate: weekEnd.toISOString().split('T')[0]
        })
      });

      const data = await res.json();
      if (data.success) {
        fetchTrips();
      }
    } catch (error) {
      console.error('Error generating trips:', error);
    } finally {
      setGenerating(false);
    }
  };

  // Delete handlers
  const handleDeleteDriver = async (id: string) => {
    if (!confirm(tp.deleteDriver)) return;
    await fetch(`/api/transport?type=driver&id=${id}`, { method: 'DELETE' });
    fetchDriversAndVehicles();
  };

  const handleDeleteVehicle = async (id: string) => {
    if (!confirm(tp.deleteVehicle)) return;
    await fetch(`/api/transport?type=vehicle&id=${id}`, { method: 'DELETE' });
    fetchDriversAndVehicles();
  };

  // Update staff transport settings
  const handleToggleTransport = async (staffId: string, field: 'transport_pickup' | 'transport_dropoff', value: boolean) => {
    const s = staff.find(st => st.id === staffId);
    if (!s) return;

    await fetch('/api/transport', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'staff-transport',
        id: staffId,
        transport_pickup: field === 'transport_pickup' ? value : s.transport_pickup,
        transport_dropoff: field === 'transport_dropoff' ? value : s.transport_dropoff,
        department: s.department
      })
    });
    fetchStaff();
  };

  const handleUpdateDepartment = async (staffId: string, department: Department | null) => {
    const s = staff.find(st => st.id === staffId);
    if (!s) return;

    await fetch('/api/transport', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'staff-transport',
        id: staffId,
        transport_pickup: s.transport_pickup,
        transport_dropoff: s.transport_dropoff,
        department
      })
    });
    fetchStaff();
  };

  // Update trip driver/vehicle
  const handleUpdateTrip = async (tripId: string, driverId: string | null, vehicleId: string | null) => {
    await fetch('/api/transport', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'trip',
        id: tripId,
        driver_id: driverId || null,
        vehicle_id: vehicleId || null
      })
    });
    fetchTrips();
  };

  // Update trip date/time via drag
  const handleDragUpdateTrip = async (tripId: string, date: string, scheduledTime: string) => {
    await fetch('/api/transport', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'trip',
        id: tripId,
        date,
        scheduled_time: scheduledTime
      })
    });
    fetchTrips();
  };

  // Filtered staff for settings
  const filteredStaff = staff.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabs = [
    { id: 'cuisine' as TabType, label: tp.tabs.cuisine, icon: Users },
    { id: 'salle' as TabType, label: tp.tabs.salle, icon: Users },
    { id: 'resources' as TabType, label: tp.tabs.resources, icon: Car },
    { id: 'settings' as TabType, label: tp.tabs.settings, icon: Settings },
    { id: 'schedule' as TabType, label: tp.tabs.schedule, icon: Calendar },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Bus className="w-6 h-6" />
          {tp.title}
        </h1>
        <p className="text-muted-foreground mt-1">{tp.subtitle}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors whitespace-nowrap ${
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

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{tp.loading}</div>
      ) : (
        <>
          {/* Cuisine Planning Tab */}
          {activeTab === 'cuisine' && (
            <PlanningTab
              department="cuisine"
              currentWeekStart={currentWeekStart}
              getWeekDays={getWeekDays}
              navigateWeek={navigateWeek}
              formatDate={formatDate}
              getSchedulesForDay={getSchedulesForDay}
            />
          )}

          {/* Salle Planning Tab */}
          {activeTab === 'salle' && (
            <PlanningTab
              department="salle"
              currentWeekStart={currentWeekStart}
              getWeekDays={getWeekDays}
              navigateWeek={navigateWeek}
              formatDate={formatDate}
              getSchedulesForDay={getSchedulesForDay}
            />
          )}

          {/* Drivers & Vehicles Tab */}
          {activeTab === 'resources' && (
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Drivers Section */}
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <UserCheck className="w-5 h-5" />
                    {tp.drivers}
                  </h2>
                  <button
                    onClick={() => { setEditingDriver(null); setShowDriverModal(true); }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    {tp.addDriver}
                  </button>
                </div>

                <div className="space-y-2">
                  {drivers.map(driver => (
                    <div key={driver.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                      <div>
                        <div className="font-medium text-foreground">
                          {driver.first_name} {driver.last_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {driver.phone && <span className="mr-3">{driver.phone}</span>}
                          {driver.license_number && <span>{tp.license}: {driver.license_number}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          driver.is_active ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'
                        }`}>
                          {driver.is_active ? tp.active : tp.inactive}
                        </span>
                        <button
                          onClick={() => { setEditingDriver(driver); setShowDriverModal(true); }}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-card rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteDriver(driver.id)}
                          className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {drivers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {tp.noDrivers}
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicles Section */}
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Car className="w-5 h-5" />
                    {tp.vehicles}
                  </h2>
                  <button
                    onClick={() => { setEditingVehicle(null); setShowVehicleModal(true); }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    {tp.addVehicle}
                  </button>
                </div>

                <div className="space-y-2">
                  {vehicles.map(vehicle => (
                    <div key={vehicle.id} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                      <div>
                        <div className="font-medium text-foreground">{vehicle.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {tp.plate}: {vehicle.plate_number} | {tp.capacity}: {vehicle.capacity}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          vehicle.is_active ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'
                        }`}>
                          {vehicle.is_active ? tp.active : tp.inactive}
                        </span>
                        <button
                          onClick={() => { setEditingVehicle(vehicle); setShowVehicleModal(true); }}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-card rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteVehicle(vehicle.id)}
                          className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {vehicles.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      {tp.noVehicles}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Transport Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={tp.searchStaff}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {tp.configureTransport}
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">{tp.name}</th>
                      <th className="text-left p-3 text-sm font-medium text-muted-foreground">{tp.departmentLabel}</th>
                      <th className="text-center p-3 text-sm font-medium text-muted-foreground">{tp.pickupLabel}</th>
                      <th className="text-center p-3 text-sm font-medium text-muted-foreground">{tp.dropoffLabel}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map(s => (
                      <tr key={s.id} className="border-t border-border">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
                              style={{ backgroundColor: s.staff_type?.color || '#606338' }}
                            >
                              {s.first_name[0]}{s.last_name[0]}
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{s.first_name} {s.last_name}</div>
                              <div className="text-xs text-muted-foreground">{s.staff_type?.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <select
                            value={s.department || ''}
                            onChange={(e) => handleUpdateDepartment(s.id, e.target.value as Department || null)}
                            className="px-2 py-1 bg-secondary border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#606338]/50"
                          >
                            <option value="">{tp.notSet}</option>
                            <option value="cuisine">{tp.cuisineDept}</option>
                            <option value="salle">{tp.salleDept}</option>
                          </select>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleTransport(s.id, 'transport_pickup', !s.transport_pickup)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                              s.transport_pickup
                                ? 'bg-green-500 text-white'
                                : 'bg-secondary text-muted-foreground hover:bg-card'
                            }`}
                          >
                            {s.transport_pickup ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleToggleTransport(s.id, 'transport_dropoff', !s.transport_dropoff)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                              s.transport_dropoff
                                ? 'bg-green-500 text-white'
                                : 'bg-secondary text-muted-foreground hover:bg-card'
                            }`}
                          >
                            {s.transport_dropoff ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredStaff.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                          {tp.noStaffFound}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Generated Schedule Tab */}
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
                <div className="flex items-center gap-3">
                  <select
                    value={tripTypeFilter}
                    onChange={(e) => setTripTypeFilter(e.target.value as 'all' | TripType)}
                    className="px-3 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
                  >
                    <option value="all">{tp.allTrips}</option>
                    <option value="pickup">{tp.pickupOnly}</option>
                    <option value="dropoff">{tp.dropoffOnly}</option>
                  </select>
                  <button
                    onClick={handleGenerateTrips}
                    disabled={generating}
                    className="flex items-center gap-2 px-4 py-2 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
                    {generating ? tp.generating : tp.generateTrips}
                  </button>
                </div>
              </div>

              <DraggableScheduleGrid
                weekDays={getWeekDays()}
                trips={trips}
                drivers={drivers}
                vehicles={vehicles}
                tripTypeFilter={tripTypeFilter}
                formatDate={formatDate}
                onUpdateTrip={handleUpdateTrip}
                onDragUpdateTrip={handleDragUpdateTrip}
              />
            </div>
          )}
        </>
      )}

      {/* Driver Modal */}
      {showDriverModal && (
        <DriverModal
          editingDriver={editingDriver}
          onClose={() => { setShowDriverModal(false); setEditingDriver(null); }}
          onSave={() => { setShowDriverModal(false); setEditingDriver(null); fetchDriversAndVehicles(); }}
        />
      )}

      {/* Vehicle Modal */}
      {showVehicleModal && (
        <VehicleModal
          editingVehicle={editingVehicle}
          onClose={() => { setShowVehicleModal(false); setEditingVehicle(null); }}
          onSave={() => { setShowVehicleModal(false); setEditingVehicle(null); fetchDriversAndVehicles(); }}
        />
      )}
    </div>
  );
}

// Planning Tab Component
function PlanningTab({
  department,
  currentWeekStart,
  getWeekDays,
  navigateWeek,
  formatDate,
  getSchedulesForDay
}: {
  department: Department;
  currentWeekStart: Date;
  getWeekDays: () => Date[];
  navigateWeek: (dir: number) => void;
  formatDate: (date: Date) => string;
  getSchedulesForDay: (date: Date, dept: Department) => ComputedShift[];
}) {
  const { t } = useTranslation();
  const tp = t.backoffice.transportPage;
  const config = DEPARTMENT_CONFIG[department];

  return (
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
        <div className="flex items-center gap-2">
          <span
            className="text-sm px-3 py-1 rounded-full"
            style={{ backgroundColor: config.bg, color: config.color }}
          >
            {config.labelFr}
          </span>
        </div>
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
              {getSchedulesForDay(day, department).map((shift, shiftIdx) => (
                <div
                  key={`${shift.staff_id}-${shiftIdx}`}
                  className="p-2 rounded-lg text-xs"
                  style={{ backgroundColor: `${shift.staff_type?.color || '#606338'}20` }}
                >
                  <div className="font-medium text-foreground">{shift.staff_name}</div>
                  <div className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                  </div>
                </div>
              ))}
              {getSchedulesForDay(day, department).length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-4">{tp.noShifts}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Driver Modal Component
function DriverModal({
  editingDriver,
  onClose,
  onSave
}: {
  editingDriver: Driver | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const tp = t.backoffice.transportPage;
  const [formData, setFormData] = useState({
    first_name: editingDriver?.first_name || '',
    last_name: editingDriver?.last_name || '',
    phone: editingDriver?.phone || '',
    license_number: editingDriver?.license_number || '',
    is_active: editingDriver?.is_active ?? true
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      type: 'driver',
      ...formData,
      ...(editingDriver && { id: editingDriver.id })
    };

    await fetch('/api/transport', {
      method: editingDriver ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">{editingDriver ? tp.editDriver : tp.addDriver}</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{tp.firstNameRequired}</label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{tp.lastNameRequired}</label>
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
            <label className="block text-sm font-medium mb-1">{tp.phone}</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{tp.licenseNumber}</label>
            <input
              type="text"
              value={formData.license_number}
              onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="driver_is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-border text-[#606338] focus:ring-[#606338]"
            />
            <label htmlFor="driver_is_active" className="text-sm">{tp.activeDriver}</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              {tp.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] transition-colors disabled:opacity-50"
            >
              {saving ? tp.saving : editingDriver ? tp.update : tp.addDriver}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Vehicle Modal Component
function VehicleModal({
  editingVehicle,
  onClose,
  onSave
}: {
  editingVehicle: Vehicle | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const tp = t.backoffice.transportPage;
  const [formData, setFormData] = useState({
    name: editingVehicle?.name || '',
    plate_number: editingVehicle?.plate_number || '',
    capacity: editingVehicle?.capacity || 4,
    is_active: editingVehicle?.is_active ?? true
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      type: 'vehicle',
      ...formData,
      ...(editingVehicle && { id: editingVehicle.id })
    };

    await fetch('/api/transport', {
      method: editingVehicle ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    setSaving(false);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-md">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-lg font-semibold">{editingVehicle ? tp.editVehicle : tp.addVehicle}</h2>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{tp.vehicleName}</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={tp.vehicleNamePlaceholder}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{tp.plateNumber}</label>
            <input
              type="text"
              required
              value={formData.plate_number}
              onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{tp.passengerCapacity}</label>
            <input
              type="number"
              required
              min="1"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 4 })}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#606338]/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="vehicle_is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-border text-[#606338] focus:ring-[#606338]"
            />
            <label htmlFor="vehicle_is_active" className="text-sm">{tp.activeVehicle}</label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              {tp.cancel}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-[#606338] text-white rounded-lg hover:bg-[#4d4f2e] transition-colors disabled:opacity-50"
            >
              {saving ? tp.saving : editingVehicle ? tp.update : tp.addVehicle}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
