import { useState, useEffect, useCallback } from 'react';
import { useRef } from 'react';
import { X, Download, Calendar, Thermometer, Target, Clock, Hash, Database, LogOut, Search, PhoneCall, Tag, Bell, FileText, Send, Plus, User } from 'lucide-react';
import { AdminLogin } from '../components/AdminLogin';
import { CAR_DATABASE } from '../data/cars';

const ADMIN_KEY = import.meta.env.VITE_ADMIN_SECRET || 'drivemond2026';

interface Stats { totalSessions: number; totalMessages: number; hotLeads: number; warmLeads: number; coldLeads: number; bookings: number; }
interface Message { session_id: string; role: 'user' | 'assistant'; content: string; metadata: any; created_at: string; }
interface Event { id?: string; session_id: string; event_type: string; event_data: any; lead_temperature: string; intent: string; created_at: string; }
interface Conversation { session_id: string; started_at: string; last_message_at: string; message_count: number; messages: Message[]; }
interface LeadProfile { name?: string; phone?: string; budget?: number; type?: string; }
interface CarItem {
  id?: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  color?: string;
  fuel?: string;
  transmission?: string;
  mileage?: string;
  image_url?: string;
  real_image?: string;
  image_urls?: string[];
  insured?: boolean;
  registered?: boolean;
  status?: 'available' | 'reserved' | 'sold';
}
interface Reminder { id: string; session_id: string; when: string; note: string; created_at: string; done?: boolean; notified?: boolean; }
interface AuditEntry { id: string; at: string; action: string; session_id?: string; detail?: string; }
interface Template { id: string; text: string; }

const TEMP_COLORS: Record<string, string> = {
  hot: 'bg-red-500/20 text-red-400 border border-red-500/30',
  warm: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  cold: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
};
const EVENT_ICONS: Record<string, string> = { booking: '📅', image_request: '🖼️', chat: '💬', escalation: '📞', tracking_log: '📊', session_start: '🟢' };
const CAR_DRAFT_KEY = '__adm_car_draft__';
const BRAND_MODELS: Record<string, string[]> = {
  Toyota: ['Corolla', 'Camry', 'RAV4', 'Highlander', 'Prado', 'Hilux', 'Yaris', 'Vitz'],
  Honda: ['CR-V', 'Civic', 'Accord', 'Pilot', 'Fit', 'HR-V'],
  Nissan: ['Altima', 'Sentra', 'X-Trail', 'Patrol', 'Navara', 'Juke'],
  Hyundai: ['Elantra', 'Tucson', 'Santa Fe', 'Sonata', 'Accent'],
  Kia: ['Sportage', 'Sorento', 'Rio', 'Cerato', 'Seltos'],
  Mazda: ['CX-5', 'CX-3', 'Mazda3', 'Mazda6'],
  Mitsubishi: ['L200', 'Pajero', 'Outlander', 'ASX'],
  Ford: ['Ranger', 'F-150', 'Everest', 'Edge', 'Escape'],
  Chevrolet: ['Cruze', 'Trax', 'Equinox', 'Silverado'],
  'Mercedes-Benz': ['C-Class', 'E-Class', 'GLA', 'GLC', 'GLE'],
  BMW: ['3 Series', '5 Series', 'X3', 'X5'],
  Lexus: ['RX 350', 'NX 300', 'ES 350', 'IS 250'],
  Audi: ['A3', 'A4', 'Q5', 'Q7'],
  Volkswagen: ['Golf', 'Passat', 'Tiguan'],
  Peugeot: ['3008', '5008', '208', '308'],
  Renault: ['Duster', 'Captur', 'Koleos'],
  Suzuki: ['Vitara', 'Swift', 'Grand Vitara'],
  Isuzu: ['D-Max', 'MU-X'],
  'Land Rover': ['Discovery', 'Range Rover Sport', 'Evoque'],
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// â”€â”€â”€ Event Detail Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function EventModal({ event, onClose, onOpenConversation }: { event: Event; onClose: () => void; onOpenConversation?: (sid: string) => void }) {
  const data = event.event_data;
  const isTracking = event.event_type === 'tracking_log';
  const isSession = event.event_type === 'session_start';
  const rawJson = JSON.stringify(event, null, 2);
  const copyJson = async () => {
    try { await navigator.clipboard.writeText(rawJson); } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2f3b43] bg-[#111b21]">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{EVENT_ICONS[event.event_type] || '📌'}</span>
            <div>
              <h3 className="text-white font-bold text-base capitalize">{event.event_type.replace(/_/g, ' ')}</h3>
              <p className="text-[#8696a0] text-xs">{new Date(event.created_at).toLocaleString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onOpenConversation && (
              <button
                onClick={() => onOpenConversation(event.session_id)}
                className="text-[11px] px-3 py-1 rounded-lg bg-[#2a3942] text-white hover:bg-[#3d4f5c] transition"
              >
                Open Conversation
              </button>
            )}
            <button onClick={onClose} className="text-[#8696a0] hover:text-white p-1.5 hover:bg-white/10 rounded-full transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {event.lead_temperature && event.lead_temperature !== 'unknown' && (
              <span className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium ${TEMP_COLORS[event.lead_temperature] || 'bg-gray-700 text-gray-300'}`}>
                <Thermometer className="w-3 h-3" /> {event.lead_temperature} lead
              </span>
            )}
            {event.intent && event.intent !== 'unknown' && (
              <span className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30 font-medium">
                <Target className="w-3 h-3" /> {event.intent}
              </span>
            )}
          </div>

          {/* Session ID */}
          <div className="bg-[#0b141a] rounded-xl px-4 py-3 flex items-start gap-3">
            <Hash className="w-4 h-4 text-[#8696a0] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[#8696a0] text-[11px] uppercase font-semibold mb-0.5">Session ID</p>
              <p className="text-white text-xs font-mono break-all">{event.session_id}</p>
            </div>
          </div>

          {/* Time */}
          <div className="bg-[#0b141a] rounded-xl px-4 py-3 flex items-center gap-3">
            <Clock className="w-4 h-4 text-[#8696a0] shrink-0" />
            <div>
              <p className="text-[#8696a0] text-[11px] uppercase font-semibold mb-0.5">Timestamp</p>
              <p className="text-white text-xs">{new Date(event.created_at).toLocaleString()} · {timeAgo(event.created_at)}</p>
            </div>
          </div>

          {/* Event Data */}
          {data && (
            <div className="bg-[#0b141a] rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-4 h-4 text-[#8696a0]" />
                <p className="text-[#8696a0] text-[11px] uppercase font-semibold">Event Data</p>
              </div>

              {isTracking ? (
                <div className="space-y-2">
                  {data.intent && (
                    <div className="flex justify-between">
                      <span className="text-[#8696a0] text-xs">Intent</span>
                      <span className="text-white text-xs font-medium capitalize">{data.intent}</span>
                    </div>
                  )}
                  {data.lead_temperature && (
                    <div className="flex justify-between">
                      <span className="text-[#8696a0] text-xs">Temperature</span>
                      <span className={`text-xs font-medium capitalize ${data.lead_temperature === 'hot' ? 'text-red-400' : data.lead_temperature === 'warm' ? 'text-yellow-400' : 'text-blue-400'}`}>{data.lead_temperature}</span>
                    </div>
                  )}
                  {data.recommended_car_id && (
                    <div className="flex justify-between">
                      <span className="text-[#8696a0] text-xs">Recommended Car ID</span>
                      <span className="text-white text-xs font-medium">{data.recommended_car_id}</span>
                    </div>
                  )}
                  {data.messageText && (
                    <div className="mt-2 pt-2 border-t border-[#2f3b43]">
                      <p className="text-[#8696a0] text-[11px] mb-1">Message Preview</p>
                      <p className="text-white text-xs leading-relaxed">{String(data.messageText).slice(0, 200)}{String(data.messageText).length > 200 ? '...' : ''}</p>
                    </div>
                  )}
                </div>
              ) : isSession ? (
                <div className="space-y-2">
                  {data.sessionId && (
                    <div className="flex justify-between">
                      <span className="text-[#8696a0] text-xs">Session ID</span>
                      <span className="text-white text-xs font-mono">{data.sessionId}</span>
                    </div>
                  )}
                </div>
              ) : (
                <pre className="text-[#e9edef] text-xs overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
                  {JSON.stringify(data, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Raw JSON */}
          <div className="bg-[#0b141a] rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[#8696a0] text-[11px] uppercase font-semibold">Raw JSON</p>
              <button
                onClick={copyJson}
                className="text-[10px] px-2 py-1 rounded-md bg-[#2a3942] text-gray-200 hover:bg-[#3d4f5c] transition"
              >
                Copy JSON
              </button>
            </div>
            <pre className="text-[#e9edef] text-[11px] overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
              {rawJson}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Export Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function exportJSON(data: any[], filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function exportCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h];
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
      return `"${str.replace(/"/g, '""')}"`;
    }).join(',')
  );
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function isInRange(iso: string, dateFrom?: string, dateTo?: string) {
  if (!dateFrom && !dateTo) return true;
  const d = new Date(iso);
  if (dateFrom) {
    const df = new Date(dateFrom);
    df.setHours(0, 0, 0, 0);
    if (d < df) return false;
  }
  if (dateTo) {
    const dt = new Date(dateTo);
    dt.setHours(23, 59, 59, 999);
    if (d > dt) return false;
  }
  return true;
}

// â”€â”€â”€ Main Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function AdminDashboard() {
  const makeCarForm = (): CarItem => ({
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    price: 0,
    color: '',
    fuel: '',
    transmission: '',
    mileage: '',
    image_url: '',
    real_image: '',
    image_urls: ['', '', '', ''],
    insured: true,
    registered: true,
    status: 'available',
  });

  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<'overview' | 'conversations' | 'events' | 'inventory'>('overview');
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | '90d'>('7d');
  const [stats, setStats] = useState<Stats | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');
  const [eventView, setEventView] = useState<'table' | 'timeline'>('table');
  const [eventAnomaliesOnly, setEventAnomaliesOnly] = useState(false);
  const [alertRules, setAlertRules] = useState<{ booking: boolean; escalation: boolean }>({ booking: true, escalation: true });
  const lastAlertAtRef = useRef<string | null>(null);
  const [eventSourceFilter, setEventSourceFilter] = useState<'all' | 'web' | 'whatsapp'>('all');
  const [eventIntentGroup, setEventIntentGroup] = useState(false);
  const [eventTagFilter, setEventTagFilter] = useState('all');
  const [eventTags, setEventTags] = useState<Record<string, string[]>>({});
  const [eventSelected, setEventSelected] = useState<Record<string, boolean>>({});
  const [eventPresets, setEventPresets] = useState<{ id: string; name: string; data: any }[]>([]);
  const [autoArchiveDays, setAutoArchiveDays] = useState<number>(0);
  const [eventPresetName, setEventPresetName] = useState('');
  const [eventTagInput, setEventTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [lastChecked, setLastChecked] = useState<Date>(new Date(0));
  const [nowTick, setNowTick] = useState<number>(Date.now());
  const [adminMsg, setAdminMsg] = useState('');
  const [search, setSearch] = useState('');
  const [leadFilter, setLeadFilter] = useState<'all'|'hot'|'warm'|'cold'>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [tags, setTags] = useState<Record<string, string[]>>({});
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [readMap, setReadMap] = useState<Record<string, string>>({});
  const [convoStatusFilter, setConvoStatusFilter] = useState<'all' | 'open' | 'pending' | 'closed'>('all');
  const [convoTagFilter, setConvoTagFilter] = useState<string>('all');
  const [pinnedConvos, setPinnedConvos] = useState<Record<string, boolean>>({});
  const [selectedConvoIds, setSelectedConvoIds] = useState<Record<string, boolean>>({});
  const [bulkTag, setBulkTag] = useState('');
  const [assignMap, setAssignMap] = useState<Record<string, string>>({});
  const [stageOverride, setStageOverride] = useState<Record<string, 'Browsing' | 'Interested' | 'Booking'>>({});
  const [statusOverride, setStatusOverride] = useState<Record<string, 'open' | 'pending' | 'closed'>>({});
  const [templates, setTemplates] = useState<Template[]>([
    { id: 't1', text: 'Thanks for your message. What is your budget range in GHS?' },
    { id: 't2', text: 'Do you prefer SUV, sedan, or pickup?' },
    { id: 't3', text: 'We are on Spintex Road, Accra. Would you like a map pin?' },
  ]);
  const [reminderNote, setReminderNote] = useState('');
  const [reminderWhen, setReminderWhen] = useState('');
  const [cars, setCars] = useState<CarItem[]>([]);
  const [carSearch, setCarSearch] = useState('');
  const [carStatusFilter, setCarStatusFilter] = useState<'all' | 'available' | 'reserved' | 'sold'>('all');
  const [carSaving, setCarSaving] = useState(false);
  const [carError, setCarError] = useState<string | null>(null);
  const [carSuccess, setCarSuccess] = useState<string | null>(null);
  const [carImageUpload, setCarImageUpload] = useState<string>('');
  const [carForm, setCarForm] = useState<CarItem>(makeCarForm());
  const [editingCarId, setEditingCarId] = useState<string | null>(null);
  const [quickEditId, setQuickEditId] = useState<string | null>(null);
  const [quickEditCar, setQuickEditCar] = useState<CarItem | null>(null);
  const [quickPrice, setQuickPrice] = useState<string>('');
  const [quickMileage, setQuickMileage] = useState<string>('');
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);
  const featureFileRef = useRef<HTMLInputElement>(null);
  const gallery1FileRef = useRef<HTMLInputElement>(null);
  const gallery2FileRef = useRef<HTMLInputElement>(null);
  const gallery3FileRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    if (!authed) return;
    setLoading(true);
    try {
      const headers = { 'x-admin-key': ADMIN_KEY };
      const [statsRes, convosRes, eventsRes] = await Promise.all([
        fetch('/api/admin?type=stats', { headers }),
        fetch('/api/admin?type=conversations', { headers }),
        fetch('/api/admin?type=events', { headers }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (convosRes.ok) setConversations(await convosRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
      setLastChecked(lastRefresh);
      setLastRefresh(new Date());
    } catch (e) { console.error('Failed to fetch', e); }
    setLoading(false);
  }, [authed, lastRefresh]);

  const fetchCars = useCallback(async () => {
    if (!authed) return;
    try {
      const res = await fetch('/api/cars');
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data?.cars) ? data.cars : [];
      setCars(list.length ? list : CAR_DATABASE);
    } catch {
      setCars(CAR_DATABASE);
    }
  }, [authed]);

  const resetCarForm = () => {
    setCarForm(makeCarForm());
    setEditingCarId(null);
    try { localStorage.removeItem(CAR_DRAFT_KEY); } catch {}
  };
  const resetCarImage = () => setCarImageUpload('');

  const startEditCar = (car: CarItem) => {
    setEditingCarId(car.id ? String(car.id) : null);
    const rawUrls = Array.isArray((car as any).image_urls) ? (car as any).image_urls : [];
    const filledUrls = [
      car.image_url || rawUrls[0] || '',
      car.real_image || rawUrls[1] || '',
      rawUrls[2] || '',
      rawUrls[3] || '',
    ];
    setCarForm({
      id: car.id ? String(car.id) : undefined,
      brand: car.brand || '',
      model: car.model || '',
      year: Number(car.year || new Date().getFullYear()),
      price: Number(car.price || 0),
      color: car.color || '',
      fuel: car.fuel || '',
      transmission: car.transmission || '',
      mileage: car.mileage || '',
      image_url: car.image_url || filledUrls[0] || '',
      real_image: car.real_image || filledUrls[1] || '',
      image_urls: filledUrls,
      insured: !!car.insured,
      registered: !!car.registered,
      status: (car.status as any) || 'available',
    });
    setCarImageUpload(car.real_image || car.image_url || filledUrls[0] || '');
    document.getElementById('admin-car-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const startQuickEdit = (car: CarItem) => {
    if (!car.id) return;
    if (quickEditId === String(car.id)) {
      cancelQuickEdit();
      return;
    }
    setQuickEditId(String(car.id));
    setQuickEditCar(car);
    setQuickPrice(String(car.price ?? ''));
    setQuickMileage(String(car.mileage ?? ''));
    setQuickError(null);
  };

  const cancelQuickEdit = () => {
    setQuickEditId(null);
    setQuickEditCar(null);
    setQuickPrice('');
    setQuickMileage('');
    setQuickError(null);
  };

  const saveQuickEdit = async () => {
    if (!quickEditCar?.id) return;
    if (!quickPrice.trim()) {
      setQuickError('Price is required.');
      return;
    }
    setQuickSaving(true);
    setQuickError(null);
    try {
      const payload = {
        ...quickEditCar,
        id: String(quickEditCar.id),
        price: Number(quickPrice),
        mileage: quickMileage,
      };
      const res = await fetch('/api/cars', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_KEY,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setQuickError(data?.error || 'Failed to update.');
      } else if (data?.car) {
        setCars(prev => prev.map(c => (String(c.id) === String(data.car.id) ? data.car : c)));
        cancelQuickEdit();
      } else {
        await fetchCars();
        cancelQuickEdit();
      }
    } catch (e: any) {
      setQuickError(e?.message || 'Failed to update.');
    }
    setQuickSaving(false);
  };

  const handleCarSubmit = async (e?: { preventDefault: () => void }) => {
    if (e) e.preventDefault();
    if (!carForm.brand.trim() || !carForm.model.trim() || !carForm.year || !carForm.price) {
      setCarError('Please fill brand, model, year, and price.');
      return;
    }
    setCarSaving(true);
    setCarError(null);
    setCarSuccess(null);
    try {
      const isEditing = !!editingCarId;
      const rawUrls = Array.isArray(carForm.image_urls) ? [...carForm.image_urls] : [];
      const feature = carForm.image_url || rawUrls[0] || '';
      const gallery = carForm.real_image || rawUrls[1] || '';
      const image_urls = [feature, gallery, rawUrls[2] || '', rawUrls[3] || ''];
      const filledImages = image_urls.filter(Boolean);
      if (filledImages.length < 4) {
        setCarError('Please add 4 images (1 feature + 3 gallery) before saving.');
        setCarSaving(false);
        return;
      }
      const normalized = {
        ...carForm,
        image_url: feature,
        real_image: gallery || feature,
        image_urls: image_urls,
      };
      const payload = isEditing ? { ...normalized, id: editingCarId } : normalized;
      const res = await fetch('/api/cars', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': ADMIN_KEY,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCarError(data?.error || 'Failed to save car.');
      } else {
        if (data?.car) {
          if (isEditing) {
            setCars(prev => prev.map(c => (String(c.id) === String(data.car.id) ? data.car : c)));
          } else {
            setCars(prev => [data.car, ...prev]);
          }
        } else {
          fetchCars();
        }
        setCarSuccess(isEditing ? 'Car updated successfully.' : 'Car saved successfully.');
        setTimeout(() => setCarSuccess(null), 3000);
        fetchCars();
        resetCarForm();
        resetCarImage();
      }
    } catch (err: any) {
      setCarError(err?.message || 'Failed to save car.');
    }
    setCarSaving(false);
  };

  const handleImageFile = (file: File, index: number) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result || '');
      setCarForm(prev => {
        const urls = Array.isArray(prev.image_urls) ? [...prev.image_urls] : ['', '', '', ''];
        urls[index] = url;
        const next: CarItem = { ...prev, image_urls: urls };
        if (index === 0) {
          next.image_url = url;
          if (!urls[1]) {
            urls[1] = url;
            next.real_image = url;
          }
        }
        if (index === 1) next.real_image = url;
        return next;
      });
      if (index === 0) setCarImageUpload(url);
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (authed) {
      fetchData();
      fetchCars();
      const i = setInterval(fetchData, 30000);
      return () => clearInterval(i);
    }
  }, [authed, fetchData, fetchCars]);

  useEffect(() => {
    const i = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (editingCarId) return;
    try {
      const raw = localStorage.getItem(CAR_DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      setCarForm(prev => ({ ...prev, ...parsed, id: undefined }));
      setCarImageUpload(parsed.real_image || parsed.image_url || '');
    } catch {}
  }, [editingCarId]);

  useEffect(() => {
    if (editingCarId) return;
    try {
      const toSave = { ...carForm, id: undefined };
      localStorage.setItem(CAR_DRAFT_KEY, JSON.stringify(toSave));
    } catch {}
  }, [carForm, editingCarId]);

  useEffect(() => {
    try {
      const rawN = localStorage.getItem('__adm_notes__');
      const rawT = localStorage.getItem('__adm_tags__');
      if (rawN) setNotes(JSON.parse(rawN));
      if (rawT) setTags(JSON.parse(rawT));
      const rawR = localStorage.getItem('__adm_read__');
      if (rawR) setReadMap(JSON.parse(rawR));
      const rawP = localStorage.getItem('__adm_pinned__');
      if (rawP) setPinnedConvos(JSON.parse(rawP));
      const rawAssign = localStorage.getItem('__adm_assign__');
      if (rawAssign) setAssignMap(JSON.parse(rawAssign));
      const rawStage = localStorage.getItem('__adm_stage__');
      if (rawStage) setStageOverride(JSON.parse(rawStage));
      const rawStatus = localStorage.getItem('__adm_status__');
      if (rawStatus) setStatusOverride(JSON.parse(rawStatus));
      const rawEventTags = localStorage.getItem('__adm_event_tags__');
      if (rawEventTags) setEventTags(JSON.parse(rawEventTags));
      const rawEventPresets = localStorage.getItem('__adm_event_presets__');
      if (rawEventPresets) setEventPresets(JSON.parse(rawEventPresets));
      const rawArchive = localStorage.getItem('__adm_event_archive_days__');
      if (rawArchive) setAutoArchiveDays(Number(rawArchive) || 0);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('__adm_notes__', JSON.stringify(notes));
      localStorage.setItem('__adm_tags__', JSON.stringify(tags));
      localStorage.setItem('__adm_read__', JSON.stringify(readMap));
      localStorage.setItem('__adm_pinned__', JSON.stringify(pinnedConvos));
      localStorage.setItem('__adm_assign__', JSON.stringify(assignMap));
      localStorage.setItem('__adm_stage__', JSON.stringify(stageOverride));
      localStorage.setItem('__adm_status__', JSON.stringify(statusOverride));
      localStorage.setItem('__adm_event_tags__', JSON.stringify(eventTags));
      localStorage.setItem('__adm_event_presets__', JSON.stringify(eventPresets));
      localStorage.setItem('__adm_event_archive_days__', String(autoArchiveDays || 0));
    } catch {}
  }, [notes, tags, readMap, pinnedConvos, assignMap, stageOverride, statusOverride, eventTags, eventPresets, autoArchiveDays]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('__adm_alert_rules__');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setAlertRules({
            booking: !!parsed.booking,
            escalation: !!parsed.escalation,
          });
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('__adm_alert_rules__', JSON.stringify(alertRules));
    } catch {}
  }, [alertRules]);

  useEffect(() => {
    if (!events.length) return;
    if (!alertRules.booking && !alertRules.escalation) return;
    const sorted = [...events].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const newest = sorted[sorted.length - 1];
    if (!lastAlertAtRef.current) {
      lastAlertAtRef.current = newest.created_at;
      return;
    }
    const since = new Date(lastAlertAtRef.current).getTime();
    const incoming = sorted.filter(e => new Date(e.created_at).getTime() > since);
    if (incoming.length === 0) return;
    incoming.forEach(evt => {
      const type = (evt.event_type || '').toLowerCase();
      const intent = (evt.intent || '').toLowerCase();
      const isBooking = type.includes('booking') || intent.includes('booking');
      const isEscalation = type.includes('escalation') || intent.includes('escalation');
      if ((isBooking && alertRules.booking) || (isEscalation && alertRules.escalation)) {
        try {
          if ('Notification' in window) {
            if (Notification.permission === 'default') {
              Notification.requestPermission().catch(() => {});
            }
            if (Notification.permission === 'granted') {
              new Notification('Drivemond Alert', {
                body: `${evt.event_type.replace(/_/g, ' ')} · ${evt.session_id.slice(0, 8)}…`,
              });
            }
          }
        } catch {}
      }
    });
    lastAlertAtRef.current = newest.created_at;
  }, [events, alertRules]);

  useEffect(() => {
    try {
      const rawR = localStorage.getItem('__adm_reminders__');
      const rawA = localStorage.getItem('__adm_audit__');
      const rawRead = localStorage.getItem('__adm_read__');
      const rawTemplates = localStorage.getItem('__adm_templates__');
      if (rawR) setReminders(JSON.parse(rawR));
      if (rawA) setAuditLog(JSON.parse(rawA));
      if (rawRead) setReadMap(JSON.parse(rawRead));
      if (rawTemplates) setTemplates(JSON.parse(rawTemplates));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('__adm_reminders__', JSON.stringify(reminders)); } catch {}
  }, [reminders]);

  useEffect(() => {
    try { localStorage.setItem('__adm_audit__', JSON.stringify(auditLog)); } catch {}
  }, [auditLog]);

  useEffect(() => {
    try { localStorage.setItem('__adm_read__', JSON.stringify(readMap)); } catch {}
  }, [readMap]);

  useEffect(() => {
    try { localStorage.setItem('__adm_templates__', JSON.stringify(templates)); } catch {}
  }, [templates]);

  // Derived bookings from events
  const bookingEvents = events.filter(e => e.event_type === 'booking');
  const dateCutoff = (() => {
    const d = new Date();
    if (period === 'today') d.setHours(0, 0, 0, 0);
    else if (period === '7d') d.setDate(d.getDate() - 7);
    else if (period === '30d') d.setDate(d.getDate() - 30);
    else d.setDate(d.getDate() - 90);
    return d;
  })();
  const periodEvents = events.filter(e => new Date(e.created_at) >= dateCutoff);
  const periodBookings = bookingEvents.filter(e => new Date(e.created_at) >= dateCutoff);
  const periodConvos = conversations.filter(c => new Date(c.started_at) >= dateCutoff || new Date(c.last_message_at) >= dateCutoff);
  const periodDays = period === 'today' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const inventoryPriceAvg = (() => {
    const list = (cars.length ? cars : CAR_DATABASE).map(c => Number((c as any).price || 0)).filter(n => Number.isFinite(n) && n > 0);
    if (list.length === 0) return 0;
    return Math.round(list.reduce((a, b) => a + b, 0) / list.length);
  })();
  const bookingRevenue = (() => {
    const list = cars.length ? cars : CAR_DATABASE;
    const map = new Map<string, number>();
    list.forEach((c: any) => { if (c?.id) map.set(String(c.id), Number(c.price || 0)); });
    let sum = 0;
    let unmatched = 0;
    periodBookings.forEach(b => {
      const id = String(b.event_data?.car_id || '');
      const price = map.get(id);
      if (price && price > 0) sum += price;
      else unmatched++;
    });
    if (unmatched > 0 && inventoryPriceAvg > 0) sum += unmatched * inventoryPriceAvg;
    return sum;
  })();
  const bookingValueAvg = periodBookings.length > 0 ? Math.round(bookingRevenue / periodBookings.length) : 0;
  const bookingProjection30d = periodDays > 0 ? Math.round((bookingRevenue / periodDays) * 30) : 0;
  const bucketByDay = (arr: { created_at: string }[]) => {
    const m: Record<string, number> = {};
    arr.forEach(a => {
      const d = new Date(a.created_at); const k = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
      m[k] = (m[k] || 0) + 1;
    });
    const keys = Object.keys(m).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
    return keys.map(k => m[k]);
  };
  const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  const lastNDays = (n: number) => {
    const out: string[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      out.push(dayKey(d));
    }
    return out;
  };
  const sparkSessions = bucketByDay(periodConvos.map(c => ({ created_at: c.started_at })));
  const sparkBookings = bucketByDay(periodBookings);
  const sparkEvents = bucketByDay(periodEvents);
  const periodMessageCount = periodConvos.reduce((acc, c) => acc + c.message_count, 0);
  const responseDeltas = (() => {
    const deltas: number[] = [];
    periodConvos.forEach(c => {
      for (let i = 0; i < c.messages.length - 1; i++) {
        const a = c.messages[i];
        const b = c.messages[i + 1];
        if (a.role === 'user' && b.role === 'assistant') {
          const d = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          if (d > 0 && d < 1000 * 60 * 30) deltas.push(d);
        }
      }
    });
    return deltas;
  })();
  const medianResponseSec = (() => {
    if (responseDeltas.length === 0) return 0;
    const sorted = [...responseDeltas].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const med = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    return Math.round(med / 1000);
  })();
  const leadBuckets = {
    hot: periodEvents.filter(e => e.lead_temperature === 'hot').length,
    warm: periodEvents.filter(e => e.lead_temperature === 'warm').length,
    cold: periodEvents.filter(e => e.lead_temperature === 'cold').length,
  };
  const funnel = [
    { label: 'Sessions', value: periodConvos.length },
    { label: 'Warm', value: leadBuckets.warm },
    { label: 'Hot', value: leadBuckets.hot },
    { label: 'Booked', value: periodBookings.length },
  ];
  const leadSourceCounts = (() => {
    const counts: Record<string, number> = { whatsapp: 0, walkin: 0, website: 0, referral: 0 };
    periodEvents.forEach(e => {
      const src = (e.event_data?.source || '').toLowerCase();
      if (src.includes('walk')) counts.walkin++;
      else if (src.includes('web')) counts.website++;
      else if (src.includes('ref')) counts.referral++;
      else counts.whatsapp++;
    });
    return counts;
  })();

  const todayStart = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  const sevenDayStart = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - 7);
    return d;
  })();
  const countMessagesSince = (since: Date) => {
    let count = 0;
    conversations.forEach(c => {
      c.messages.forEach(m => {
        if (new Date(m.created_at) >= since) count++;
      });
    });
    return count;
  };
  const todayConvos = conversations.filter(c => new Date(c.last_message_at) >= todayStart);
  const todayEvents = events.filter(e => new Date(e.created_at) >= todayStart);
  const todayBookings = bookingEvents.filter(e => new Date(e.created_at) >= todayStart);
  const todayMessages = countMessagesSince(todayStart);
  const sevenDayConvos = conversations.filter(c => new Date(c.last_message_at) >= sevenDayStart);
  const sevenDayEvents = events.filter(e => new Date(e.created_at) >= sevenDayStart);
  const sevenDayBookings = bookingEvents.filter(e => new Date(e.created_at) >= sevenDayStart);
  const sevenDayMessages = countMessagesSince(sevenDayStart);
  const avg7dConvos = sevenDayConvos.length / 7;
  const avg7dBookings = sevenDayBookings.length / 7;
  const avg7dMessages = sevenDayMessages / 7;
  const todayLeadBuckets = {
    hot: todayEvents.filter(e => e.lead_temperature === 'hot').length,
    warm: todayEvents.filter(e => e.lead_temperature === 'warm').length,
    cold: todayEvents.filter(e => e.lead_temperature === 'cold').length,
  };
  const avg7dLeadBuckets = {
    hot: sevenDayEvents.filter(e => e.lead_temperature === 'hot').length / 7,
    warm: sevenDayEvents.filter(e => e.lead_temperature === 'warm').length / 7,
    cold: sevenDayEvents.filter(e => e.lead_temperature === 'cold').length / 7,
  };
  const deltaPct = (today: number, avg: number) => {
    if (!avg || avg <= 0) return 0;
    return Math.round(((today - avg) / avg) * 100);
  };
  const kpiDelta = {
    sessions: deltaPct(todayConvos.length, avg7dConvos),
    messages: deltaPct(todayMessages, avg7dMessages),
    bookings: deltaPct(todayBookings.length, avg7dBookings),
    hot: deltaPct(todayLeadBuckets.hot, avg7dLeadBuckets.hot),
    warm: deltaPct(todayLeadBuckets.warm, avg7dLeadBuckets.warm),
    cold: deltaPct(todayLeadBuckets.cold, avg7dLeadBuckets.cold),
  };

  const activeNow = conversations.filter(c => nowTick - new Date(c.last_message_at).getTime() <= 10 * 60 * 1000).length;
  const goalResponseSec = 120;

  const intentsRanked = (() => {
    const counts: Record<string, number> = {};
    periodEvents.forEach(e => {
      const intent = (e.intent || e.event_data?.intent || '').toString().toLowerCase();
      if (!intent || intent === 'unknown') return;
      counts[intent] = (counts[intent] || 0) + 1;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([intent, count]) => ({ intent, count, pct: Math.round((count / total) * 100) }));
  })();

  const leadTempDonut = (() => {
    const total = leadBuckets.hot + leadBuckets.warm + leadBuckets.cold || 1;
    const hotPct = (leadBuckets.hot / total) * 100;
    const warmPct = (leadBuckets.warm / total) * 100;
    const coldPct = (leadBuckets.cold / total) * 100;
    return { total, hotPct, warmPct, coldPct };
  })();

  const priceMap = (() => {
    const list = cars.length ? cars : CAR_DATABASE;
    const map = new Map<string, number>();
    list.forEach((c: any) => { if (c?.id) map.set(String(c.id), Number(c.price || 0)); });
    return map;
  })();
  const revenueSpark14d = (() => {
    const days = lastNDays(14);
    const sums: Record<string, number> = {};
    bookingEvents.forEach(b => {
      const d = new Date(b.created_at);
      const key = dayKey(d);
      if (!days.includes(key)) return;
      const id = String(b.event_data?.car_id || '');
      const price = priceMap.get(id) || inventoryPriceAvg;
      sums[key] = (sums[key] || 0) + (price || 0);
    });
    return days.map(k => sums[k] || 0);
  })();

  const bookingsWeekStrip = (() => {
    const days = lastNDays(7);
    const counts: Record<string, number> = {};
    bookingEvents.forEach(b => {
      const key = dayKey(new Date(b.created_at));
      if (!days.includes(key)) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return days.map(k => ({ key: k, count: counts[k] || 0 }));
  })();

  const hotLeadsFollowUp = conversations
    .filter(c => leadTempForSession(c.session_id) === 'hot')
    .filter(c => {
      const last = c.messages[c.messages.length - 1];
      if (!last || last.role !== 'user') return false;
      const mins = (Date.now() - new Date(c.last_message_at).getTime()) / 60000;
      return mins >= 60;
    })
    .slice(0, 8);

  const dailyLeads30 = (() => {
    const days = lastNDays(30);
    const byDay: Record<string, number> = {};
    const hasSessionStart = events.some(e => e.event_type === 'session_start');
    if (hasSessionStart) {
      events.filter(e => e.event_type === 'session_start').forEach(e => {
        const key = dayKey(new Date(e.created_at));
        byDay[key] = (byDay[key] || 0) + 1;
      });
    } else {
      conversations.forEach(c => {
        const key = dayKey(new Date(c.started_at));
        byDay[key] = (byDay[key] || 0) + 1;
      });
    }
    return days.map(k => byDay[k] || 0);
  })();

  const growthVsLastMonth = (() => {
    const days60 = lastNDays(60);
    const byDay: Record<string, number> = {};
    const hasSessionStart = events.some(e => e.event_type === 'session_start');
    if (hasSessionStart) {
      events.filter(e => e.event_type === 'session_start').forEach(e => {
        const key = dayKey(new Date(e.created_at));
        byDay[key] = (byDay[key] || 0) + 1;
      });
    } else {
      conversations.forEach(c => {
        const key = dayKey(new Date(c.started_at));
        byDay[key] = (byDay[key] || 0) + 1;
      });
    }
    const prev = days60.slice(0, 30).reduce((s, k) => s + (byDay[k] || 0), 0);
    const curr = days60.slice(30).reduce((s, k) => s + (byDay[k] || 0), 0);
    const pct = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;
    return { prev, curr, pct };
  })();

  const bookingsByWeekday = (() => {
    const counts = Array(7).fill(0);
    bookingEvents.forEach(b => {
      const d = new Date(b.created_at);
      counts[d.getDay()]++;
    });
    return counts;
  })();

  const avgTimeToBookingHours = (() => {
    if (!bookingEvents.length) return 0;
    const bySession = new Map<string, string>();
    conversations.forEach(c => bySession.set(c.session_id, c.started_at));
    const deltas: number[] = [];
    bookingEvents.forEach(b => {
      const start = bySession.get(b.session_id);
      if (!start) return;
      const diff = new Date(b.created_at).getTime() - new Date(start).getTime();
      if (diff > 0) deltas.push(diff);
    });
    if (!deltas.length) return 0;
    const avg = deltas.reduce((s, v) => s + v, 0) / deltas.length;
    return Math.round((avg / (1000 * 60 * 60)) * 10) / 10;
  })();

  const quoteToBookingRate = (() => {
    const quoteSessions = new Set<string>();
    periodEvents.forEach(e => {
      const intent = (e.intent || e.event_data?.intent || '').toString().toLowerCase();
      const msg = (e.event_data?.messageText || '').toString().toLowerCase();
      if (intent.includes('quote') || intent.includes('pricing') || intent.includes('negotiat') || msg.includes('price') || msg.includes('quote')) {
        quoteSessions.add(e.session_id);
      }
    });
    const bookedSessions = new Set(bookingEvents.map(b => b.session_id));
    const quotes = quoteSessions.size || 0;
    const bookedFromQuotes = Array.from(quoteSessions).filter(s => bookedSessions.has(s)).length;
    return { quotes, bookedFromQuotes, pct: quotes ? Math.round((bookedFromQuotes / quotes) * 100) : 0 };
  })();

  const demoToHandoffRatio = (() => {
    const demoSessions = new Set<string>();
    const handoffSessions = new Set<string>();
    events.forEach(e => {
      const type = (e.event_type || '').toLowerCase();
      const intent = (e.intent || e.event_data?.intent || '').toString().toLowerCase();
      const msg = (e.event_data?.messageText || '').toString().toLowerCase();
      if (type.includes('image_request') || intent.includes('image') || intent.includes('photo') || msg.includes('photo') || msg.includes('show')) {
        demoSessions.add(e.session_id);
      }
      if (type.includes('escalation') || intent.includes('escalation') || type.includes('booking') || intent.includes('booking')) {
        handoffSessions.add(e.session_id);
      }
    });
    const demo = demoSessions.size || 0;
    const handoff = Array.from(demoSessions).filter(s => handoffSessions.has(s)).length;
    return { demo, handoff, pct: demo ? Math.round((handoff / demo) * 100) : 0 };
  })();

  const topLocations = (() => {
    const locations = ['Accra','Tema','Kumasi','Takoradi','Tamale','Cape Coast','Sunyani','Koforidua','East Legon','Madina','Spintex'];
    const counts: Record<string, number> = {};
    conversations.forEach(c => {
      c.messages.forEach(m => {
        if (m.role !== 'user') return;
        const t = (m.content || '').toLowerCase();
        locations.forEach(loc => {
          if (t.includes(loc.toLowerCase())) counts[loc] = (counts[loc] || 0) + 1;
        });
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  })();

  const mostRequestedColors = (() => {
    const colors = ['black','white','silver','gray','grey','blue','red','green','gold','brown','beige','pearl'];
    const counts: Record<string, number> = {};
    conversations.forEach(c => {
      c.messages.forEach(m => {
        if (m.role !== 'user') return;
        const t = (m.content || '').toLowerCase();
        colors.forEach(color => {
          if (t.includes(color)) counts[color] = (counts[color] || 0) + 1;
        });
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  })();

  const monthlyTarget = 30;
  const monthlyBookings = (() => {
    const now = new Date();
    return bookingEvents.filter(b => {
      const d = new Date(b.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  })();
  const monthlyProgressPct = Math.min(100, Math.round((monthlyBookings / Math.max(monthlyTarget, 1)) * 100));

  const filteredCars = cars.filter(c => {
    const q = carSearch.trim().toLowerCase();
    if (carStatusFilter !== 'all' && (c.status || 'available') !== carStatusFilter) return false;
    if (!q) return true;
    return [
      c.brand,
      c.model,
      c.fuel,
      c.transmission,
      c.color,
      c.status,
      String(c.year ?? ''),
      String(c.price ?? ''),
    ].some(v => String(v || '').toLowerCase().includes(q));
  });

  const eventKey = (e: Event) => (e.id ? String(e.id) : `${e.session_id}-${e.event_type}-${e.created_at}`);
  const eventIntentLabel = (e: Event) => {
    const raw = e.intent || e.event_data?.intent;
    return raw ? String(raw) : 'unknown';
  };
  const eventSourceFor = (e: Event) => {
    const raw = String(e.event_data?.source || e.event_data?.channel || e.event_data?.origin || e.event_data?.platform || '');
    const hay = `${raw} ${JSON.stringify(e.event_data || {})}`.toLowerCase();
    if (hay.includes('whatsapp') || hay.includes('wa.me') || hay.includes('whatsapp:')) return 'whatsapp';
    if (hay.includes('web') || hay.includes('website') || hay.includes('widget') || hay.includes('browser')) return 'web';
    return 'unknown';
  };
  const isRateLimitEvent = (e: Event) => {
    const t = (e.event_type || '').toLowerCase();
    if (t.includes('rate') && t.includes('limit')) return true;
    const data = JSON.stringify(e.event_data || {}).toLowerCase();
    return data.includes('rate limit') || data.includes('too many requests') || data.includes('429') || data.includes('quota');
  };
  const eventTagList = Array.from(new Set(Object.values(eventTags).flat().map(t => t.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b));

  const isAnomalyEvent = (e: Event) => {
    const t = (e.event_type || '').toLowerCase();
    if (t.includes('error') || t.includes('fail')) return true;
    const data = JSON.stringify(e.event_data || {}).toLowerCase();
    return data.includes('error') || data.includes('failed') || data.includes('exception');
  };

  const eventSeverity = (e: Event) => {
    const t = (e.event_type || '').toLowerCase();
    const intent = (e.intent || '').toLowerCase();
    if (t.includes('booking') || intent.includes('booking')) return { label: 'Booking', cls: 'bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/30' };
    if (t.includes('escalation') || intent.includes('escalation')) return { label: 'Escalation', cls: 'bg-red-500/20 text-red-400 border border-red-500/30' };
    if (isAnomalyEvent(e)) return { label: 'Issue', cls: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' };
    return { label: 'Info', cls: 'bg-[#2a3942] text-[#aebac1] border border-[#3d4f5c]' };
  };

  const eventTypeCounts = events.reduce<Record<string, number>>((acc, e) => {
    const t = e.event_type || 'event';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  const eventTypeList = Object.keys(eventTypeCounts).sort((a, b) => eventTypeCounts[b] - eventTypeCounts[a]);

  const archiveCutoff = autoArchiveDays > 0 ? Date.now() - autoArchiveDays * 24 * 60 * 60 * 1000 : null;
  const filteredEvents = events
    .filter(e => !archiveCutoff || new Date(e.created_at).getTime() >= archiveCutoff)
    .filter(e => isInRange(e.created_at, dateFrom, dateTo))
    .filter(e => eventTypeFilter === 'all' || e.event_type === eventTypeFilter)
    .filter(e => eventSourceFilter === 'all' || eventSourceFor(e) === eventSourceFilter)
    .filter(e => eventTagFilter === 'all' || (eventTags[eventKey(e)] || []).includes(eventTagFilter))
    .filter(e => !eventAnomaliesOnly || isAnomalyEvent(e))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const timelineBySession = Object.entries(
    filteredEvents.reduce<Record<string, Event[]>>((acc, e) => {
      (acc[e.session_id] ||= []).push(e);
      return acc;
    }, {})
  ).map(([sid, list]) => ({
    session_id: sid,
    events: list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  }));
  const timelineByIntent = Object.entries(
    filteredEvents.reduce<Record<string, Event[]>>((acc, e) => {
      const key = eventIntentLabel(e).toLowerCase();
      (acc[key] ||= []).push(e);
      return acc;
    }, {})
  ).map(([intent, list]) => ({
    intent,
    events: list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
  }));

  const topEventsThisWeek = (() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const counts: Record<string, number> = {};
    events.forEach(e => {
      if (new Date(e.created_at).getTime() < weekAgo) return;
      const t = e.event_type || 'event';
      counts[t] = (counts[t] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  })();

  const buildHourlySeries = (list: Event[]) => {
    const now = Date.now();
    const bins = Array(24).fill(0);
    list.forEach(e => {
      const diff = Math.floor((now - new Date(e.created_at).getTime()) / (1000 * 60 * 60));
      if (diff >= 0 && diff < 24) bins[23 - diff] += 1;
    });
    return bins;
  };
  const eventsLast24h = events.filter(e => Date.now() - new Date(e.created_at).getTime() <= 24 * 60 * 60 * 1000);
  const anomalyEvents24h = eventsLast24h.filter(isAnomalyEvent);
  const volume24h = buildHourlySeries(eventsLast24h);
  const anomalyVolume24h = buildHourlySeries(anomalyEvents24h);
  const errorRate24h = eventsLast24h.length ? Math.round((anomalyEvents24h.length / eventsLast24h.length) * 100) : 0;
  const rateLimit24h = eventsLast24h.filter(isRateLimitEvent).length;
  const maxVolume24h = Math.max(1, ...volume24h);
  const maxAnomaly24h = Math.max(1, ...anomalyVolume24h);
  const selectedEvents = filteredEvents.filter(e => eventSelected[eventKey(e)]);
  const selectedEventCount = selectedEvents.length;

  const mapEventExport = (e: Event) => ({
    time: e.created_at,
    type: e.event_type,
    session: e.session_id,
    intent: eventIntentLabel(e),
    lead_temperature: e.lead_temperature,
    source: eventSourceFor(e),
    tags: (eventTags[eventKey(e)] || []).join('|'),
    data: JSON.stringify(e.event_data),
  });

  const handleExport = (format: 'json' | 'csv', type: 'events' | 'bookings' | 'conversations') => {
    const typeLabel = type === 'events' ? 'events' : type === 'bookings' ? 'bookings' : 'conversations';
    const dateSuffix = dateFrom || dateTo ? `_${dateFrom || 'start'}-${dateTo || 'end'}` : '';
    if (type === 'events') {
      const data = filteredEvents
        .filter(e => leadFilter === 'all' || e.lead_temperature === leadFilter)
        .map(mapEventExport);
      format === 'json' ? exportJSON(data, `${typeLabel}${dateSuffix}.json`) : exportCSV(data, `${typeLabel}${dateSuffix}.csv`);
    } else if (type === 'bookings') {
      const data = bookingEvents.length > 0
        ? bookingEvents
            .filter(e => isInRange(e.created_at, dateFrom, dateTo))
            .filter(e => leadFilter === 'all' || e.lead_temperature === leadFilter)
            .map(e => ({ time: e.created_at, session: e.session_id, intent: e.intent, lead_temperature: e.lead_temperature, ...e.event_data }))
        : [{ note: 'No bookings yet', time: new Date().toISOString() }];
      format === 'json' ? exportJSON(data, `${typeLabel}${dateSuffix}.json`) : exportCSV(data, `${typeLabel}${dateSuffix}.csv`);
    } else {
      const data = conversations
        .filter(c => isInRange(c.started_at, dateFrom, dateTo) || isInRange(c.last_message_at, dateFrom, dateTo))
        .filter(c => leadFilter === 'all' || leadTempForSession(c.session_id) === leadFilter)
        .map(c => ({ session_id: c.session_id, started_at: c.started_at, last_message: c.last_message_at, message_count: c.message_count }));
      format === 'json' ? exportJSON(data, `${typeLabel}${dateSuffix}.json`) : exportCSV(data, `${typeLabel}${dateSuffix}.csv`);
    }
  };

  const exportSelectedEvents = (format: 'json' | 'csv') => {
    if (!selectedEventCount) return;
    const data = selectedEvents.map(mapEventExport);
    format === 'json' ? exportJSON(data, 'events_selected.json') : exportCSV(data, 'events_selected.csv');
  };

  const toggleSelectAllEvents = (checked: boolean) => {
    const next = { ...eventSelected };
    filteredEvents.forEach(e => { next[eventKey(e)] = checked; });
    setEventSelected(next);
  };

  const addTagToEvent = (evt: Event, tag: string) => {
    const clean = tag.trim();
    if (!clean) return;
    const key = eventKey(evt);
    setEventTags(prev => {
      const list = prev[key] || [];
      if (list.includes(clean)) return prev;
      return { ...prev, [key]: [...list, clean] };
    });
  };

  const addTagToSelected = () => {
    const clean = eventTagInput.trim();
    if (!clean || !selectedEventCount) return;
    setEventTags(prev => {
      const next = { ...prev };
      selectedEvents.forEach(evt => {
        const key = eventKey(evt);
        const list = next[key] || [];
        if (!list.includes(clean)) next[key] = [...list, clean];
      });
      return next;
    });
    setEventTagInput('');
  };

  const saveEventPreset = () => {
    const name = eventPresetName.trim();
    if (!name) return;
    const data = {
      eventTypeFilter,
      eventAnomaliesOnly,
      dateFrom,
      dateTo,
      eventSourceFilter,
      eventTagFilter,
      eventView,
      eventIntentGroup,
      autoArchiveDays,
    };
    setEventPresets(prev => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name, data }]);
    setEventPresetName('');
  };

  const applyEventPreset = (preset: { data: any }) => {
    const d = preset.data || {};
    setEventTypeFilter(d.eventTypeFilter ?? 'all');
    setEventAnomaliesOnly(!!d.eventAnomaliesOnly);
    setDateFrom(d.dateFrom || '');
    setDateTo(d.dateTo || '');
    setEventSourceFilter(d.eventSourceFilter || 'all');
    setEventTagFilter(d.eventTagFilter || 'all');
    setEventView(d.eventView || 'table');
    setEventIntentGroup(!!d.eventIntentGroup);
    setAutoArchiveDays(Number(d.autoArchiveDays) || 0);
  };

  const deleteEventPreset = (id: string) => {
    setEventPresets(prev => prev.filter(p => p.id !== id));
  };

  const addAudit = useCallback((action: string, detail?: string, session_id?: string) => {
    const entry: AuditEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      at: new Date().toISOString(),
      action,
      session_id,
      detail,
    };
    setAuditLog(prev => [entry, ...prev].slice(0, 300));
  }, []);

  const sendAdminText = async (text: string) => {
    if (!selectedConvo || !text.trim()) return;
    const payload = {
      eventType: 'message',
      sessionId: selectedConvo.session_id,
      data: { sender: 'assistant', text: text.trim() },
      timestamp: new Date().toISOString(),
    };
    try {
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {}
    const newMessage: Message = {
      session_id: selectedConvo.session_id,
      role: 'assistant',
      content: text.trim(),
      metadata: null,
      created_at: new Date().toISOString(),
    };
    setSelectedConvo(prev => prev ? { ...prev, messages: [...prev.messages, newMessage], message_count: prev.message_count + 1, last_message_at: newMessage.created_at } : prev);
    setConversations(prev => prev.map(c => c.session_id === selectedConvo.session_id
      ? { ...c, messages: [...c.messages, newMessage], message_count: c.message_count + 1, last_message_at: newMessage.created_at }
      : c
    ));
    setAdminMsg('');
    addAudit('admin_message_sent', text.trim(), selectedConvo.session_id);
  };

  const sendAdminMessage = async () => {
    if (!selectedConvo || !adminMsg.trim()) return;
    await sendAdminText(adminMsg);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setReminders(prev => prev.map(r => {
        if (r.done || r.notified) return r;
        const when = new Date(r.when).getTime();
        if (!Number.isFinite(when) || when > now) return r;
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification('Follow-up reminder', {
              body: r.note ? `${r.note} (Session ${r.session_id.slice(0, 8)}...)` : `Session ${r.session_id.slice(0, 8)}...`,
            });
          } catch {}
        }
        addAudit('reminder_due', r.note || 'follow-up', r.session_id);
        return { ...r, notified: true };
      }));
    }, 15000);
    return () => clearInterval(interval);
  }, [addAudit]);

  if (!authed) {
    return <AdminLogin onAuth={() => setAuthed(true)} />;
  }

  const eventBySession = (() => {
    const m: Record<string, Event> = {};
    events.forEach(e => {
      const prev = m[e.session_id];
      if (!prev || new Date(e.created_at) > new Date(prev.created_at)) m[e.session_id] = e;
    });
    return m;
  })();

  const leadTempForSession = (sid: string) => eventBySession[sid]?.lead_temperature || 'unknown';
  const intentForSession = (sid: string) => eventBySession[sid]?.intent || 'unknown';
  const leadScoreForSession = (sid: string) => {
    const tracking = events
      .filter(e => e.session_id === sid && e.event_type === 'tracking_log')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const raw = tracking[0]?.event_data?.lead_score;
    if (raw !== undefined && raw !== null && raw !== '') {
      const num = Number(raw);
      if (!Number.isNaN(num)) return num;
    }
    const temp = leadTempForSession(sid);
    if (temp === 'hot') return 80;
    if (temp === 'warm') return 50;
    if (temp === 'cold') return 20;
    return undefined;
  };
  const nextReminderForSession = (sid: string) => {
    const upcoming = reminders
      .filter(r => r.session_id === sid && !r.done)
      .sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime());
    return upcoming[0];
  };

  const parseBudgetFromText = (text: string) => {
    const match = text.match(/(\d[\d,.\s]*)/);
    if (!match) return undefined;
    const raw = match[1].replace(/[,.\s]/g, '');
    const val = parseInt(raw, 10);
    if (Number.isNaN(val)) return undefined;
    return val;
  };

  const parseTypeFromText = (text: string) => {
    const t = text.toLowerCase();
    if (t.includes('suv')) return 'SUV';
    if (t.includes('sedan')) return 'Sedan';
    if (t.includes('pickup')) return 'Pickup';
    if (t.includes('truck') || t.includes('load')) return 'Pickup';
    if (t.includes('luxury')) return 'Luxury';
    return undefined;
  };

  const parsePriorityFromText = (text: string) => {
    const t = text.toLowerCase();
    if (t.includes('fuel')) return 'Fuel Efficiency';
    if (t.includes('maintenance') || t.includes('service')) return 'Easy Maintenance';
    if (t.includes('resale') || t.includes('resell')) return 'Strong Resale Value';
    if (t.includes('comfort') || t.includes('spacious')) return 'Comfort';
    if (t.includes('power') || t.includes('performance')) return 'Power';
    return undefined;
  };

  const parseEmailFromText = (text: string) => {
    const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return match ? match[0] : undefined;
  };

  const buildLeadProfile = (convo: Conversation | null): LeadProfile => {
    if (!convo) return {};
    const profile: LeadProfile = {};
    const eventsForSession = events.filter(e => e.session_id === convo.session_id && e.event_type === 'tracking_log');
    const leadCapture = eventsForSession.find(e => String(e.event_data?.messageText || '').toLowerCase().includes('lead captured'));
    if (leadCapture) {
      const msg = String(leadCapture.event_data?.messageText || '');
      const parts = msg.split(':')[1]?.split('|').map(s => s.trim());
      if (parts && parts[0]) profile.name = parts[0];
      if (parts && parts[1]) profile.phone = parts[1];
    }
    for (let i = convo.messages.length - 1; i >= 0; i--) {
      const m = convo.messages[i];
      if (m.role !== 'user') continue;
      if (!profile.budget) profile.budget = parseBudgetFromText(m.content);
      if (!profile.type) profile.type = parseTypeFromText(m.content);
      if (profile.budget && profile.type) break;
    }
    return profile;
  };

  const leadIntentForSession = (sid: string) => {
    const track = events
      .filter(e => e.session_id === sid && e.event_type === 'tracking_log')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return track[0]?.intent || track[0]?.event_data?.intent || intentForSession(sid) || 'unknown';
  };

  const leadPriorityForSession = (convo: Conversation) => {
    for (let i = convo.messages.length - 1; i >= 0; i--) {
      const m = convo.messages[i];
      if (m.role !== 'user') continue;
      const p = parsePriorityFromText(m.content);
      if (p) return p;
    }
    return 'unknown';
  };

  const convoStageForSession = (sid: string) => {
    if (stageOverride[sid]) return stageOverride[sid];
    const hasBooking = events.some(e => e.session_id === sid && e.event_type === 'booking');
    if (hasBooking) return 'Booking';
    const score = leadScoreForSession(sid);
    const temp = leadTempForSession(sid);
    if ((score ?? 0) >= 40 || temp === 'warm' || temp === 'hot') return 'Interested';
    return 'Browsing';
  };

  const convoStatusForSession = (convo: Conversation) => {
    const override = statusOverride[convo.session_id];
    if (override) return override;
    const hasBooking = events.some(e => e.session_id === convo.session_id && e.event_type === 'booking');
    if (hasBooking) return 'closed';
    const last = convo.messages[convo.messages.length - 1];
    if (last?.role === 'user') {
      const mins = (Date.now() - new Date(convo.last_message_at).getTime()) / 60000;
      if (mins >= 60) return 'pending';
    }
    return 'open';
  };

  const slaMinutesForConvo = (convo: Conversation) => {
    const last = convo.messages[convo.messages.length - 1];
    if (!last || last.role !== 'user') return 0;
    return Math.floor((Date.now() - new Date(convo.last_message_at).getTime()) / 60000);
  };

  const slaCountdownForConvo = (convo: Conversation) => {
    const mins = slaMinutesForConvo(convo);
    if (!mins) return null;
    const target = 30;
    const remaining = target - mins;
    return { mins, remaining, target };
  };

  const sentimentForConvo = (convo: Conversation) => {
    const positive = ['love','great','good','nice','thanks','thank you','interested','ready','okay','ok','perfect'];
    const negative = ['bad','angry','complain','complaint','expensive','too much','hate','not interested','no','never'];
    let score = 0;
    convo.messages.forEach(m => {
      if (m.role !== 'user') return;
      const t = (m.content || '').toLowerCase();
      positive.forEach(p => { if (t.includes(p)) score++; });
      negative.forEach(n => { if (t.includes(n)) score--; });
    });
    const label = score > 1 ? 'Positive' : score < -1 ? 'Negative' : 'Neutral';
    return { score, label };
  };

  const lastIntentForConvo = (sid: string) => {
    const intent = leadIntentForSession(sid);
    return intent && intent !== 'unknown' ? intent : '—';
  };

  const leadEmailForConvo = (convo: Conversation) => {
    for (let i = convo.messages.length - 1; i >= 0; i--) {
      const m = convo.messages[i];
      if (m.role !== 'user') continue;
      const email = parseEmailFromText(m.content || '');
      if (email) return email;
    }
    return undefined;
  };

  const tagBadgeClass = (tag: string) => {
    const hash = tag.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 5;
    const map = [
      'bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/30',
      'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
      'bg-purple-500/20 text-purple-300 border border-purple-500/30',
      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    ];
    return map[hash];
  };

  const filteredConversations = conversations.filter(c => {
    if (leadFilter !== 'all' && leadTempForSession(c.session_id) !== leadFilter) return false;
    if (convoStatusFilter !== 'all' && convoStatusForSession(c) !== convoStatusFilter) return false;
    if (convoTagFilter !== 'all' && !(tags[c.session_id] || []).includes(convoTagFilter)) return false;
    if (search) {
      const s = search.toLowerCase();
      const inMessages = c.messages.some(m => (m.content || '').toLowerCase().includes(s));
      if (!c.session_id.toLowerCase().includes(s) && !inMessages) return false;
    }
    if (dateFrom) {
      const df = new Date(dateFrom);
      if (new Date(c.last_message_at) < df) return false;
    }
    if (dateTo) {
      const dt = new Date(dateTo);
      dt.setHours(23,59,59,999);
      if (new Date(c.last_message_at) > dt) return false;
    }
    return true;
  }).sort((a, b) => {
    const ap = pinnedConvos[a.session_id] ? 1 : 0;
    const bp = pinnedConvos[b.session_id] ? 1 : 0;
    if (ap !== bp) return bp - ap;
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
  });

  const uniqueTags = Array.from(new Set(Object.values(tags).flat())).sort();
  const unreadCount = conversations.filter(c => new Date(c.last_message_at).getTime() > new Date(readMap[c.session_id] || lastChecked).getTime()).length;
  const statusCounts = conversations.reduce<Record<string, number>>((acc, c) => {
    const s = convoStatusForSession(c);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const hotLeads = conversations.filter(c => leadTempForSession(c.session_id) === 'hot');

  const topModels = (() => {
    const counts: Record<string, number> = {};
    const models = CAR_DATABASE.map(c => `${c.brand} ${c.model}`.toLowerCase());
    conversations.forEach(c => {
      c.messages.forEach(m => {
        const t = (m.content || '').toLowerCase();
        models.forEach((name, idx) => {
          if (t.includes(name)) counts[name] = (counts[name] || 0) + 1;
        });
      });
    });
    return Object.entries(counts)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,5)
      .map(([name,count])=>({ name, count }));
  })();

  const scheduleReminder = () => {
    if (!selectedConvo || !reminderWhen) return;
    const entry: Reminder = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      session_id: selectedConvo.session_id,
      when: reminderWhen,
      note: reminderNote.trim(),
      created_at: new Date().toISOString(),
    };
    setReminders(prev => [entry, ...prev].slice(0, 500));
    setReminderNote('');
    setReminderWhen('');
    addAudit('reminder_scheduled', entry.note || 'follow-up', selectedConvo.session_id);
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  };

  const exportConversation = (convo: Conversation) => {
    const safe = convo.messages.map(m => ({
      role: m.role,
      content: m.content,
      created_at: m.created_at,
    }));
    exportJSON(safe, `conversation-${convo.session_id}.json`);
    addAudit('conversation_exported', 'json', convo.session_id);
  };

  const exportConversationText = (convo: Conversation) => {
    const lines = convo.messages.map(m => `${m.role === 'user' ? 'Client' : 'Abena'}: ${m.content}`);
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${convo.session_id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addAudit('conversation_exported', 'text', convo.session_id);
  };

  const exportConversationPdf = (convo: Conversation) => {
    const lines = convo.messages.map(m => `${m.role === 'user' ? 'Client' : 'Abena'} [${new Date(m.created_at).toLocaleString()}]: ${m.content}`);
    const html = `
      <html>
        <head>
          <title>Conversation ${convo.session_id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 18px; margin: 0 0 12px; }
            pre { white-space: pre-wrap; font-size: 12px; line-height: 1.4; }
          </style>
        </head>
        <body>
          <h1>Conversation ${convo.session_id}</h1>
          <pre>${lines.join('\n')}</pre>
        </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
    addAudit('conversation_exported', 'pdf', convo.session_id);
  };

  const exportSelectedConversations = (format: 'json' | 'text') => {
    const ids = Object.keys(selectedConvoIds).filter(k => selectedConvoIds[k]);
    const list = conversations.filter(c => ids.includes(c.session_id));
    if (list.length === 0) return;
    if (format === 'json') {
      const data = list.map(c => ({
        session_id: c.session_id,
        started_at: c.started_at,
        last_message_at: c.last_message_at,
        messages: c.messages.map(m => ({ role: m.role, content: m.content, created_at: m.created_at })),
      }));
      exportJSON(data, `conversations-bulk-${Date.now()}.json`);
    } else {
      const blocks = list.map(c => {
        const header = `Session ${c.session_id}\nStarted: ${c.started_at}\nLast: ${c.last_message_at}\n`;
        const body = c.messages.map(m => `${m.role === 'user' ? 'Client' : 'Abena'}: ${m.content}`).join('\n');
        return `${header}${body}`;
      });
      const blob = new Blob([blocks.join('\n\n---\n\n')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversations-bulk-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const toIcsDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const downloadIcs = (filename: string, body: string) => {
    const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  const exportReminderIcs = (r: Reminder) => {
    const start = new Date(r.when);
    const end = new Date(start.getTime() + 30 * 60000);
    const uid = `${r.id}@drivemond`;
    const summary = `Follow-up: ${r.note || 'Client reminder'}`;
    const description = `Session ${r.session_id}`;
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Drivemond//Admin//EN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${toIcsDate(new Date())}`,
      `DTSTART:${toIcsDate(start)}`,
      `DTEND:${toIcsDate(end)}`,
      `SUMMARY:${summary.replace(/\n/g, ' ')}`,
      `DESCRIPTION:${description}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    downloadIcs(`reminder-${r.session_id.slice(0, 8)}-${r.id}.ics`, ics);
    addAudit('reminder_exported', 'ics', r.session_id);
  };
  const exportUpcomingRemindersIcs = (sid: string) => {
    const list = reminders.filter(r => r.session_id === sid && !r.done);
    if (list.length === 0) return;
    const events = list.map(r => {
      const start = new Date(r.when);
      const end = new Date(start.getTime() + 30 * 60000);
      const uid = `${r.id}@drivemond`;
      const summary = `Follow-up: ${r.note || 'Client reminder'}`;
      const description = `Session ${r.session_id}`;
      return [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${toIcsDate(new Date())}`,
        `DTSTART:${toIcsDate(start)}`,
        `DTEND:${toIcsDate(end)}`,
        `SUMMARY:${summary.replace(/\n/g, ' ')}`,
        `DESCRIPTION:${description}`,
        'END:VEVENT',
      ].join('\r\n');
    }).join('\r\n');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Drivemond//Admin//EN',
      events,
      'END:VCALENDAR',
    ].join('\r\n');
    downloadIcs(`reminders-${sid.slice(0, 8)}.ics`, ics);
    addAudit('reminders_exported', 'ics', sid);
  };

  const openConversationFromEvent = (sid: string) => {
    const convo = conversations.find(c => c.session_id === sid) || null;
    if (convo) setSelectedConvo(convo);
    setTab('conversations');
    setSelectedEvent(null);
  };

  return (
    <div className="min-h-screen bg-[#0b141a] text-white">
      {/* Event Detail Popup */}
      {selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onOpenConversation={openConversationFromEvent}
        />
      )}

      {/* Top Bar */}
      <div className="bg-[#1f2c34] border-b border-[#2f3b43] px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">🚗 Drivemond Admin</h1>
          <p className="text-gray-400 text-xs">Last refresh: {lastRefresh.toLocaleTimeString()}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className={`text-xs px-3 py-1.5 rounded-lg bg-[#2a3942] hover:bg-[#3d4f5c] transition ${loading ? 'opacity-50' : ''}`}>
            {loading ? '⟳ Refreshing...' : '⟳ Refresh'}
          </button>
          <button onClick={() => { sessionStorage.removeItem('__drv_adm__'); setAuthed(false); }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition">
            <LogOut className="w-3.5 h-3.5" /> Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2f3b43] bg-[#1f2c34]">
        {(['overview', 'conversations', 'events', 'inventory'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-6 py-3 text-sm font-medium capitalize transition ${tab === t ? 'text-[#25D366] border-b-2 border-[#25D366]' : 'text-gray-400 hover:text-white'}`}>
            {t === 'overview' ? '📊 Overview' : t === 'conversations' ? '💬 Conversations' : t === 'events' ? '⚡ Events' : '🚘 Inventory'}
          </button>
        ))}
      </div>

      <div className="p-6 max-w-7xl mx-auto">

        {/* â”€â”€ OVERVIEW â”€â”€ */}
        {tab === 'overview' && (
          <div>
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-lg px-3 py-2 flex items-center gap-2">
                <Search className="w-4 h-4 text-[#8696a0]" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search sessions or messages"
                  className="bg-transparent text-sm text-white outline-none w-full"
                />
              </div>
              <select value={leadFilter} onChange={e => setLeadFilter(e.target.value as any)} className="bg-[#0f3d2e] border border-[#2f5b48] rounded-lg px-3 py-2 text-sm text-[#e6e9ee] focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366]/60">
                <option value="all">All leads</option>
                <option value="hot">Hot leads</option>
                <option value="warm">Warm leads</option>
                <option value="cold">Cold leads</option>
              </select>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-[#1f2c34] border border-[#2f3b43] rounded-lg px-3 py-2 text-sm text-white" />
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-[#1f2c34] border border-[#2f3b43] rounded-lg px-3 py-2 text-sm text-white" />
            </div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-gray-300 font-semibold">Performance Overview</div>
              <div className="flex items-center gap-2">
                {(['today','7d','30d','90d'] as const).map(p => (
                  <button key={p} onClick={() => setPeriod(p)} className={`text-xs px-3 py-1.5 rounded-lg ${period===p?'bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30':'bg-[#2a3942] text-white hover:bg-[#3d4f5c]'}`}>{p}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-8 gap-4 mb-6">
              {[
                { label: 'Total Sessions', value: periodConvos.length, delta: kpiDelta.sessions, data: sparkSessions, color: 'text-white' },
                { label: 'Messages', value: periodMessageCount, delta: kpiDelta.messages, data: sparkEvents, color: 'text-white' },
                { label: 'Bookings', value: periodBookings.length, delta: kpiDelta.bookings, data: sparkBookings, color: 'text-green-400' },
                { label: 'Active Now', value: activeNow, delta: null, data: sparkSessions, color: 'text-white' },
                { label: 'Hot Leads', value: leadBuckets.hot, delta: kpiDelta.hot, data: sparkEvents, color: 'text-red-400' },
                { label: 'Warm Leads', value: leadBuckets.warm, delta: kpiDelta.warm, data: sparkEvents, color: 'text-yellow-400' },
                { label: 'Cold Leads', value: leadBuckets.cold, delta: kpiDelta.cold, data: sparkEvents, color: 'text-blue-400' },
                { label: 'Median Response (s)', value: medianResponseSec, delta: null, data: sparkEvents, color: 'text-white', goal: goalResponseSec },
              ].map((card,i) => (
                <div key={i} className="bg-[#111b21]/80 backdrop-blur rounded-xl p-4 border border-[#2f3b43] shadow-lg hover:shadow-xl transition">
                  <div className="flex items-baseline justify-between">
                    <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                    {card.delta !== null && card.delta !== undefined && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${card.delta>=0?'bg-[#00a884]/20 text-[#00a884]':'bg-red-500/20 text-red-400'}`}>
                        {card.delta>=0?'▲':'▼'} {Math.abs(card.delta)}% · Today vs 7d
                      </span>
                    )}
                  </div>
                  <div className="text-gray-400 text-xs mt-1">{card.label}</div>
                  <div className="mt-3 h-10">
                    <svg width="100%" height="40">
                      {(() => {
                        const d = card.data; if (!d || d.length < 2) return null;
                        const max = Math.max(...d); if (!max) return null;
                        const step = 100/(d.length-1);
                        const points = d.map((v,idx)=>`${idx*step},${40 - (v/max)*40}`).join(' ');
                        return <polyline points={points} fill="none" stroke={card.color.includes('green')?'#25D366':'#8696a0'} strokeWidth="2" />;
                      })()}
                    </svg>
                  </div>
                  {card.goal && (
                    <div className="mt-2">
                      <div className="h-1 bg-[#0b141a] rounded-full overflow-hidden border border-[#2f3b43]">
                        <div
                          className={`h-1 ${card.value <= card.goal ? 'bg-[#00a884]' : 'bg-yellow-500'}`}
                          style={{ width: `${Math.min(100, (card.goal / Math.max(card.value, 1)) * 100)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-gray-500 mt-1">Goal {card.goal}s</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
              <div className="lg:col-span-6 bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-300">Revenue Trend (Last 14 Days)</h3>
                  <span className="text-xs text-gray-500">₵{Number(revenueSpark14d.reduce((a, b) => a + b, 0)).toLocaleString()}</span>
                </div>
                <div className="h-28">
                  <svg width="100%" height="112">
                    {(() => {
                      const d = revenueSpark14d; if (!d || d.length < 2) return null;
                      const max = Math.max(...d); if (!max) return null;
                      const step = 100/(d.length-1);
                      const pts = d.map((v,i)=>`${i*step},${112 - (v/max)*90}`).join(' ');
                      return <polyline points={pts} fill="none" stroke="#25D366" strokeWidth="2" />;
                    })()}
                  </svg>
                </div>
                <div className="mt-2 text-[10px] text-gray-500">Based on booking values. Auto-fills missing prices from inventory average.</div>
              </div>

              <div className="lg:col-span-3 bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Lead Temperature</h3>
                <div className="flex items-center gap-4">
                  <div
                    className="w-28 h-28 rounded-full"
                    style={{ background: `conic-gradient(#ef4444 0% ${leadTempDonut.hotPct}%, #f59e0b ${leadTempDonut.hotPct}% ${leadTempDonut.hotPct + leadTempDonut.warmPct}%, #3b82f6 ${leadTempDonut.hotPct + leadTempDonut.warmPct}% 100%)` }}
                  />
                  <div className="space-y-2 text-xs text-gray-400">
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500" /> Hot {leadBuckets.hot}</div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Warm {leadBuckets.warm}</div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" /> Cold {leadBuckets.cold}</div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Bookings This Week</h3>
                <div className="flex items-end justify-between gap-2">
                  {bookingsWeekStrip.map(d => {
                    const label = new Date(d.key).toLocaleDateString(undefined, { weekday: 'short' });
                    const height = Math.max(8, d.count * 10);
                    return (
                      <div key={d.key} className="flex flex-col items-center gap-1">
                        <div className="text-[10px] text-gray-500">{d.count}</div>
                        <div className="w-5 rounded-md bg-[#00a884]" style={{ height }} />
                        <div className="text-[10px] text-gray-500">{label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
              <div className="lg:col-span-6 bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-300">Daily Lead Acquisition (30 days)</h3>
                  <span className="text-xs text-gray-500">Growth vs last month: {growthVsLastMonth.pct}%</span>
                </div>
                <div className="h-28">
                  <svg width="100%" height="112">
                    {(() => {
                      const d = dailyLeads30; if (!d || d.length < 2) return null;
                      const max = Math.max(...d); if (!max) return null;
                      const step = 100/(d.length-1);
                      const pts = d.map((v,i)=>`${i*step},${112 - (v/max)*90}`).join(' ');
                      return <polyline points={pts} fill="none" stroke="#53bdeb" strokeWidth="2" />;
                    })()}
                  </svg>
                </div>
                <div className="mt-2 text-[10px] text-gray-500">Sparkline shows new sessions per day.</div>
              </div>

              <div className="lg:col-span-3 bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Bookings by Weekday</h3>
                <div className="grid grid-cols-7 gap-1">
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => {
                    const count = bookingsByWeekday[i] || 0;
                    const max = Math.max(...bookingsByWeekday, 1);
                    const pct = Math.round((count / max) * 100);
                    return (
                      <div key={d} className="flex flex-col items-center gap-1">
                        <div
                          className="w-6 h-6 rounded-md border border-[#2f3b43]"
                          style={{ background: `rgba(37,211,102,${Math.max(0.12, pct/100)})` }}
                          title={`${d}: ${count}`}
                        />
                        <div className="text-[9px] text-gray-500">{d}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-3 bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Monthly Booking Target</h3>
                <div className="flex items-center gap-4">
                  <div
                    className="w-24 h-24 rounded-full"
                    style={{ background: `conic-gradient(#25D366 0% ${monthlyProgressPct}%, #2a3942 ${monthlyProgressPct}% 100%)` }}
                  />
                  <div className="space-y-1 text-xs text-gray-400">
                    <div>Booked: <span className="text-white font-semibold">{monthlyBookings}</span></div>
                    <div>Target: <span className="text-white font-semibold">{monthlyTarget}</span></div>
                    <div>Progress: <span className="text-[#25D366] font-semibold">{monthlyProgressPct}%</span></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
              <div className="lg:col-span-4 bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Quote → Booking Conversion</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2">
                    <span className="text-gray-400">Quote sessions</span>
                    <span className="text-white font-semibold">{quoteToBookingRate.quotes}</span>
                  </div>
                  <div className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2">
                    <span className="text-gray-400">Booked from quotes</span>
                    <span className="text-white font-semibold">{quoteToBookingRate.bookedFromQuotes}</span>
                  </div>
                  <div className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2">
                    <span className="text-gray-400">Conversion</span>
                    <span className="text-[#25D366] font-semibold">{quoteToBookingRate.pct}%</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Demo → Hand‑off Ratio</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2">
                    <span className="text-gray-400">Demo sessions</span>
                    <span className="text-white font-semibold">{demoToHandoffRatio.demo}</span>
                  </div>
                  <div className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2">
                    <span className="text-gray-400">Hand‑offs</span>
                    <span className="text-white font-semibold">{demoToHandoffRatio.handoff}</span>
                  </div>
                  <div className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2">
                    <span className="text-gray-400">Ratio</span>
                    <span className="text-[#25D366] font-semibold">{demoToHandoffRatio.pct}%</span>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Avg Time: First Chat → Booking</h3>
                <div className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-3 text-xs">
                  <span className="text-gray-400">Average</span>
                  <span className="text-white font-semibold">{avgTimeToBookingHours} hrs</span>
                </div>
                <div className="text-[10px] text-gray-500 mt-2">Based on sessions with bookings.</div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
              <div className="lg:col-span-5 bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-300">Leads Funnel</h3>
                  <span className="text-xs text-gray-500">{period.toUpperCase()}</span>
                </div>
                <div className="space-y-3">
                  {(() => {
                    const stages = [
                      { label: 'Total Leads', value: periodEvents.length, color: 'bg-[#00a884]' },
                      { label: 'Hot Leads', value: leadBuckets.hot, color: 'bg-red-500' },
                      { label: 'Booked', value: periodBookings.length, color: 'bg-purple-500' },
                    ];
                    return stages.map((s, idx) => {
                      const prev = idx === 0 ? null : stages[idx - 1].value;
                      const drop = prev !== null ? Math.max(prev - s.value, 0) : 0;
                      return (
                        <div key={s.label}>
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>{s.label}</span>
                            <span>{s.value}</span>
                          </div>
                          <div className="h-2 bg-[#111b21] rounded-full overflow-hidden">
                            <div className={`h-2 ${s.color} rounded-full`} style={{ width: `${periodEvents.length>0? Math.max((s.value/periodEvents.length)*100, s.value>0?5:0):0}%` }} />
                          </div>
                          {idx > 0 && (
                            <div className="text-[10px] text-gray-500 mt-1">Drop‑off: {drop}</div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
              <div className="lg:col-span-4 bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-300">Revenue Projection</h3>
                  <span className="text-xs text-gray-500">{period.toUpperCase()}</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Est. Revenue</span>
                    <span className="text-sm text-white font-semibold">₵{Number(bookingRevenue || 0).toLocaleString()}</span>
                  </div>
                  <div className="bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Avg Booking</span>
                    <span className="text-sm text-white font-semibold">₵{Number(bookingValueAvg || 0).toLocaleString()}</span>
                  </div>
                  <div className="bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2 flex items-center justify-between">
                    <span className="text-xs text-gray-400">30‑Day Projection</span>
                    <span className="text-sm text-[#25D366] font-semibold">₵{Number(bookingProjection30d || 0).toLocaleString()}</span>
                  </div>
                  <div className="text-[11px] text-gray-500">
                    Based on {periodBookings.length} booking(s) and current inventory pricing.
                  </div>
                </div>
              </div>
              <div className="lg:col-span-4 bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-300">Booking Revenue</h3>
                  <div className="flex gap-2">
                    {(['7d','30d','90d'] as const).map(p=>(
                      <button key={p} onClick={()=>setPeriod(p)} className={`text-xs px-2 py-1 rounded ${period===p?'bg-[#00a884]/20 text-[#00a884]':'bg-[#2a3942] text-white hover:bg-[#3d4f5c]'}`}>{p}</button>
                    ))}
                  </div>
                </div>
                <div className="h-36">
                  <svg width="100%" height="144">
                    {(() => {
                      const d = bucketByDay(periodBookings);
                      if (!d || d.length < 2) return null;
                      const max = Math.max(...d);
                      if (!max) return null;
                      const step = 100/(d.length-1);
                      const pts = d.map((v,i)=>`${i*step},${144 - (v/max)*120}`).join(' ');
                      return <polyline points={pts} fill="none" stroke="#25D366" strokeWidth="2" />;
                    })()}
                  </svg>
                </div>
              </div>
              <div className="lg:col-span-3 bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Lead Sources</h3>
                <div className="flex items-center gap-4">
                  <div className="w-28 h-28 rounded-full" style={{ background: `conic-gradient(#25D366 0% ${leadSourceCounts.whatsapp/(periodEvents.length||1)*100}%, #f59e0b ${leadSourceCounts.whatsapp/(periodEvents.length||1)*100}% ${(leadSourceCounts.whatsapp+leadSourceCounts.walkin)/(periodEvents.length||1)*100}%, #3b82f6 ${(leadSourceCounts.whatsapp+leadSourceCounts.walkin)/(periodEvents.length||1)*100}% ${(leadSourceCounts.whatsapp+leadSourceCounts.walkin+leadSourceCounts.website)/(periodEvents.length||1)*100}%, #a78bfa ${(leadSourceCounts.whatsapp+leadSourceCounts.walkin+leadSourceCounts.website)/(periodEvents.length||1)*100}% 100%)` }} />
                  <div className="space-y-2 text-xs text-gray-400">
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#25D366]" /> WhatsApp {leadSourceCounts.whatsapp}</div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> Walk-in {leadSourceCounts.walkin}</div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#3b82f6]" /> Website {leadSourceCounts.website}</div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#a78bfa]" /> Referral {leadSourceCounts.referral}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Top Intents</h3>
                {intentsRanked.length === 0 ? (
                  <p className="text-gray-500 text-sm">No intent data yet.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {intentsRanked.map((it, i) => (
                      <div key={i} className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2">
                        <span className="text-gray-300 capitalize">{it.intent.replace(/_/g, ' ')}</span>
                        <span className="text-white font-semibold">{it.pct}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5 lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-300">Conversion Funnel</h3>
                  <span className="text-xs text-gray-500">{period.toUpperCase()}</span>
                </div>
                <div className="space-y-3">
                  {funnel.map((f, idx) => {
                    const max = funnel[0]?.value || 1;
                    const pct = Math.round((f.value / max) * 100);
                    const prev = idx === 0 ? null : funnel[idx - 1].value;
                    const drop = prev !== null ? Math.max(prev - f.value, 0) : 0;
                    return (
                      <div key={f.label} className="bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>{f.label}</span>
                          <span className="text-white font-semibold">{f.value}</span>
                        </div>
                        <div className="mt-2 h-2 bg-[#111b21] rounded-full overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${idx === 0 ? 'bg-[#25D366]' : idx === 1 ? 'bg-[#f59e0b]' : idx === 2 ? 'bg-[#ef4444]' : 'bg-[#a78bfa]'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {idx > 0 && (
                          <div className="mt-1 text-[10px] text-gray-500">Drop‑off: {drop}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Conversion Rates</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2">
                    <span className="text-gray-400">Warm → Hot</span>
                    <span className="text-white font-semibold">
                      {leadBuckets.warm ? Math.round((leadBuckets.hot / leadBuckets.warm) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2">
                    <span className="text-gray-400">Hot → Booked</span>
                    <span className="text-white font-semibold">
                      {leadBuckets.hot ? Math.round((periodBookings.length / leadBuckets.hot) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2">
                    <span className="text-gray-400">Session → Booked</span>
                    <span className="text-white font-semibold">
                      {periodConvos.length ? Math.round((periodBookings.length / periodConvos.length) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Top Locations</h3>
                {topLocations.length === 0 ? (
                  <p className="text-gray-500 text-sm">No location data yet.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {topLocations.map(([loc, count], i) => (
                      <div key={i} className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2">
                        <span className="text-gray-300">{loc}</span>
                        <span className="text-white font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Top Requested Models</h3>
                {topModels.length === 0 ? (
                  <p className="text-gray-500 text-sm">No model data yet.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {topModels.map((m, i) => {
                      const max = topModels[0]?.count || 1;
                      const pct = Math.round((m.count / max) * 100);
                      return (
                        <button
                          key={i}
                          onClick={() => { setSearch(m.name); setTab('conversations'); }}
                          className="w-full text-left bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2 hover:bg-[#2a3942] transition"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-gray-300 capitalize">{m.name}</span>
                            <span className="text-white font-semibold">{m.count}</span>
                          </div>
                          <div className="mt-2 h-2 bg-[#111b21] rounded-full overflow-hidden">
                            <div className="h-2 bg-[#25D366]" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="mt-1 text-[10px] text-gray-500">Click to filter conversations</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Most Requested Colors</h3>
                {mostRequestedColors.length === 0 ? (
                  <p className="text-gray-500 text-sm">No color data yet.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {mostRequestedColors.map(([color, count], i) => (
                      <div key={i} className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2">
                        <span className="text-gray-300 capitalize">{color}</span>
                        <span className="text-white font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Hot Leads Follow-up */}
            <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5 mb-6">
              <h2 className="font-semibold mb-4 text-gray-300">Hot Leads Needing Follow‑Up</h2>
              {hotLeadsFollowUp.length === 0 ? (
                <p className="text-gray-500 text-sm">No hot leads waiting for follow‑up.</p>
              ) : (
                <div className="space-y-2">
                  {hotLeadsFollowUp.map(h => (
                    <div key={h.session_id} className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium">Session {h.session_id.slice(0, 8)}...</p>
                        <p className="text-gray-500 text-xs truncate">{h.messages[h.messages.length-1]?.content?.slice(0, 60)}</p>
                      </div>
                      <button
                        onClick={() => { setSelectedConvo(h); setTab('conversations'); }}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 transition border border-[#25D366]/30"
                      >
                        <PhoneCall className="w-3 h-3" /> Open
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Export Section */}
            <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-300">Data & Reports Center</h2>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400">Auto email</label>
                  <input type="checkbox" className="h-4 w-4 accent-[#00a884]" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(['events', 'bookings', 'conversations'] as const).map(type => (
                  <div key={type} className="bg-[#0b141a] rounded-xl p-4">
                    <p className="text-white font-medium capitalize mb-1">{type}</p>
                    <p className="text-gray-500 text-xs mb-3">
                      {type === 'events' ? `${events.length} records` : type === 'bookings' ? `${bookingEvents.length} records` : `${conversations.length} records`}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => handleExport('json', type)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#2a3942] hover:bg-[#3d4f5c] text-white text-xs py-2 rounded-lg transition font-medium">
                        <Download className="w-3 h-3" /> JSON
                      </button>
                      <button onClick={() => handleExport('csv', type)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] text-xs py-2 rounded-lg transition font-medium border border-[#25D366]/30">
                        <Download className="w-3 h-3" /> CSV
                      </button>
                      <select className="text-xs px-2 py-2 rounded-lg bg-[#0f3d2e] text-[#e6e9ee] border border-[#2f5b48] focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366]/60">
                        <option>CSV</option>
                        <option>JSON</option>
                        <option>Excel</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Events */}
            <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5">
              <h2 className="font-semibold mb-4 text-gray-300">Recent Events <span className="text-gray-500 text-xs font-normal ml-1">(click for details)</span></h2>
              {events.length === 0 ? (
                <p className="text-gray-500 text-sm">No events yet.</p>
              ) : (
                <div className="space-y-1">
                  {events.slice(0, 20).map((evt, i) => (
                    <button key={i} onClick={() => setSelectedEvent(evt)}
                      className="w-full flex items-center justify-between py-2.5 px-3 rounded-lg border-b border-[#2f3b43] last:border-0 hover:bg-[#2a3942] transition text-left group">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl shrink-0">{EVENT_ICONS[evt.event_type] || '📌'}</span>
                        <div className="min-w-0">
                          <span className="text-sm font-medium capitalize">{evt.event_type.replace(/_/g, ' ')}</span>
                          <span className="text-gray-500 text-xs ml-2 hidden sm:inline">Session: {evt.session_id.slice(0, 8)}...</span>
                          <p className="text-gray-500 text-xs truncate">{evt.event_data ? JSON.stringify(evt.event_data).slice(0, 60) : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {evt.lead_temperature && evt.lead_temperature !== 'unknown' && (
                          <span className={`text-xs px-2 py-0.5 rounded-full hidden sm:block ${TEMP_COLORS[evt.lead_temperature] || ''}`}>{evt.lead_temperature}</span>
                        )}
                        <span className="text-gray-500 text-xs">{timeAgo(evt.created_at)}</span>
                        <span className="text-gray-600 group-hover:text-gray-400 text-xs">â€º</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Audit Log */}
            <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5 mt-6">
              <h2 className="font-semibold mb-4 text-gray-300">Audit Log</h2>
              {auditLog.length === 0 ? (
                <p className="text-gray-500 text-sm">No admin actions yet.</p>
              ) : (
                <div className="space-y-2">
                  {auditLog.slice(0, 20).map(a => (
                    <div key={a.id} className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-white text-xs font-medium">{a.action.replace(/_/g, ' ')}</p>
                        <p className="text-gray-500 text-[11px] truncate">
                          {a.detail || '—'} {a.session_id ? `· ${a.session_id.slice(0, 8)}...` : ''}
                        </p>
                      </div>
                      <span className="text-gray-500 text-[11px]">{timeAgo(a.at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* â”€â”€ CONVERSATIONS â”€â”€ */}
        {tab === 'conversations' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: 'calc(100vh - 200px)' }}>
            <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-xl overflow-y-auto">
              <div className="p-4 border-b border-[#2f3b43] sticky top-0 bg-[#1f2c34] space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-gray-300">All Conversations ({filteredConversations.length})</h2>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => {
                        const now = new Date().toISOString();
                        const next: Record<string, string> = {};
                        conversations.forEach(c => { next[c.session_id] = now; });
                        setReadMap(next);
                      }}
                      className="text-[10px] px-2 py-1 rounded-md bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/30"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-[#111b21] border border-[#2f3b43] rounded-lg px-3 py-1.5 flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-[#8696a0]" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search"
                      className="bg-transparent text-xs text-white outline-none w-full"
                    />
                  </div>
                  <select value={leadFilter} onChange={e => setLeadFilter(e.target.value as any)} className="bg-[#0f3d2e] border border-[#2f5b48] rounded-lg px-2 py-1.5 text-xs text-[#e6e9ee] focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366]/60">
                    <option value="all">All</option>
                    <option value="hot">Hot</option>
                    <option value="warm">Warm</option>
                    <option value="cold">Cold</option>
                  </select>
                  <select value={convoStatusFilter} onChange={e => setConvoStatusFilter(e.target.value as any)} className="bg-[#0f3d2e] border border-[#2f5b48] rounded-lg px-2 py-1.5 text-xs text-[#e6e9ee] focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366]/60">
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="pending">Pending</option>
                    <option value="closed">Closed</option>
                  </select>
                  <select value={convoTagFilter} onChange={e => setConvoTagFilter(e.target.value)} className="bg-[#0f3d2e] border border-[#2f5b48] rounded-lg px-2 py-1.5 text-xs text-[#e6e9ee] focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366]/60">
                    <option value="all">All Tags</option>
                    {uniqueTags.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {(['open','pending','closed'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setConvoStatusFilter(s)}
                      className={`px-2 py-1 rounded-full border ${convoStatusFilter === s ? 'bg-[#00a884]/20 text-[#00a884] border-[#00a884]/30' : 'bg-[#2a3942] text-[#aebac1] border-[#3d4f5c]'}`}
                    >
                      {s.toUpperCase()} ({statusCounts[s] || 0})
                    </button>
                  ))}
                </div>
                {unreadCount > 0 && (
                  <div className="text-[11px] text-gray-400">
                    Unread: <span className="text-[#25D366] font-semibold">{unreadCount}</span>
                  </div>
                )}
                {Object.values(selectedConvoIds).some(Boolean) && (
                  <div className="bg-[#0b141a] border border-[#2f3b43] rounded-lg p-2 text-xs flex flex-wrap items-center gap-2">
                    <span className="text-gray-400">Bulk actions:</span>
                    <button
                      onClick={() => {
                        const now = new Date().toISOString();
                        const next = { ...readMap };
                        Object.keys(selectedConvoIds).forEach(id => {
                          if (selectedConvoIds[id]) next[id] = now;
                        });
                        setReadMap(next);
                      }}
                      className="px-2 py-1 rounded bg-[#2a3942] text-white"
                    >
                      Mark read
                    </button>
                    <input
                      value={bulkTag}
                      onChange={e => setBulkTag(e.target.value)}
                      placeholder="Tag"
                      className="bg-[#111b21] border border-[#2f3b43] rounded px-2 py-1 text-xs text-white"
                    />
                    <button
                      onClick={() => {
                        if (!bulkTag.trim()) return;
                        setTags(prev => {
                          const next = { ...prev };
                          Object.keys(selectedConvoIds).forEach(id => {
                            if (!selectedConvoIds[id]) return;
                            next[id] = [...(next[id] || []), bulkTag.trim()];
                          });
                          return next;
                        });
                        setBulkTag('');
                      }}
                      className="px-2 py-1 rounded bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/30"
                    >
                      Add tag
                    </button>
                    <button onClick={() => exportSelectedConversations('json')} className="px-2 py-1 rounded bg-[#2a3942] text-white">
                      Export JSON
                    </button>
                    <button onClick={() => exportSelectedConversations('text')} className="px-2 py-1 rounded bg-[#2a3942] text-white">
                      Export Text
                    </button>
                    <button
                      onClick={() => setSelectedConvoIds({})}
                      className="px-2 py-1 rounded bg-[#3d4f5c] text-white"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
              {filteredConversations.length === 0 ? <p className="text-gray-500 text-sm p-4">No conversations yet.</p>
                : filteredConversations.map(convo => (
                  <button key={convo.session_id} onClick={() => {
                    setSelectedConvo(convo);
                    setReadMap(prev => ({ ...prev, [convo.session_id]: new Date().toISOString() }));
                  }}
                    className={`w-full text-left px-4 py-3 border-b border-[#2f3b43] hover:bg-[#2a3942] transition ${selectedConvo?.session_id === convo.session_id ? 'bg-[#2a3942]' : ''}`}>
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-white flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!selectedConvoIds[convo.session_id]}
                          onChange={(e) => {
                            e.stopPropagation();
                            setSelectedConvoIds(prev => ({ ...prev, [convo.session_id]: e.target.checked }));
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="accent-[#00a884]"
                        />
                        Session {convo.session_id.slice(0, 8)}...
                        {new Date(convo.last_message_at).getTime() > new Date(readMap[convo.session_id] || lastChecked).getTime() && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30">
                            Unread
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{timeAgo(convo.last_message_at)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPinnedConvos(prev => ({ ...prev, [convo.session_id]: !prev[convo.session_id] }));
                          }}
                          className={`text-[10px] px-2 py-0.5 rounded-full border ${pinnedConvos[convo.session_id] ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : 'bg-[#2a3942] text-gray-300 border-[#3d4f5c]'}`}
                        >
                          {pinnedConvos[convo.session_id] ? 'Pinned' : 'Pin'}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">{convo.message_count} messages</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0b141a] border border-[#2f3b43] text-gray-300">
                        {convoStageForSession(convo.session_id)}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0b141a] border border-[#2f3b43] text-gray-300">
                        Intent: {lastIntentForConvo(convo.session_id)}
                      </span>
                      {(() => {
                        const status = convoStatusForSession(convo);
                        const cls = status === 'open'
                          ? 'bg-[#00a884]/20 text-[#00a884] border-[#00a884]/30'
                          : status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
                            : 'bg-red-500/20 text-red-400 border-red-500/30';
                        return (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cls}`}>
                            {status.toUpperCase()}
                          </span>
                        );
                      })()}
                      {leadTempForSession(convo.session_id) !== 'unknown' && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${TEMP_COLORS[leadTempForSession(convo.session_id)] || ''}`}>
                          {leadTempForSession(convo.session_id)}
                        </span>
                      )}
                      {(() => {
                        const score = leadScoreForSession(convo.session_id);
                        if (score === undefined) return null;
                        const badge =
                          score >= 70
                            ? 'bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/30'
                            : score >= 40
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                              : 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
                        return (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${badge}`}>
                            Score {score}
                          </span>
                        );
                      })()}
                      {(() => {
                        const sla = slaCountdownForConvo(convo);
                        if (!sla) return null;
                        const overdue = sla.remaining < 0;
                        const cls = overdue
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : sla.remaining <= 5
                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/30';
                        return (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cls}`}>
                            SLA {overdue ? `${Math.abs(sla.remaining)}m overdue` : `${sla.remaining}m left`}
                          </span>
                        );
                      })()}
                      {(() => {
                        const s = sentimentForConvo(convo);
                        const cls = s.label === 'Positive'
                          ? 'bg-[#00a884]/20 text-[#00a884] border-[#00a884]/30'
                          : s.label === 'Negative'
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : 'bg-[#2a3942] text-gray-300 border-[#3d4f5c]';
                        return (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cls}`}>
                            {s.label}
                          </span>
                        );
                      })()}
                      {(() => {
                        const r = nextReminderForSession(convo.session_id);
                        if (!r) return null;
                        const due = new Date(r.when).getTime() <= Date.now();
                        return (
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${due ? 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30' : 'bg-[#2a3942] text-gray-200 border border-[#2f3b43]'}`}>
                            Next {new Date(r.when).toLocaleString()}
                          </span>
                        );
                      })()}
                    </div>
                    {(tags[convo.session_id] || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(tags[convo.session_id] || []).slice(0, 3).map((t, i) => (
                          <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full ${tagBadgeClass(t)}`}>{t}</span>
                        ))}
                        {(tags[convo.session_id] || []).length > 3 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2a3942] text-gray-300 border border-[#3d4f5c]">
                            +{(tags[convo.session_id] || []).length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {convo.messages[convo.messages.length - 1]?.content?.replace(/```[\s\S]*?```/g, '').trim().slice(0, 60)}...
                    </div>
                  </button>
                ))}
            </div>
            <div className="lg:col-span-2 bg-[#1f2c34] border border-[#2f3b43] rounded-xl overflow-y-auto flex flex-col">
              {!selectedConvo ? (
                <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Select a conversation to view</div>
              ) : (
                <>
                  <div className="p-4 border-b border-[#2f3b43] sticky top-0 bg-[#1f2c34]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="font-semibold text-gray-300">Session: {selectedConvo.session_id}</h2>
                        <p className="text-xs text-gray-500">Started {new Date(selectedConvo.started_at).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={convoStageForSession(selectedConvo.session_id)}
                          onChange={e => setStageOverride(prev => ({ ...prev, [selectedConvo.session_id]: e.target.value as any }))}
                          className="bg-[#0f3d2e] border border-[#2f5b48] rounded-md text-[11px] text-[#e6e9ee] px-2 py-1.5 focus:outline-none"
                        >
                          <option>Browsing</option>
                          <option>Interested</option>
                          <option>Booking</option>
                        </select>
                        <select
                          value={convoStatusForSession(selectedConvo)}
                          onChange={e => setStatusOverride(prev => ({ ...prev, [selectedConvo.session_id]: e.target.value as any }))}
                          className="bg-[#0f3d2e] border border-[#2f5b48] rounded-md text-[11px] text-[#e6e9ee] px-2 py-1.5 focus:outline-none"
                        >
                          <option value="open">Open</option>
                          <option value="pending">Pending</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <select
                        value={assignMap[selectedConvo.session_id] || 'Unassigned'}
                        onChange={e => setAssignMap(prev => ({ ...prev, [selectedConvo.session_id]: e.target.value }))}
                        className="bg-[#0b141a] border border-[#2f3b43] rounded-md text-[11px] text-gray-200 px-2 py-1.5"
                      >
                        <option>Unassigned</option>
                        <option>Abena</option>
                        <option>Kofi</option>
                        <option>Ama</option>
                        <option>Kwame</option>
                      </select>
                      {(() => {
                        const lead = buildLeadProfile(selectedConvo);
                        const email = leadEmailForConvo(selectedConvo);
                        const phone = lead.phone;
                        const wa = phone ? `https://wa.me/${phone.replace(/[^\d]/g,'')}` : '';
                        return (
                          <div className="flex items-center gap-2">
                            <a
                              href={phone ? `tel:${phone}` : '#'}
                              className={`text-[11px] px-3 py-1.5 rounded-lg border ${phone ? 'bg-[#2a3942] text-white border-[#3d4f5c]' : 'bg-[#0b141a] text-gray-500 border-[#2f3b43]'}`}
                            >
                              Call
                            </a>
                            <a
                              href={email ? `mailto:${email}` : '#'}
                              className={`text-[11px] px-3 py-1.5 rounded-lg border ${email ? 'bg-[#2a3942] text-white border-[#3d4f5c]' : 'bg-[#0b141a] text-gray-500 border-[#2f3b43]'}`}
                            >
                              Email
                            </a>
                            <a
                              href={wa || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-[11px] px-3 py-1.5 rounded-lg border ${phone ? 'bg-[#25D366]/20 text-[#25D366] border-[#25D366]/30' : 'bg-[#0b141a] text-gray-500 border-[#2f3b43]'}`}
                            >
                              WhatsApp
                            </a>
                          </div>
                        );
                      })()}
                      {(() => {
                        const booking = bookingEvents.find(b => b.session_id === selectedConvo.session_id);
                        if (!booking) return null;
                        return (
                          <button
                            onClick={() => setSelectedEvent(booking)}
                            className="text-[11px] px-3 py-1.5 rounded-lg bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/30"
                          >
                            View Booking
                          </button>
                        );
                      })()}
                    </div>
                    <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
                      <div className="bg-[#111b21] border border-[#2f3b43] rounded-lg p-3 lg:col-span-2">
                        <div className="text-[10px] text-gray-400 uppercase mb-2 flex items-center gap-1"><User className="w-3 h-3" /> Lead Summary</div>
                        {(() => {
                          const lead = buildLeadProfile(selectedConvo);
                          const intent = leadIntentForSession(selectedConvo.session_id);
                          const priority = leadPriorityForSession(selectedConvo);
                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                              <div className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-md px-2 py-1.5">
                                <span className="text-gray-400">Name</span>
                                <span className="text-white">{lead.name || 'Unknown'}</span>
                              </div>
                              <div className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-md px-2 py-1.5">
                                <span className="text-gray-400">Phone</span>
                                <span className="text-white">{lead.phone || 'Unknown'}</span>
                              </div>
                              <div className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-md px-2 py-1.5">
                                <span className="text-gray-400">Budget</span>
                                <span className="text-white">{lead.budget ? `GHS ${lead.budget.toLocaleString()}` : 'Unknown'}</span>
                              </div>
                              <div className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-md px-2 py-1.5">
                                <span className="text-gray-400">Type</span>
                                <span className="text-white">{lead.type || 'Unknown'}</span>
                              </div>
                              <div className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-md px-2 py-1.5">
                                <span className="text-gray-400">Intent</span>
                                <span className="text-white capitalize">{intent || 'Unknown'}</span>
                              </div>
                              <div className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-md px-2 py-1.5">
                                <span className="text-gray-400">Priority</span>
                                <span className="text-white">{priority || 'Unknown'}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="bg-[#111b21] border border-[#2f3b43] rounded-lg p-3">
                        <div className="text-[10px] text-gray-400 uppercase mb-2 flex items-center gap-1"><Bell className="w-3 h-3" /> Follow-up</div>
                        <div className="space-y-2">
                          <input
                            type="datetime-local"
                            value={reminderWhen}
                            onChange={e => setReminderWhen(e.target.value)}
                            className="w-full bg-[#0b141a] border border-[#2f3b43] rounded-md text-xs text-white px-2 py-1"
                          />
                          <input
                            value={reminderNote}
                            onChange={e => setReminderNote(e.target.value)}
                            placeholder="Note (optional)"
                            className="w-full bg-[#0b141a] border border-[#2f3b43] rounded-md text-xs text-white px-2 py-1"
                          />
                          <button
                            onClick={scheduleReminder}
                            className="w-full text-xs px-3 py-1.5 rounded-lg bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 transition border border-[#25D366]/30"
                          >
                            Schedule follow-up
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-[#111b21] border border-[#2f3b43] rounded-lg p-3">
                        <div className="text-[10px] text-gray-400 uppercase mb-1 flex items-center gap-1"><Tag className="w-3 h-3" /> Tags</div>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {['SUV', 'Low budget', 'Ready to buy'].map(t => (
                            <button
                              key={t}
                              onClick={() => {
                                setTags(prev => ({ ...prev, [selectedConvo.session_id]: [...(prev[selectedConvo.session_id] || []), t] }));
                                addAudit('tag_added', t, selectedConvo.session_id);
                              }}
                              className="text-[10px] px-2 py-1 rounded-md bg-[#0b141a] border border-[#2f3b43] text-gray-300 hover:text-white"
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {(tags[selectedConvo.session_id] || []).map((t, i) => (
                            <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full ${tagBadgeClass(t)}`}>{t}</span>
                          ))}
                        </div>
                        <input
                          placeholder="Add tag and press Enter"
                          className="w-full bg-[#0b141a] border border-[#2f3b43] rounded-md text-xs text-white px-2 py-1"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const v = (e.currentTarget.value || '').trim();
                              if (!v) return;
                              setTags(prev => ({ ...prev, [selectedConvo.session_id]: [...(prev[selectedConvo.session_id] || []), v] }));
                              e.currentTarget.value = '';
                              addAudit('tag_added', v, selectedConvo.session_id);
                            }
                          }}
                        />
                      </div>
                      <div className="bg-[#111b21] border border-[#2f3b43] rounded-lg p-3">
                        <div className="text-[10px] text-gray-400 uppercase mb-1">Notes</div>
                        <textarea
                          value={notes[selectedConvo.session_id] || ''}
                          onChange={e => setNotes(prev => ({ ...prev, [selectedConvo.session_id]: e.target.value }))}
                          onBlur={() => addAudit('note_updated', 'note edited', selectedConvo.session_id)}
                          placeholder="Internal notes..."
                          className="w-full min-h-[64px] bg-[#0b141a] border border-[#2f3b43] rounded-md text-xs text-white px-2 py-1"
                        />
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-[#111b21] border border-[#2f3b43] rounded-lg p-3">
                        <div className="text-[10px] text-gray-400 uppercase mb-2 flex items-center gap-1"><FileText className="w-3 h-3" /> Export Conversation</div>
                        <div className="flex gap-2">
                        <button
                          onClick={() => exportConversation(selectedConvo)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-[#2a3942] text-white hover:bg-[#3d4f5c] transition"
                        >
                          JSON
                        </button>
                        <button
                          onClick={() => exportConversationText(selectedConvo)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 transition border border-[#25D366]/30"
                        >
                          Text
                        </button>
                        <button
                          onClick={() => exportConversationPdf(selectedConvo)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-[#0b141a] text-white border border-[#2f3b43] hover:bg-[#1f2c34] transition"
                        >
                          PDF
                        </button>
                      </div>
                    </div>
                      <div className="bg-[#111b21] border border-[#2f3b43] rounded-lg p-3">
                        <div className="text-[10px] text-gray-400 uppercase mb-2 flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1"><Bell className="w-3 h-3" /> Reminders</span>
                          {selectedConvo && reminders.filter(r => r.session_id === selectedConvo.session_id && !r.done).length > 0 && (
                            <button
                              onClick={() => exportUpcomingRemindersIcs(selectedConvo.session_id)}
                              className="text-[10px] px-2 py-0.5 rounded bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30"
                            >
                              Export .ics
                            </button>
                          )}
                        </div>
                        {reminders.filter(r => r.session_id === selectedConvo.session_id && !r.done).length === 0 ? (
                          <p className="text-xs text-gray-500">No reminders yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {reminders.filter(r => r.session_id === selectedConvo.session_id && !r.done).slice(0, 5).map(r => {
                              const due = new Date(r.when).getTime() <= Date.now();
                              return (
                                <div key={r.id} className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-md border ${due ? 'border-[#f59e0b] text-[#f59e0b]' : 'border-[#2f3b43] text-gray-300'} bg-[#0b141a]`}>
                                  <span className="truncate">{r.note || 'Follow-up'}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-500">{new Date(r.when).toLocaleString()}</span>
                                    <button
                                      onClick={() => exportReminderIcs(r)}
                                      className="text-[10px] px-2 py-0.5 rounded bg-[#2a3942] text-gray-200"
                                    >
                                      .ics
                                    </button>
                                    <button
                                      onClick={() => setReminders(prev => prev.map(x => x.id === r.id ? { ...x, done: true } : x))}
                                      className="text-[10px] px-2 py-0.5 rounded bg-[#2a3942] text-gray-200"
                                    >
                                      Done
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 bg-[#111b21] border border-[#2f3b43] rounded-lg p-3">
                      <div className="text-[10px] text-gray-400 uppercase mb-2">Auto Follow‑Up Suggestions</div>
                      {(() => {
                        const stage = convoStageForSession(selectedConvo.session_id);
                        const intent = leadIntentForSession(selectedConvo.session_id);
                        const suggestions = [
                          stage === 'Browsing' ? 'What is your budget range?' : null,
                          stage === 'Interested' ? 'Would you like to book a viewing this week?' : null,
                          stage === 'Booking' ? 'Can I confirm your preferred date and time?' : null,
                          intent.includes('financ') ? 'Would you like financing options and monthly estimates?' : null,
                          intent.includes('location') ? 'We are on Spintex Road, would you like a map pin?' : null,
                        ].filter(Boolean) as string[];
                        if (suggestions.length === 0) {
                          return <p className="text-xs text-gray-500">No suggestions yet.</p>;
                        }
                        return (
                          <div className="flex flex-wrap gap-2">
                            {suggestions.map((s, i) => (
                              <button
                                key={i}
                                onClick={() => sendAdminText(s)}
                                className="text-[11px] px-2 py-1 rounded-md bg-[#0b141a] border border-[#2f3b43] text-gray-300 hover:text-white"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="mt-3 bg-[#111b21] border border-[#2f3b43] rounded-lg p-3">
                      <div className="text-[10px] text-gray-400 uppercase mb-2">Session Timeline</div>
                      <div className="space-y-1">
                        {events.filter(e => e.session_id === selectedConvo.session_id).sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime()).map((e, i) => (
                          <div key={i} className="text-xs text-gray-300 flex items-center justify-between">
                            <span className="capitalize">{e.event_type.replace(/_/g, ' ')}</span>
                            <span className="text-gray-500">{timeAgo(e.created_at)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 p-4 space-y-3">
                    {selectedConvo.messages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-[#005c4b] text-white rounded-br-sm' : 'bg-[#2a3942] text-white rounded-bl-sm'}`}>
                          <p className="whitespace-pre-wrap break-words">{msg.content.replace(/```json[\s\S]*?```/g, '').trim()}</p>
                          {msg.metadata && (
                            <div className="mt-1.5 flex gap-1 flex-wrap">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${TEMP_COLORS[msg.metadata.lead_temperature] || ''}`}>{msg.metadata.lead_temperature}</span>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">{msg.metadata.intent}</span>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 mt-1">{timeAgo(msg.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t border-[#2f3b43] bg-[#1f2c34]">
                    <div className="mb-3">
                      <div className="text-[10px] text-gray-400 uppercase mb-2">Response templates</div>
                      <div className="flex flex-wrap gap-2">
                        {templates.map(t => (
                          <button
                            key={t.id}
                            onClick={() => sendAdminText(t.text)}
                            className="text-[11px] px-2 py-1 rounded-md bg-[#0b141a] border border-[#2f3b43] text-gray-300 hover:text-white"
                          >
                            {t.text.slice(0, 30)}{t.text.length > 30 ? '...' : ''}
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          placeholder="Add template"
                          className="flex-1 bg-[#111b21] border border-[#2f3b43] rounded-lg px-3 py-2 text-xs text-white outline-none"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const v = e.currentTarget.value.trim();
                              if (!v) return;
                              setTemplates(prev => [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text: v }, ...prev].slice(0, 20));
                              e.currentTarget.value = '';
                              addAudit('template_added', v);
                            }
                          }}
                        />
                        <button
                          className="px-2 py-2 rounded-md bg-[#2a3942] text-gray-200"
                          title="Press Enter to add"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        value={adminMsg}
                        onChange={e => setAdminMsg(e.target.value)}
                        placeholder="Send a message to this chat..."
                        className="flex-1 bg-[#111b21] border border-[#2f3b43] rounded-lg px-3 py-2 text-sm text-white outline-none"
                      />
                      <button
                        onClick={sendAdminMessage}
                        className="text-sm px-4 py-2 rounded-lg bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 transition border border-[#25D366]/30"
                      >
                        <span className="flex items-center gap-1.5"><Send className="w-4 h-4" /> Send</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* — Inventory — */}
        {tab === 'inventory' && (
          <div className="h-[calc(100vh-160px)]">
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.45fr)] gap-4 items-stretch h-full">
              <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-4 h-full flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h2 className="font-semibold text-gray-300">{editingCarId ? 'Edit Car' : 'Add Car'}</h2>
                <div className="flex items-center gap-2">
                  {editingCarId && (
                    <button
                      onClick={resetCarForm}
                      className="text-xs px-2 py-1 rounded-md bg-[#2a3942] text-gray-200 hover:bg-[#3d4f5c] transition"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={resetCarForm}
                    className="text-xs px-2 py-1 rounded-md bg-[#2a3942] text-gray-200 hover:bg-[#3d4f5c] transition"
                  >
                    Reset
                  </button>
                </div>
              </div>
              <div id="admin-car-form" className="flex-1 min-h-0 overflow-y-auto pr-1">
                <form onSubmit={handleCarSubmit} className="space-y-3">
                  {carError && (
                    <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                      {carError}
                    </div>
                  )}
                  {carSuccess && (
                    <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-md px-3 py-2">
                      {carSuccess}
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="space-y-3">
                      <div className="bg-[#111b21] border border-[#2f3b43] rounded-lg p-2.5">
                        <div className="text-[11px] text-gray-400 uppercase mb-2">Basic Info</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-gray-400">Brand</label>
                            <div className="relative mt-1">
                              <select
                                value={carForm.brand}
                                onChange={e => {
                                  const nextBrand = e.target.value;
                                  setCarForm(prev => {
                                    const models = BRAND_MODELS[nextBrand] || [];
                                    const keepModel = prev.model && models.includes(prev.model);
                                    return { ...prev, brand: nextBrand, model: keepModel ? prev.model : '' };
                                  });
                                }}
                                className="w-full appearance-none bg-[#0f3d2e] border border-[#2f5b48] rounded-md text-xs text-[#e6e9ee] px-2 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366]/60"
                              >
                                <option value="">Select brand</option>
                                {['Toyota', 'Honda', 'Nissan', 'Hyundai', 'Kia', 'Mazda', 'Mitsubishi', 'Ford', 'Chevrolet', 'Mercedes-Benz', 'BMW', 'Lexus', 'Audi', 'Volkswagen', 'Peugeot', 'Renault', 'Suzuki', 'Isuzu', 'Land Rover'].map(b => (
                                  <option key={b} value={b}>{b}</option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#8696a0]">
                                <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                  <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-400">Model</label>
                            <div className="relative mt-1">
                              <select
                                value={carForm.model}
                                onChange={e => setCarForm(prev => ({ ...prev, model: e.target.value }))}
                                className="w-full appearance-none bg-[#0f3d2e] border border-[#2f5b48] rounded-md text-xs text-[#e6e9ee] px-2 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366]/60 disabled:opacity-60 disabled:cursor-not-allowed"
                                disabled={!carForm.brand}
                              >
                                <option value="">{carForm.brand ? 'Select model' : 'Select brand first'}</option>
                                {(BRAND_MODELS[carForm.brand] || []).map(m => (
                                  <option key={m} value={m}>{m}</option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#8696a0]">
                                <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                  <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-400">Year</label>
                            <input
                              type="number"
                              list="car-year-list"
                              value={carForm.year}
                              onChange={e => setCarForm(prev => ({ ...prev, year: Number(e.target.value) }))}
                              placeholder="2022"
                              className="mt-1 w-full bg-[#0b141a] border border-[#2f3b43] rounded-md text-xs text-white px-2 py-1.5"
                            />
                            <datalist id="car-year-list">
                              {Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                <option key={y} value={y} />
                              ))}
                            </datalist>
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-400">Price (GHS)</label>
                            <input
                              type="number"
                              list="car-price-list"
                              value={carForm.price}
                              onChange={e => setCarForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                              placeholder="120000"
                              className="mt-1 w-full bg-[#0b141a] border border-[#2f3b43] rounded-md text-xs text-white px-2 py-1.5"
                            />
                            <datalist id="car-price-list">
                              {[60000, 80000, 100000, 120000, 150000, 180000, 200000, 250000, 300000, 350000, 400000].map(p => (
                                <option key={p} value={p} />
                              ))}
                            </datalist>
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#111b21] border border-[#2f3b43] rounded-lg p-2.5">
                        <div className="text-[11px] text-gray-400 uppercase mb-2">Specs</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] text-gray-400">Fuel</label>
                            <input
                              list="car-fuel-list"
                              value={carForm.fuel || ''}
                              onChange={e => setCarForm(prev => ({ ...prev, fuel: e.target.value }))}
                              placeholder="Petrol"
                              className="mt-1 w-full bg-[#0b141a] border border-[#2f3b43] rounded-md text-xs text-white px-2 py-1.5"
                            />
                            <datalist id="car-fuel-list">
                              {['Petrol', 'Diesel', 'Hybrid', 'Electric'].map(f => (
                                <option key={f} value={f} />
                              ))}
                            </datalist>
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-400">Transmission</label>
                            <input
                              list="car-transmission-list"
                              value={carForm.transmission || ''}
                              onChange={e => setCarForm(prev => ({ ...prev, transmission: e.target.value }))}
                              placeholder="Automatic"
                              className="mt-1 w-full bg-[#0b141a] border border-[#2f3b43] rounded-md text-xs text-white px-2 py-1.5"
                            />
                            <datalist id="car-transmission-list">
                              {['Automatic', 'Manual', 'CVT'].map(t => (
                                <option key={t} value={t} />
                              ))}
                            </datalist>
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-400">Color</label>
                            <input
                              list="car-color-list"
                              value={carForm.color || ''}
                              onChange={e => setCarForm(prev => ({ ...prev, color: e.target.value }))}
                              placeholder="Black"
                              className="mt-1 w-full bg-[#0b141a] border border-[#2f3b43] rounded-md text-xs text-white px-2 py-1.5"
                            />
                            <datalist id="car-color-list">
                              {['Black', 'White', 'Silver', 'Gray', 'Blue', 'Red', 'Green', 'Gold', 'Brown', 'Beige'].map(c => (
                                <option key={c} value={c} />
                              ))}
                            </datalist>
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-400">Mileage</label>
                            <input
                              list="car-mileage-list"
                              value={carForm.mileage || ''}
                              onChange={e => setCarForm(prev => ({ ...prev, mileage: e.target.value }))}
                              placeholder="55,000 km"
                              className="mt-1 w-full bg-[#0b141a] border border-[#2f3b43] rounded-md text-xs text-white px-2 py-1.5"
                            />
                            <datalist id="car-mileage-list">
                              {['20,000 km', '40,000 km', '55,000 km', '70,000 km', '90,000 km', '120,000 km'].map(m => (
                                <option key={m} value={m} />
                              ))}
                            </datalist>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-[#111b21] border border-[#2f3b43] rounded-lg p-2.5">
                        <div className="text-[11px] text-gray-400 uppercase mb-2">Images</div>
                        <div className="space-y-2">
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] text-gray-400">Feature Image URL</label>
                              <button
                                type="button"
                                onClick={() => featureFileRef.current?.click()}
                                className="text-[10px] px-2 py-1 rounded-md bg-[#0f3d2e] text-[#e6e9ee] border border-[#2f5b48] hover:bg-[#186248] transition"
                              >
                                Click to upload
                              </button>
                            </div>
                            <input
                              value={carForm.image_url || ''}
                              onChange={e => {
                                const v = e.target.value;
                                setCarForm(prev => {
                                  const urls = Array.isArray(prev.image_urls) ? [...prev.image_urls] : ['', '', '', ''];
                                  urls[0] = v;
                                  return { ...prev, image_url: v, image_urls: urls };
                                });
                                setCarImageUpload(v);
                              }}
                              placeholder="https://..."
                              className="mt-1 w-full bg-[#0b141a] border border-[#2f3b43] rounded-md text-xs text-white px-2 py-1.5"
                            />
                            <input
                              ref={featureFileRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                handleImageFile(file, 0);
                              }}
                            />
                            {(carForm.image_url || carForm.image_urls?.[0] || carImageUpload) && (
                              <div className="mt-2 flex items-center gap-3">
                                <img
                                  src={carForm.image_url || carForm.image_urls?.[0] || carImageUpload}
                                  alt="Feature preview"
                                  className="w-20 h-16 object-cover rounded-md border border-[#2f3b43]"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCarForm(prev => {
                                      const urls = Array.isArray(prev.image_urls) ? [...prev.image_urls] : ['', '', '', ''];
                                      urls[0] = '';
                                      return { ...prev, image_url: '', image_urls: urls };
                                    });
                                    setCarImageUpload('');
                                  }}
                                  className="text-xs px-2 py-1 rounded-md bg-[#2a3942] text-gray-200 hover:bg-[#3d4f5c] transition"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] text-gray-400">Gallery Image 1</label>
                              <button
                                type="button"
                                onClick={() => gallery1FileRef.current?.click()}
                                className="text-[10px] px-2 py-1 rounded-md bg-[#0f3d2e] text-[#e6e9ee] border border-[#2f5b48] hover:bg-[#186248] transition"
                              >
                                Click to upload
                              </button>
                            </div>
                            <input
                              value={carForm.real_image || ''}
                              onChange={e => {
                                const v = e.target.value;
                                setCarForm(prev => {
                                  const urls = Array.isArray(prev.image_urls) ? [...prev.image_urls] : ['', '', '', ''];
                                  urls[1] = v;
                                  return { ...prev, real_image: v, image_urls: urls };
                                });
                              }}
                              placeholder="https://..."
                              className="mt-1 w-full bg-[#0b141a] border border-[#2f3b43] rounded-md text-xs text-white px-2 py-1.5"
                            />
                            <input
                              ref={gallery1FileRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                handleImageFile(file, 1);
                              }}
                            />
                            {(carForm.real_image || carForm.image_urls?.[1]) && (
                              <div className="mt-2">
                                <img
                                  src={carForm.real_image || carForm.image_urls?.[1]}
                                  alt="Gallery preview 1"
                                  className="w-20 h-16 object-cover rounded-md border border-[#2f3b43]"
                                />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] text-gray-400">Gallery Image 2</label>
                              <button
                                type="button"
                                onClick={() => gallery2FileRef.current?.click()}
                                className="text-[10px] px-2 py-1 rounded-md bg-[#0f3d2e] text-[#e6e9ee] border border-[#2f5b48] hover:bg-[#186248] transition"
                              >
                                Click to upload
                              </button>
                            </div>
                            <input
                              value={(carForm.image_urls?.[2] || '')}
                              onChange={e => {
                                const v = e.target.value;
                                setCarForm(prev => {
                                  const urls = Array.isArray(prev.image_urls) ? [...prev.image_urls] : ['', '', '', ''];
                                  urls[2] = v;
                                  return { ...prev, image_urls: urls };
                                });
                              }}
                              placeholder="https://..."
                              className="mt-1 w-full bg-[#0b141a] border border-[#2f3b43] rounded-md text-xs text-white px-2 py-1.5"
                            />
                            <input
                              ref={gallery2FileRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                handleImageFile(file, 2);
                              }}
                            />
                            {(carForm.image_urls?.[2]) && (
                              <div className="mt-2">
                                <img
                                  src={carForm.image_urls?.[2]}
                                  alt="Gallery preview 2"
                                  className="w-20 h-16 object-cover rounded-md border border-[#2f3b43]"
                                />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] text-gray-400">Gallery Image 3</label>
                              <button
                                type="button"
                                onClick={() => gallery3FileRef.current?.click()}
                                className="text-[10px] px-2 py-1 rounded-md bg-[#0f3d2e] text-[#e6e9ee] border border-[#2f5b48] hover:bg-[#186248] transition"
                              >
                                Click to upload
                              </button>
                            </div>
                            <input
                              value={(carForm.image_urls?.[3] || '')}
                              onChange={e => {
                                const v = e.target.value;
                                setCarForm(prev => {
                                  const urls = Array.isArray(prev.image_urls) ? [...prev.image_urls] : ['', '', '', ''];
                                  urls[3] = v;
                                  return { ...prev, image_urls: urls };
                                });
                              }}
                              placeholder="https://..."
                              className="mt-1 w-full bg-[#0b141a] border border-[#2f3b43] rounded-md text-xs text-white px-2 py-1.5"
                            />
                            <input
                              ref={gallery3FileRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                handleImageFile(file, 3);
                              }}
                            />
                            {(carForm.image_urls?.[3]) && (
                              <div className="mt-2">
                                <img
                                  src={carForm.image_urls?.[3]}
                                  alt="Gallery preview 3"
                                  className="w-20 h-16 object-cover rounded-md border border-[#2f3b43]"
                                />
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500">
                            Add 4 images total: 1 feature + 3 gallery.
                          </p>
                        </div>
                      </div>

                      <div className="bg-[#111b21] border border-[#2f3b43] rounded-lg p-2.5">
                        <div className="text-[11px] text-gray-400 uppercase mb-2">Status</div>
                        <div className="flex items-center gap-4 text-xs text-gray-300">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!carForm.insured}
                              onChange={e => setCarForm(prev => ({ ...prev, insured: e.target.checked }))}
                            />
                            Insurance
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!carForm.registered}
                              onChange={e => setCarForm(prev => ({ ...prev, registered: e.target.checked }))}
                            />
                            Registration
                          </label>
                        </div>
                        <div className="mt-3">
                          <label className="text-[11px] text-gray-400">Availability</label>
                          <div className="relative mt-1">
                            <select
                              value={carForm.status || 'available'}
                              onChange={e => setCarForm(prev => ({ ...prev, status: e.target.value as any }))}
                              className="w-full appearance-none bg-[#0f3d2e] border border-[#2f5b48] rounded-md text-xs text-[#e6e9ee] px-2 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366]/60"
                            >
                              <option value="available">Available</option>
                              <option value="reserved">Reserved</option>
                              <option value="sold">Sold</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[#8696a0]">
                              <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={carSaving}
                    className="w-full text-xs px-3 py-2 rounded-lg bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 transition border border-[#25D366]/30 disabled:opacity-60"
                  >
                    {carSaving ? 'Saving...' : (editingCarId ? 'Update Car' : 'Save Car')}
                  </button>
                </form>
              </div>
            </div>

              <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-4 h-full flex flex-col">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 mb-3">
                <div>
                  <h2 className="font-semibold text-gray-300">Inventory ({filteredCars.length})</h2>
                  <p className="text-xs text-gray-500">Search by brand, model, year, fuel, or transmission.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={carSearch}
                    onChange={e => setCarSearch(e.target.value)}
                    placeholder="Search cars"
                    className="bg-[#0b141a] border border-[#2f3b43] rounded-md text-xs text-white px-3 py-2 w-64"
                  />
                  <select
                    value={carStatusFilter}
                    onChange={e => setCarStatusFilter(e.target.value as any)}
                    className="bg-[#0f3d2e] border border-[#2f5b48] rounded-md px-2 py-2 text-xs text-[#e6e9ee] focus:outline-none focus:ring-2 focus:ring-[#25D366]/40 focus:border-[#25D366]/60"
                  >
                    <option value="all">All Status</option>
                    <option value="available">Available</option>
                    <option value="reserved">Reserved</option>
                    <option value="sold">Sold</option>
                  </select>
                  <button
                    onClick={fetchCars}
                    className="text-xs px-3 py-2 rounded-lg bg-[#2a3942] text-gray-200 hover:bg-[#3d4f5c] transition"
                  >
                    Refresh
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                {filteredCars.length === 0 ? (
                  <p className="text-gray-500 text-sm">No cars found.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2.5">
                    {filteredCars.map((c, i) => (
                      <div key={`${c.id ?? i}`} className="bg-[#111b21] border border-[#2f3b43] rounded-xl p-2.5 flex gap-3 group relative">
                        <div className="w-20 h-16 rounded-lg bg-[#0b141a] border border-[#2f3b43] overflow-hidden shrink-0">
                        {c.image_url ? (
                          <img src={c.image_url} alt={`${c.brand} ${c.model}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">No image</div>
                        )}
                      </div>
                      {c.image_url && (
                        <div className="pointer-events-none absolute left-3 top-3 z-20 hidden group-hover:block">
                          <div className="bg-[#0b141a] border border-[#2f3b43] rounded-lg p-1 shadow-xl">
                            <img src={c.image_url} alt={`${c.brand} ${c.model} preview`} className="w-56 h-40 object-cover rounded-md" />
                          </div>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm text-white font-semibold truncate">{c.year} {c.brand} {c.model}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#25D366] font-semibold">₵{Number(c.price || 0).toLocaleString()}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                (c.status || 'available') === 'available'
                                  ? 'bg-[#00a884]/20 text-[#00a884] border-[#00a884]/30'
                                  : (c.status === 'reserved'
                                    ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                    : 'bg-red-500/20 text-red-400 border-red-500/30')
                              }`}
                            >
                              {(c.status || 'available').toUpperCase()}
                            </span>
                            <button
                              onClick={() => startQuickEdit(c)}
                              className="text-[11px] px-2 py-1 rounded-md bg-[#1f2c34] text-gray-200 hover:bg-[#2a3942] transition border border-[#2f3b43]"
                            >
                              Quick
                            </button>
                            <button
                              onClick={() => startEditCar(c)}
                              className="text-[11px] px-2 py-1 rounded-md bg-[#2a3942] text-gray-200 hover:bg-[#3d4f5c] transition"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                        {quickEditId === String(c.id) && (
                          <div className="mt-2 p-2 rounded-md bg-[#0b141a] border border-[#2f3b43]">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-gray-400">Price (GHS)</label>
                                <input
                                  type="number"
                                  value={quickPrice}
                                  onChange={e => setQuickPrice(e.target.value)}
                                  className="mt-1 w-full bg-[#0f1a22] border border-[#2f3b43] rounded-md text-[11px] text-white px-2 py-1"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-400">Mileage</label>
                                <input
                                  value={quickMileage}
                                  onChange={e => setQuickMileage(e.target.value)}
                                  className="mt-1 w-full bg-[#0f1a22] border border-[#2f3b43] rounded-md text-[11px] text-white px-2 py-1"
                                />
                              </div>
                            </div>
                            {quickError && (
                              <div className="mt-2 text-[10px] text-red-400">{quickError}</div>
                            )}
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                onClick={saveQuickEdit}
                                disabled={quickSaving}
                                className="text-[11px] px-2 py-1 rounded-md bg-[#25D366]/20 text-[#25D366] border border-[#25D366]/30 disabled:opacity-60"
                              >
                                {quickSaving ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={cancelQuickEdit}
                                className="text-[11px] px-2 py-1 rounded-md bg-[#2a3942] text-gray-200 hover:bg-[#3d4f5c] transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                          <div className="text-gray-500">Brand</div>
                          <div className="text-gray-200">{c.brand || '—'}</div>
                          <div className="text-gray-500">Model</div>
                          <div className="text-gray-200">{c.model || '—'}</div>
                          <div className="text-gray-500">Year</div>
                          <div className="text-gray-200">{c.year || '—'}</div>
                          <div className="text-gray-500">Price</div>
                          <div className="text-gray-200">₵{Number(c.price || 0).toLocaleString()}</div>
                          <div className="text-gray-500">Fuel</div>
                          <div className="text-gray-200">{c.fuel || '—'}</div>
                          <div className="text-gray-500">Transmission</div>
                          <div className="text-gray-200">{c.transmission || '—'}</div>
                          <div className="text-gray-500">Mileage</div>
                          <div className="text-gray-200">{c.mileage || '—'}</div>
                          <div className="text-gray-500">Color</div>
                          <div className="text-gray-200">{c.color || '—'}</div>
                          <div className="text-gray-500">Insurance</div>
                          <div className="text-gray-200">{c.insured ? 'Yes' : 'No'}</div>
                          <div className="text-gray-500">Registration</div>
                          <div className="text-gray-200">{c.registered ? 'Yes' : 'No'}</div>
                          <div className="text-gray-500">Status</div>
                          <div className="text-gray-200 capitalize">{c.status || 'available'}</div>
                          <div className="text-gray-500">Images</div>
                          <div className="text-gray-200">
                            {Array.isArray((c as any).image_urls)
                              ? (c as any).image_urls.filter(Boolean).length
                              : (c.image_url ? 1 : 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>
        )}

        {/* â”€â”€ EVENTS â”€â”€ */}
        {tab === 'events' && (
          <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#2f3b43] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-300">All Events ({filteredEvents.length})</h2>
                <p className="text-xs text-gray-500">Filter by type, anomalies, and date range.</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-gray-400">
                  <span className="px-2 py-0.5 rounded-full bg-[#0b141a] border border-[#2f3b43]">24h events {eventsLast24h.length}</span>
                  <span className={`px-2 py-0.5 rounded-full border ${errorRate24h > 0 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : 'bg-[#0b141a] text-gray-400 border-[#2f3b43]'}`}>
                    Error rate {errorRate24h}%
                  </span>
                  <span className={`px-2 py-0.5 rounded-full border ${rateLimit24h > 0 ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-[#0b141a] text-gray-400 border-[#2f3b43]'}`}>
                    Rate-limit {rateLimit24h}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleExport('csv', 'events')} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 transition border border-[#25D366]/30">
                  <Download className="w-3 h-3" /> CSV
                </button>
                <button onClick={() => handleExport('json', 'events')} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#2a3942] text-white hover:bg-[#3d4f5c] transition">
                  <Download className="w-3 h-3" /> JSON
                </button>
                <button
                  disabled={!selectedEventCount}
                  onClick={() => exportSelectedEvents('csv')}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${selectedEventCount ? 'bg-[#0b141a] text-gray-200 border-[#2f3b43] hover:bg-[#2a3942]' : 'bg-[#0b141a] text-gray-500 border-[#2f3b43] opacity-50 cursor-not-allowed'}`}
                >
                  <Download className="w-3 h-3" /> Selected CSV
                </button>
                <button
                  disabled={!selectedEventCount}
                  onClick={() => exportSelectedEvents('json')}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${selectedEventCount ? 'bg-[#0b141a] text-gray-200 border-[#2f3b43] hover:bg-[#2a3942]' : 'bg-[#0b141a] text-gray-500 border-[#2f3b43] opacity-50 cursor-not-allowed'}`}
                >
                  <Download className="w-3 h-3" /> Selected JSON
                </button>
              </div>
            </div>

            <div className="p-4 border-b border-[#2f3b43] space-y-3">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setEventTypeFilter('all')}
                  className={`text-[11px] px-3 py-1 rounded-full border ${eventTypeFilter === 'all' ? 'bg-[#00a884]/20 text-[#00a884] border-[#00a884]/30' : 'bg-[#2a3942] text-[#aebac1] border-[#3d4f5c]'}`}
                >
                  All ({events.length})
                </button>
                {eventTypeList.map(t => (
                  <button
                    key={t}
                    onClick={() => setEventTypeFilter(t)}
                    className={`text-[11px] px-3 py-1 rounded-full border ${eventTypeFilter === t ? 'bg-[#00a884]/20 text-[#00a884] border-[#00a884]/30' : 'bg-[#2a3942] text-[#aebac1] border-[#3d4f5c]'}`}
                  >
                    {t.replace(/_/g, ' ')} ({eventTypeCounts[t] || 0})
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">From</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="bg-[#0b141a] border border-[#2f3b43] rounded-md px-2 py-1 text-xs text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">To</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="bg-[#0b141a] border border-[#2f3b43] rounded-md px-2 py-1 text-xs text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Source</span>
                  <select
                    value={eventSourceFilter}
                    onChange={e => setEventSourceFilter(e.target.value as any)}
                    className="bg-[#0b141a] border border-[#2f3b43] rounded-md px-2 py-1 text-xs text-white"
                  >
                    <option value="all">All</option>
                    <option value="web">Web</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Tag</span>
                  <select
                    value={eventTagFilter}
                    onChange={e => setEventTagFilter(e.target.value)}
                    className="bg-[#0b141a] border border-[#2f3b43] rounded-md px-2 py-1 text-xs text-white"
                  >
                    <option value="all">All tags</option>
                    {eventTagList.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={eventAnomaliesOnly}
                    onChange={e => setEventAnomaliesOnly(e.target.checked)}
                  />
                  Only anomalies
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={eventIntentGroup}
                    onChange={e => setEventIntentGroup(e.target.checked)}
                  />
                  Group by intent
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Archive</span>
                  <input
                    type="number"
                    min={0}
                    value={autoArchiveDays}
                    onChange={e => setAutoArchiveDays(Number(e.target.value) || 0)}
                    className="bg-[#0b141a] border border-[#2f3b43] rounded-md px-2 py-1 text-xs text-white w-16"
                  />
                  <span className="text-gray-500">days</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">View</span>
                  <button
                    onClick={() => setEventView('table')}
                    className={`text-[11px] px-2 py-1 rounded-md border ${eventView === 'table' ? 'bg-[#00a884]/20 text-[#00a884] border-[#00a884]/30' : 'bg-[#2a3942] text-[#aebac1] border-[#3d4f5c]'}`}
                  >
                    Table
                  </button>
                  <button
                    onClick={() => setEventView('timeline')}
                    className={`text-[11px] px-2 py-1 rounded-md border ${eventView === 'timeline' ? 'bg-[#00a884]/20 text-[#00a884] border-[#00a884]/30' : 'bg-[#2a3942] text-[#aebac1] border-[#3d4f5c]'}`}
                  >
                    Timeline
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
                <input
                  value={eventPresetName}
                  onChange={e => setEventPresetName(e.target.value)}
                  placeholder="Preset name"
                  className="bg-[#0b141a] border border-[#2f3b43] rounded-md px-2 py-1 text-xs text-white"
                />
                <button
                  onClick={saveEventPreset}
                  className="px-3 py-1 rounded-md bg-[#2a3942] text-white hover:bg-[#3d4f5c] transition"
                >
                  Save preset
                </button>
                {eventPresets.map(p => (
                  <div key={p.id} className="flex items-center gap-1">
                    <button
                      onClick={() => applyEventPreset(p)}
                      className="px-2 py-1 rounded-md bg-[#0b141a] border border-[#2f3b43] text-gray-200 hover:bg-[#2a3942] transition"
                    >
                      {p.name}
                    </button>
                    <button
                      onClick={() => deleteEventPreset(p.id)}
                      className="px-2 py-1 rounded-md bg-[#2a3942] text-gray-300 hover:bg-[#3d4f5c]"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {selectedEventCount > 0 && (
                <div className="bg-[#0b141a] border border-[#2f3b43] rounded-lg p-2 text-xs flex flex-wrap items-center gap-2">
                  <span className="text-gray-400">Selected {selectedEventCount}</span>
                  <input
                    value={eventTagInput}
                    onChange={e => setEventTagInput(e.target.value)}
                    placeholder="Add tag to selected"
                    className="bg-[#111b21] border border-[#2f3b43] rounded px-2 py-1 text-xs text-white"
                  />
                  <button
                    onClick={addTagToSelected}
                    className="px-2 py-1 rounded bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/30"
                  >
                    Add tag
                  </button>
                  <button
                    onClick={() => setEventSelected({})}
                    className="px-2 py-1 rounded bg-[#2a3942] text-white"
                  >
                    Clear selection
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 border-b border-[#2f3b43] grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="bg-[#111b21] border border-[#2f3b43] rounded-lg p-3 lg:col-span-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-300">Top Events This Week</h3>
                  <span className="text-[10px] text-gray-500">last 7 days</span>
                </div>
                {topEventsThisWeek.length === 0 ? (
                  <p className="text-xs text-gray-500">No events in the last 7 days.</p>
                ) : (
                  <div className="space-y-2">
                    {topEventsThisWeek.map(([t, count]) => {
                      const max = Math.max(...topEventsThisWeek.map(([, c]) => c));
                      const pct = max ? Math.round((count / max) * 100) : 0;
                      return (
                        <div key={t} className="flex items-center gap-3">
                          <div className="w-32 text-xs text-gray-300 truncate">{t.replace(/_/g, ' ')}</div>
                          <div className="flex-1 h-2 bg-[#0b141a] rounded-full overflow-hidden border border-[#2f3b43]">
                            <div className="h-full bg-[#00a884]" style={{ width: `${pct}%` }} />
                          </div>
                          <div className="text-xs text-gray-400 w-8 text-right">{count}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="bg-[#111b21] border border-[#2f3b43] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-300">Alert Rules</h3>
                  <Bell className="w-4 h-4 text-[#00a884]" />
                </div>
                <div className="space-y-2 text-xs text-gray-300">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={alertRules.booking}
                      onChange={e => {
                        if (e.target.checked && 'Notification' in window && Notification.permission === 'default') {
                          Notification.requestPermission().catch(() => {});
                        }
                        setAlertRules(prev => ({ ...prev, booking: e.target.checked }));
                      }}
                    />
                    Notify on Booking
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={alertRules.escalation}
                      onChange={e => {
                        if (e.target.checked && 'Notification' in window && Notification.permission === 'default') {
                          Notification.requestPermission().catch(() => {});
                        }
                        setAlertRules(prev => ({ ...prev, escalation: e.target.checked }));
                      }}
                    />
                    Notify on Escalation
                  </label>
                  <p className="text-[10px] text-gray-500">Uses browser notifications.</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-b border-[#2f3b43] grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="bg-[#111b21] border border-[#2f3b43] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-300">Event Volume (24h)</h3>
                  <span className="text-[10px] text-gray-500">hourly</span>
                </div>
                <div className="flex items-end gap-1 h-16">
                  {volume24h.map((v, i) => (
                    <div key={i} className="flex-1 bg-[#0b141a] border border-[#2f3b43] rounded-sm overflow-hidden">
                      <div className="w-full bg-[#00a884]" style={{ height: `${Math.max(6, (v / maxVolume24h) * 100)}%` }} />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2 text-[10px] text-gray-500">
                  <span>24h ago</span>
                  <span>Now</span>
                </div>
              </div>
              <div className="bg-[#111b21] border border-[#2f3b43] rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-300">Anomaly Timeline (24h)</h3>
                  <span className="text-[10px] text-gray-500">errors + fails</span>
                </div>
                <div className="flex items-end gap-1 h-16">
                  {anomalyVolume24h.map((v, i) => (
                    <div key={i} className="flex-1 bg-[#0b141a] border border-[#2f3b43] rounded-sm overflow-hidden">
                      <div className="w-full bg-red-500" style={{ height: `${Math.max(6, (v / maxAnomaly24h) * 100)}%` }} />
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-gray-400">
                  <span className={`px-2 py-0.5 rounded-full border ${errorRate24h > 0 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : 'bg-[#0b141a] text-gray-400 border-[#2f3b43]'}`}>
                    Error rate {errorRate24h}%
                  </span>
                  <span className={`px-2 py-0.5 rounded-full border ${rateLimit24h > 0 ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-[#0b141a] text-gray-400 border-[#2f3b43]'}`}>
                    Rate-limit {rateLimit24h}
                  </span>
                </div>
              </div>
            </div>

            {filteredEvents.length === 0 ? (
              <p className="text-gray-500 text-sm p-4">No events found for the selected filters.</p>
            ) : eventView === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[#2f3b43] text-gray-400 bg-[#111b21]">
                    <tr>
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={filteredEvents.length > 0 && filteredEvents.every(e => eventSelected[eventKey(e)])}
                          onChange={e => toggleSelectAllEvents(e.target.checked)}
                          className="accent-[#00a884]"
                        />
                      </th>
                      <th className="text-left px-4 py-3">Event</th>
                      <th className="text-left px-4 py-3">Session</th>
                      <th className="text-left px-4 py-3">Intent</th>
                      <th className="text-left px-4 py-3">Source</th>
                      <th className="text-left px-4 py-3">Lead</th>
                      <th className="text-left px-4 py-3">Tags</th>
                      <th className="text-left px-4 py-3">Data Preview</th>
                      <th className="text-left px-4 py-3">Time</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((evt, i) => {
                      const sev = eventSeverity(evt);
                      const key = eventKey(evt);
                      const tagsForEvent = eventTags[key] || [];
                      const preview = evt.event_data ? JSON.stringify(evt.event_data).slice(0, 80) : '—';
                      return (
                        <tr key={i} onClick={() => setSelectedEvent(evt)}
                          className="border-b border-[#2f3b43] hover:bg-[#2a3942] cursor-pointer transition group">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={!!eventSelected[key]}
                              onChange={(e) => {
                                e.stopPropagation();
                                setEventSelected(prev => ({ ...prev, [key]: e.target.checked }));
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="accent-[#00a884]"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span>{EVENT_ICONS[evt.event_type] || '📌'}</span>
                              <span className="capitalize">{evt.event_type.replace(/_/g, ' ')}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${sev.cls}`}>{sev.label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-400 font-mono text-xs">{evt.session_id.slice(0, 12)}...</td>
                          <td className="px-4 py-3 text-gray-400 capitalize">{eventIntentLabel(evt) || '—'}</td>
                          <td className="px-4 py-3 text-gray-400 capitalize">{eventSourceFor(evt)}</td>
                          <td className="px-4 py-3">
                            {evt.lead_temperature && evt.lead_temperature !== 'unknown'
                              ? <span className={`text-xs px-2 py-0.5 rounded-full ${TEMP_COLORS[evt.lead_temperature] || ''}`}>{evt.lead_temperature}</span>
                              : <span className="text-gray-600">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {tagsForEvent.length === 0 && <span className="text-gray-600">—</span>}
                              {tagsForEvent.slice(0, 3).map((t, idx) => (
                                <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full bg-[#2a3942] text-gray-200 border border-[#3d4f5c]">{t}</span>
                              ))}
                              {tagsForEvent.length > 3 && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2a3942] text-gray-300 border border-[#3d4f5c]">
                                  +{tagsForEvent.length - 3}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const t = window.prompt('Add tag');
                                if (t) addTagToEvent(evt, t);
                              }}
                              className="mt-1 text-[10px] px-2 py-0.5 rounded-md bg-[#0b141a] border border-[#2f3b43] text-gray-300 hover:bg-[#2a3942]"
                            >
                              + Tag
                            </button>
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-xs font-mono max-w-[180px] truncate" title={evt.event_data ? JSON.stringify(evt.event_data) : ''}>
                            {preview}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{timeAgo(evt.created_at)}</td>
                          <td className="px-4 py-3 flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedEvent(evt); }}
                              className="text-xs px-3 py-1 rounded-lg bg-[#00a884]/20 text-[#00a884] hover:bg-[#00a884]/30 border border-[#00a884]/30 transition font-medium"
                            >
                              View
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); openConversationFromEvent(evt.session_id); }}
                              className="text-xs px-3 py-1 rounded-lg bg-[#2a3942] text-white hover:bg-[#3d4f5c] transition"
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {eventIntentGroup ? (
                  timelineByIntent.map(group => (
                    <div key={group.intent} className="bg-[#111b21] border border-[#2f3b43] rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-xs text-gray-400">Intent</p>
                          <p className="text-sm text-white capitalize">{group.intent || 'unknown'}</p>
                        </div>
                        <span className="text-[11px] text-gray-500">{group.events.length} events</span>
                      </div>
                      <div className="relative pl-4 border-l border-[#2f3b43] space-y-3">
                        {group.events.map((evt, idx) => {
                          const sev = eventSeverity(evt);
                          const tagsForEvent = eventTags[eventKey(evt)] || [];
                          return (
                            <div key={`${evt.created_at}-${idx}`} className="relative">
                              <span className="absolute -left-[9px] top-1 w-2.5 h-2.5 bg-[#00a884] rounded-full border border-[#0b141a]" />
                              <div className="flex items-center gap-2 text-xs text-gray-300 flex-wrap">
                                <span>{EVENT_ICONS[evt.event_type] || '📌'}</span>
                                <span className="capitalize">{evt.event_type.replace(/_/g, ' ')}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${sev.cls}`}>{sev.label}</span>
                                <span className="text-gray-500">{timeAgo(evt.created_at)}</span>
                                <span className="text-gray-500 font-mono">{evt.session_id.slice(0, 8)}...</span>
                              </div>
                              <div className="mt-1 text-[11px] text-gray-400" title={evt.event_data ? JSON.stringify(evt.event_data) : ''}>
                                {evt.event_data ? JSON.stringify(evt.event_data).slice(0, 120) : '—'}
                              </div>
                              {tagsForEvent.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {tagsForEvent.slice(0, 3).map((t, tIdx) => (
                                    <span key={tIdx} className="text-[10px] px-2 py-0.5 rounded-full bg-[#2a3942] text-gray-200 border border-[#3d4f5c]">{t}</span>
                                  ))}
                                </div>
                              )}
                              <div className="mt-1">
                                <button
                                  onClick={() => setSelectedEvent(evt)}
                                  className="text-[10px] px-2 py-0.5 rounded-md bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/30"
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  timelineBySession.map(group => (
                    <div key={group.session_id} className="bg-[#111b21] border border-[#2f3b43] rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-xs text-gray-400">Session</p>
                          <p className="text-sm text-white font-mono">{group.session_id}</p>
                        </div>
                        <button
                          onClick={() => openConversationFromEvent(group.session_id)}
                          className="text-[11px] px-3 py-1 rounded-lg bg-[#2a3942] text-white hover:bg-[#3d4f5c] transition"
                        >
                          Open Conversation
                        </button>
                      </div>
                      <div className="relative pl-4 border-l border-[#2f3b43] space-y-3">
                        {group.events.map((evt, idx) => {
                          const sev = eventSeverity(evt);
                          const tagsForEvent = eventTags[eventKey(evt)] || [];
                          return (
                            <div key={`${evt.created_at}-${idx}`} className="relative">
                              <span className="absolute -left-[9px] top-1 w-2.5 h-2.5 bg-[#00a884] rounded-full border border-[#0b141a]" />
                              <div className="flex items-center gap-2 text-xs text-gray-300 flex-wrap">
                                <span>{EVENT_ICONS[evt.event_type] || '📌'}</span>
                                <span className="capitalize">{evt.event_type.replace(/_/g, ' ')}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${sev.cls}`}>{sev.label}</span>
                                <span className="text-gray-500">{timeAgo(evt.created_at)}</span>
                              </div>
                              <div className="mt-1 text-[11px] text-gray-400" title={evt.event_data ? JSON.stringify(evt.event_data) : ''}>
                                {evt.event_data ? JSON.stringify(evt.event_data).slice(0, 120) : '—'}
                              </div>
                              {tagsForEvent.length > 0 && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {tagsForEvent.slice(0, 3).map((t, tIdx) => (
                                    <span key={tIdx} className="text-[10px] px-2 py-0.5 rounded-full bg-[#2a3942] text-gray-200 border border-[#3d4f5c]">{t}</span>
                                  ))}
                                </div>
                              )}
                              <div className="mt-1">
                                <button
                                  onClick={() => setSelectedEvent(evt)}
                                  className="text-[10px] px-2 py-0.5 rounded-md bg-[#00a884]/20 text-[#00a884] border border-[#00a884]/30"
                                >
                                  View
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

