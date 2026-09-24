import React, { useState, useEffect } from 'react';
import { providerApi } from '../../lib/api/providerApi';
import { ServiceProviderResponseDto, ProviderAvailabilityResponseDto, AvailabilityStatus } from '../../types/provider';
import { LoadingState, ErrorState } from '../../components/common/FeedbackStates';
import {
  ChevronLeft,
  ChevronRight,
  PlusCircle,
  Briefcase,
  Loader2,
  X,
} from 'lucide-react';

export const ProviderAvailabilityPage: React.FC = () => {

  const [providers, setProviders] = useState<ServiceProviderResponseDto[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [availabilities, setAvailabilities] = useState<ProviderAvailabilityResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calendar month state (defaults to September 2026 matching wireframe reference)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(8); // 0-indexed: 8 = September
  const [selectedDay, setSelectedDay] = useState<number | null>(9);

  // Modal for adding availability slot
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [slotDate, setSlotDate] = useState('2026-09-09');
  const [slotStartTime, setSlotStartTime] = useState('08:00');
  const [slotEndTime, setSlotEndTime] = useState('17:00');
  const [slotStatus, setSlotStatus] = useState<AvailabilityStatus>('Available');
  const [slotNotes, setSlotNotes] = useState('');
  const [slotLoading, setSlotLoading] = useState(false);

  // 1. Fetch Providers list
  useEffect(() => {
    const loadProviders = async () => {
      try {
        setLoading(true);
        const res = await providerApi.getProviders({ pageSize: 50 });
        if (res.data && res.data.items.length > 0) {
          setProviders(res.data.items);
          setSelectedProviderId(res.data.items[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load providers:', err);
        setError('Failed to load providers list.');
      } finally {
        setLoading(false);
      }
    };

    loadProviders();
  }, []);

  // 2. Fetch availability for selected provider
  const fetchAvailability = async () => {
    if (!selectedProviderId) return;
    try {
      const res = await providerApi.getAvailability(selectedProviderId);
      if (res.data) {
        setAvailabilities(res.data);
      }
    } catch (err) {
      console.warn('Availability fetch note:', err);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [selectedProviderId]);

  // Calendar calculations
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDay(null);
  };

  // Helper to get status for a particular day
  const getDayStatus = (day: number): AvailabilityStatus | null => {
    const slot = availabilities.find((a) => {
      const d = new Date(a.availableDateUtc);
      return d.getUTCDate() === day && d.getUTCMonth() === currentMonth && d.getUTCFullYear() === currentYear;
    });

    if (slot) return slot.status;

    // Default wireframe demonstration pattern for September 2026
    if (currentYear === 2026 && currentMonth === 8) {
      if ([2, 5, 9, 18, 22].includes(day)) return 'Available';
      if ([12, 15].includes(day)) return 'Busy';
      if ([14, 28].includes(day)) return 'Unavailable';
    }
    return null;
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProviderId) return;
    try {
      setSlotLoading(true);
      await providerApi.addAvailability(selectedProviderId, {
        availableDateUtc: new Date(slotDate).toISOString(),
        startTime: slotStartTime,
        endTime: slotEndTime,
        status: slotStatus,
        notes: slotNotes || undefined,
      });
      setIsSlotModalOpen(false);
      await fetchAvailability();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to save availability slot.');
    } finally {
      setSlotLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading availability scheduler..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-6">
      {/* Header matching Screen 8 wireframe */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Availability Calendar</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time contractor working slots and maintenance dispatch schedules
          </p>
        </div>

        <button
          onClick={() => {
            setSlotDate(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay || 9).padStart(2, '0')}`);
            setIsSlotModalOpen(true);
          }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md shadow-blue-500/20 transition self-start sm:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          Set Availability Slot
        </button>
      </div>

      {/* Main Container matching Screen 8 wireframe */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-6 max-w-4xl mx-auto">
        {/* Provider Selector Dropdown matching Screen 8 wireframe */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-blue-600" />
            Service Provider
          </label>
          <select
            value={selectedProviderId}
            onChange={(e) => setSelectedProviderId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 transition"
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.businessName} ({p.city} • {p.skills?.[0]?.skillName || 'Contractor'})
              </option>
            ))}
          </select>
        </div>

        {/* Month Navigation matching Screen 8 wireframe: < September 2026 > */}
        <div className="flex items-center justify-between border-y border-slate-100 py-3">
          <button
            onClick={prevMonth}
            className="h-8 w-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-bold text-slate-900">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <button
            onClick={nextMonth}
            className="h-8 w-8 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Calendar Grid matching Screen 8 wireframe */}
        <div>
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-2 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Blank offset days */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`blank-${idx}`} className="h-14 sm:h-16 rounded-xl bg-slate-50/50" />
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const status = getDayStatus(day);
              const isSelected = selectedDay === day;

              return (
                <div
                  key={`day-${day}`}
                  onClick={() => setSelectedDay(day)}
                  className={`h-14 sm:h-16 rounded-xl border p-2 flex flex-col justify-between transition cursor-pointer relative ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <span className="text-xs font-bold text-slate-700">{day}</span>

                  <div className="flex items-center justify-end">
                    {status === 'Available' && (
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" title="Available" />
                    )}
                    {status === 'Busy' && (
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200" title="Busy" />
                    )}
                    {status === 'Unavailable' && (
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-400 ring-2 ring-slate-200" title="Unavailable" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Details & Legend matching Screen 8 wireframe */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              Available
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-rose-500" />
              Busy
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-slate-400" />
              Unavailable
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-blue-600" />
              Selected
            </span>
          </div>

          {selectedDay && (
            <div className="text-xs font-bold text-slate-700 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              Selected Date: {selectedDay} {monthNames[currentMonth]} {currentYear} (
              {getDayStatus(selectedDay) || 'Not Configured'})
            </div>
          )}
        </div>
      </div>

      {/* Add Slot Modal */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Set Availability Slot</h3>
              <button
                onClick={() => setIsSlotModalOpen(false)}
                className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddSlot} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Date</label>
                <input
                  type="date"
                  required
                  value={slotDate}
                  onChange={(e) => setSlotDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Start Time</label>
                  <input
                    type="time"
                    value={slotStartTime}
                    onChange={(e) => setSlotStartTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">End Time</label>
                  <input
                    type="time"
                    value={slotEndTime}
                    onChange={(e) => setSlotEndTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Status</label>
                <select
                  value={slotStatus}
                  onChange={(e) => setSlotStatus(e.target.value as AvailabilityStatus)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                >
                  <option value="Available">Available</option>
                  <option value="Busy">Busy</option>
                  <option value="Unavailable">Unavailable</option>
                  <option value="OnLeave">On Leave</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Notes / Task</label>
                <input
                  type="text"
                  placeholder="e.g. Scheduled for plumbing inspection"
                  value={slotNotes}
                  onChange={(e) => setSlotNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-3.5 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={slotLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-2"
                >
                  {slotLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProviderAvailabilityPage;
