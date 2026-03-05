import type { Appointment } from '../types';

const ADMIN_KEY = import.meta.env.VITE_ADMIN_SECRET || 'drivemond2026';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function toIso(date: Date) {
  return date.toISOString();
}

export function addMinutes(date: Date, mins: number) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() + mins);
  return d;
}

export function buildGoogleCalendarUrl(appt: Appointment) {
  const start = appt.startsAtIso.replace(/[-:]/g, '').split('.')[0] + 'Z';
  const end = appt.endsAtIso.replace(/[-:]/g, '').split('.')[0] + 'Z';
  const text = encodeURIComponent(appt.carName ? `Viewing: ${appt.carName}` : 'Appointment');
  const details = encodeURIComponent(appt.notes || '');
  const location = encodeURIComponent(appt.location || '');
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${start}/${end}&details=${details}&location=${location}`;
}

export async function createAppointment(payload: {
  customerName: string;
  phone?: string;
  email?: string;
  carId?: string;
  carName?: string;
  notes?: string;
  location?: string;
  startsAtIso: string;
  endsAtIso?: string;
}): Promise<{ appointment: Appointment }> {
  const body = { ...payload, endsAtIso: payload.endsAtIso || addMinutes(new Date(payload.startsAtIso), 60).toISOString() };
  const res = await fetch('/api/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': ADMIN_KEY },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to create appointment');
  return data;
}

export async function listAppointments(): Promise<{ appointments: Appointment[] }> {
  const res = await fetch('/api/appointments', { method: 'GET', headers: { 'x-admin-key': ADMIN_KEY } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to fetch appointments');
  return data;
}

export async function downloadICS(apptId: string): Promise<string> {
  const res = await fetch(`/api/appointments/ics?id=${encodeURIComponent(apptId)}`, { headers: { 'x-admin-key': ADMIN_KEY } });
  if (!res.ok) throw new Error('Failed to generate ICS');
  const text = await res.text();
  const blob = new Blob([text], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  return url;
}

export async function sendReminders(hoursAhead = 24): Promise<{ sent: number }> {
  const res = await fetch(`/api/appointments/send-reminders?hours=${hoursAhead}`, {
    method: 'POST',
    headers: { 'x-admin-key': ADMIN_KEY },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Failed to send reminders');
  return data;
}
