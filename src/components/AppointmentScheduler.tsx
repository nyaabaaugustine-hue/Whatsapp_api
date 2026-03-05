import { useState } from 'react';
import { Calendar, Clock, MapPin, Mail, Phone, User, Check, X, Link, Bell } from 'lucide-react';
import { createAppointment, buildGoogleCalendarUrl, downloadICS, sendReminders } from '../services/appointmentService';
import type { Appointment } from '../types';

interface Props {
  carId?: string;
  carName?: string;
  onClose?: () => void;
  onCreated?: (appt: Appointment) => void;
}

export default function AppointmentScheduler({ carId, carName, onClose, onCreated }: Props) {
  const [customerName, setCustomerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('Drivemond Showroom, Spintex Road, Accra');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState<string>('');
  const [time, setTime] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Appointment | null>(null);
  const [error, setError] = useState<string | null>(null);

  const times = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];

  const canSubmit = customerName.trim() && date && time;

  const buildStartIso = () => {
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    const dt = new Date(y, (m || 1) - 1, d || 1, hh || 9, mm || 0);
    return dt.toISOString();
  };

  const handleCreate = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const startsAtIso = buildStartIso();
      const { appointment } = await createAppointment({
        customerName,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        carId,
        carName,
        notes,
        location,
        startsAtIso,
      });
      setCreated(appointment);
      onCreated?.(appointment);
    } catch (e: any) {
      setError(e?.message || 'Failed to schedule appointment');
    }
    setSubmitting(false);
  };

  const handleGoogle = () => {
    if (!created) return;
    const url = buildGoogleCalendarUrl(created);
    window.open(url, '_blank');
  };

  const handleICS = async () => {
    if (!created) return;
    const url = await downloadICS(created.id);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appointment-${created.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendReminders = async () => {
    try {
      await sendReminders(24);
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2f3b43] bg-[#111b21]">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#e9edef]" />
            <h3 className="text-white font-bold text-base">Schedule Appointment</h3>
          </div>
          <button onClick={onClose} className="text-[#8696a0] hover:text-white p-1.5 hover:bg-white/10 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {carName && (
            <div className="text-[#00a884] text-xs font-bold">Car: {carName}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 bg-[#0b141a] rounded-xl px-3 py-2">
              <User className="w-4 h-4 text-[#8696a0]" />
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name" className="bg-transparent outline-none text-white text-xs w-full" />
            </div>
            <div className="flex items-center gap-2 bg-[#0b141a] rounded-xl px-3 py-2">
              <Phone className="w-4 h-4 text-[#8696a0]" />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone (optional)" className="bg-transparent outline-none text-white text-xs w-full" />
            </div>
            <div className="flex items-center gap-2 bg-[#0b141a] rounded-xl px-3 py-2">
              <Mail className="w-4 h-4 text-[#8696a0]" />
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (optional)" className="bg-transparent outline-none text-white text-xs w-full" />
            </div>
            <div className="flex items-center gap-2 bg-[#0b141a] rounded-xl px-3 py-2">
              <MapPin className="w-4 h-4 text-[#8696a0]" />
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" className="bg-transparent outline-none text-white text-xs w-full" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 bg-[#0b141a] rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-[#8696a0]" />
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="bg-transparent outline-none text-white text-xs w-full" />
            </div>
            <div className="flex items-center gap-2 bg-[#0b141a] rounded-xl px-3 py-2">
              <Clock className="w-4 h-4 text-[#8696a0]" />
              <select value={time} onChange={e => setTime(e.target.value)} className="bg-transparent outline-none text-white text-xs w-full">
                <option value="" disabled>Select time</option>
                {times.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes" className="bg-[#0b141a] rounded-xl px-3 py-2 outline-none text-white text-xs w-full" rows={3} />

          {error && <div className="text-red-400 text-xs">{error}</div>}

          {!created ? (
            <button
              onClick={handleCreate}
              disabled={!canSubmit || submitting}
              className="w-full bg-[#00a884] disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-sm transition-all hover:bg-[#008f72] active:scale-95"
            >
              {submitting ? 'Scheduling…' : 'Schedule Appointment'}
            </button>
          ) : (
            <div className="bg-[#0b141a] rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-2 text-[#e9edef] text-sm">
                <Check className="w-4 h-4 text-[#00a884]" /> Appointment created
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={handleGoogle} className="flex items-center justify-center gap-1 bg-[#2a3942] hover:bg-[#3d4f5c] text-white rounded-lg py-2 text-[11px]">
                  <Link className="w-3 h-3" /> Google Calendar
                </button>
                <button onClick={handleICS} className="flex items-center justify-center gap-1 bg-[#2a3942] hover:bg-[#3d4f5c] text-white rounded-lg py-2 text-[11px]">
                  .ics File
                </button>
                <button onClick={handleSendReminders} className="flex items-center justify-center gap-1 bg-[#2a3942] hover:bg-[#3d4f5c] text-white rounded-lg py-2 text-[11px]">
                  <Bell className="w-3 h-3" /> Send Reminders
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
