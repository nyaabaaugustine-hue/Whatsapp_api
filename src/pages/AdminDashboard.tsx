import { useState, useEffect, useCallback } from 'react';
import { X, Download, Calendar, Thermometer, Target, Clock, Hash, Database, LogOut, Search, PhoneCall, Tag, Bell, FileText, Send, Plus, User } from 'lucide-react';
import { AdminLogin } from '../components/AdminLogin';
import { CAR_DATABASE } from '../data/cars';

const ADMIN_KEY = import.meta.env.VITE_ADMIN_SECRET || 'drivemond2026';

interface Stats { totalSessions: number; totalMessages: number; hotLeads: number; warmLeads: number; coldLeads: number; bookings: number; }
interface Message { session_id: string; role: 'user' | 'assistant'; content: string; metadata: any; created_at: string; }
interface Event { id?: string; session_id: string; event_type: string; event_data: any; lead_temperature: string; intent: string; created_at: string; }
interface Conversation { session_id: string; started_at: string; last_message_at: string; message_count: number; messages: Message[]; }
interface LeadProfile { name?: string; phone?: string; budget?: number; type?: string; }
interface Reminder { id: string; session_id: string; when: string; note: string; created_at: string; done?: boolean; notified?: boolean; }
interface AuditEntry { id: string; at: string; action: string; session_id?: string; detail?: string; }
interface Template { id: string; text: string; }

const TEMP_COLORS: Record<string, string> = {
  hot: 'bg-red-500/20 text-red-400 border border-red-500/30',
  warm: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
  cold: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
};
const EVENT_ICONS: Record<string, string> = { booking: '📅', image_request: '🖼️', chat: '💬', escalation: '📞', tracking_log: '📊', session_start: '🟢' };

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Event Detail Modal ───────────────────────────────────────────────
function EventModal({ event, onClose }: { event: Event; onClose: () => void }) {
  const data = event.event_data;
  const isTracking = event.event_type === 'tracking_log';
  const isSession = event.event_type === 'session_start';

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
          <button onClick={onClose} className="text-[#8696a0] hover:text-white p-1.5 hover:bg-white/10 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
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
        </div>
      </div>
    </div>
  );
}

// ─── Export Helpers ───────────────────────────────────────────────────
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

// ─── Main Dashboard ───────────────────────────────────────────────────
export default function AdminDashboard() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<'overview' | 'conversations' | 'events'>('overview');
  const [period, setPeriod] = useState<'today' | '7d' | '30d' | '90d'>('7d');
  const [stats, setStats] = useState<Stats | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [lastChecked, setLastChecked] = useState<Date>(new Date(0));
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
  const [templates, setTemplates] = useState<Template[]>([
    { id: 't1', text: 'Thanks for your message. What is your budget range in GHS?' },
    { id: 't2', text: 'Do you prefer SUV, sedan, or pickup?' },
    { id: 't3', text: 'We are on Spintex Road, Accra. Would you like a map pin?' },
  ]);
  const [reminderNote, setReminderNote] = useState('');
  const [reminderWhen, setReminderWhen] = useState('');

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

  useEffect(() => {
    if (authed) { fetchData(); const i = setInterval(fetchData, 30000); return () => clearInterval(i); }
  }, [authed, fetchData]);

  useEffect(() => {
    try {
      const rawN = localStorage.getItem('__adm_notes__');
      const rawT = localStorage.getItem('__adm_tags__');
      if (rawN) setNotes(JSON.parse(rawN));
      if (rawT) setTags(JSON.parse(rawT));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('__adm_notes__', JSON.stringify(notes));
      localStorage.setItem('__adm_tags__', JSON.stringify(tags));
    } catch {}
  }, [notes, tags]);

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
  const bucketByDay = (arr: { created_at: string }[]) => {
    const m: Record<string, number> = {};
    arr.forEach(a => {
      const d = new Date(a.created_at); const k = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
      m[k] = (m[k] || 0) + 1;
    });
    const keys = Object.keys(m).sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
    return keys.map(k => m[k]);
  };
  const sparkSessions = bucketByDay(periodConvos.map(c => ({ created_at: c.started_at })));
  const sparkBookings = bucketByDay(periodBookings);
  const sparkEvents = bucketByDay(periodEvents);
  const trend = (current: number, total: number) => {
    if (total === 0) return 0;
    return Math.round(((current - total / 2) / (total / 2)) * 100);
  };
  const sessionTrend = trend(periodConvos.length, conversations.length || 1);
  const bookingTrend = trend(periodBookings.length, bookingEvents.length || 1);
  const messageCount = conversations.reduce((acc, c) => acc + c.message_count, 0);
  const periodMessageCount = periodConvos.reduce((acc, c) => acc + c.message_count, 0);
  const messageTrend = trend(periodMessageCount, messageCount || 1);
  const avgResponseSec = (() => {
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
    if (deltas.length === 0) return 0;
    const avg = deltas.reduce((s, v) => s + v, 0) / deltas.length;
    return Math.round(avg / 1000);
  })();
  const leadBuckets = {
    hot: periodEvents.filter(e => e.lead_temperature === 'hot').length,
    warm: periodEvents.filter(e => e.lead_temperature === 'warm').length,
    cold: periodEvents.filter(e => e.lead_temperature === 'cold').length,
  };
  const convRate = (() => {
    const total = periodEvents.length || 1;
    return Math.round((leadBuckets.hot / total) * 100);
  })();
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

  const handleExport = (format: 'json' | 'csv', type: 'events' | 'bookings' | 'conversations') => {
    if (type === 'events') {
      const data = events.map(e => ({ time: e.created_at, type: e.event_type, session: e.session_id, intent: e.intent, lead_temperature: e.lead_temperature, data: JSON.stringify(e.event_data) }));
      format === 'json' ? exportJSON(data, 'events.json') : exportCSV(data, 'events.csv');
    } else if (type === 'bookings') {
      const data = bookingEvents.length > 0
        ? bookingEvents.map(e => ({ time: e.created_at, session: e.session_id, intent: e.intent, lead_temperature: e.lead_temperature, ...e.event_data }))
        : [{ note: 'No bookings yet', time: new Date().toISOString() }];
      format === 'json' ? exportJSON(data, 'bookings.json') : exportCSV(data, 'bookings.csv');
    } else {
      const data = conversations.map(c => ({ session_id: c.session_id, started_at: c.started_at, last_message: c.last_message_at, message_count: c.message_count }));
      format === 'json' ? exportJSON(data, 'conversations.json') : exportCSV(data, 'conversations.csv');
    }
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

  const sendAdminMessage = async () => {
    if (!selectedConvo || !adminMsg.trim()) return;
    const payload = {
      eventType: 'message',
      sessionId: selectedConvo.session_id,
      data: { sender: 'assistant', text: adminMsg.trim() },
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
      content: adminMsg.trim(),
      metadata: null,
      created_at: new Date().toISOString(),
    };
    setSelectedConvo(prev => prev ? { ...prev, messages: [...prev.messages, newMessage], message_count: prev.message_count + 1, last_message_at: newMessage.created_at } : prev);
    setConversations(prev => prev.map(c => c.session_id === selectedConvo.session_id
      ? { ...c, messages: [...c.messages, newMessage], message_count: c.message_count + 1, last_message_at: newMessage.created_at }
      : c
    ));
    setAdminMsg('');
    addAudit('admin_message_sent', adminMsg.trim(), selectedConvo.session_id);
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

  const filteredConversations = conversations.filter(c => {
    if (leadFilter !== 'all' && leadTempForSession(c.session_id) !== leadFilter) return false;
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
  });

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

  const dropOff = (() => {
    let afterAssistant = 0;
    let afterUser = 0;
    conversations.forEach(c => {
      const last = c.messages[c.messages.length-1];
      if (!last) return;
      if (last.role === 'assistant') afterAssistant++;
      else afterUser++;
    });
    return { afterAssistant, afterUser };
  })();

  return (
    <div className="min-h-screen bg-[#0b141a] text-white">
      {/* Event Detail Popup */}
      {selectedEvent && <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}

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
        {(['overview', 'conversations', 'events'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-6 py-3 text-sm font-medium capitalize transition ${tab === t ? 'text-[#25D366] border-b-2 border-[#25D366]' : 'text-gray-400 hover:text-white'}`}>
            {t === 'overview' ? '📊 Overview' : t === 'conversations' ? '💬 Conversations' : '⚡ Events'}
          </button>
        ))}
      </div>

      <div className="p-6 max-w-7xl mx-auto">

        {/* ── OVERVIEW ── */}
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
              <select value={leadFilter} onChange={e => setLeadFilter(e.target.value as any)} className="bg-[#1f2c34] border border-[#2f3b43] rounded-lg px-3 py-2 text-sm text-white">
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
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6">
              {[
                { label: 'Total Sessions', value: periodConvos.length, trend: sessionTrend, data: sparkSessions, color: 'text-white' },
                { label: 'Messages', value: periodMessageCount, trend: messageTrend, data: sparkEvents, color: 'text-white' },
                { label: 'Hot Leads', value: leadBuckets.hot, trend: convRate, data: sparkEvents, color: 'text-red-400' },
                { label: 'Warm Leads', value: leadBuckets.warm, trend: 0, data: sparkEvents, color: 'text-yellow-400' },
                { label: 'Cold Leads', value: leadBuckets.cold, trend: 0, data: sparkEvents, color: 'text-blue-400' },
                { label: 'Bookings', value: periodBookings.length, trend: bookingTrend, data: sparkBookings, color: 'text-green-400' },
                { label: 'Avg Response (s)', value: avgResponseSec, trend: 0, data: sparkEvents, color: 'text-white' },
              ].map((card,i) => (
                <div key={i} className="bg-[#111b21]/80 backdrop-blur rounded-xl p-4 border border-[#2f3b43] shadow-lg hover:shadow-xl transition">
                  <div className="flex items-baseline justify-between">
                    <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${card.trend>=0?'bg-[#00a884]/20 text-[#00a884]':'bg-red-500/20 text-red-400'}`}>{card.trend>=0?'↑':'↓'} {Math.abs(card.trend)}%</span>
                  </div>
                  <div className="text-gray-400 text-xs mt-1">{card.label}</div>
                  <div className="mt-3 h-10">
                    <svg width="100%" height="40">
                      {(() => {
                        const d = card.data; if (!d || d.length === 0) return null;
                        const max = Math.max(...d); const step = 100/(d.length-1);
                        const points = d.map((v,idx)=>`${idx*step},${40 - (max? (v/max)*40 : 0)}`).join(' ');
                        return <polyline points={points} fill="none" stroke={card.color.includes('green')?'#25D366':'#8696a0'} strokeWidth="2" />;
                      })()}
                    </svg>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
              <div className="lg:col-span-5 bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-300">Leads Funnel</h3>
                  <span className="text-xs text-gray-500">{period.toUpperCase()}</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Total Leads', value: periodEvents.length, color: 'bg-[#00a884]' },
                    { label: 'Hot Leads', value: leadBuckets.hot, color: 'bg-red-500' },
                    { label: 'Booked', value: periodBookings.length, color: 'bg-purple-500' },
                  ].map(({label,value,color})=>(
                    <div key={label}>
                      <div className="flex justify-between text-xs text-gray-400 mb-1"><span>{label}</span><span>{value}</span></div>
                      <div className="h-2 bg-[#111b21] rounded-full overflow-hidden">
                        <div className={`h-2 ${color} rounded-full`} style={{ width: `${periodEvents.length>0? Math.max((value/periodEvents.length)*100, value>0?5:0):0}%` }} />
                      </div>
                    </div>
                  ))}
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
                      const d = bucketByDay(periodBookings); if (d.length===0) return null;
                      const max = Math.max(...d); const step = 100/(d.length-1);
                      const pts = d.map((v,i)=>`${i*step},${144 - (max? (v/max)*120 : 0)}`).join(' ');
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
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Lead Pipeline</h3>
                <div className="space-y-2">
                  {(['cold','warm','hot','booked'] as const).map(stage => (
                    <div key={stage} className="flex items-center justify-between text-xs bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2">
                      <span className="capitalize text-gray-300">{stage}</span>
                      <span className="text-white font-semibold">
                        {stage === 'booked' ? periodBookings.length : leadBuckets[stage as 'cold'|'warm'|'hot']}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Top Requested Models</h3>
                {topModels.length === 0 ? (
                  <p className="text-gray-500 text-sm">No model data yet.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {topModels.map((m, i) => (
                      <div key={i} className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2">
                        <span className="text-gray-300 capitalize">{m.name}</span>
                        <span className="text-white font-semibold">{m.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Drop-off Points</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2">
                    <span className="text-gray-300">After Assistant Reply</span>
                    <span className="text-white font-semibold">{dropOff.afterAssistant}</span>
                  </div>
                  <div className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2">
                    <span className="text-gray-300">After User Message</span>
                    <span className="text-white font-semibold">{dropOff.afterUser}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Hot Leads */}
            <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-xl p-5 mb-6">
              <h2 className="font-semibold mb-4 text-gray-300">Hot Leads (Call Now)</h2>
              {hotLeads.length === 0 ? (
                <p className="text-gray-500 text-sm">No hot leads yet.</p>
              ) : (
                <div className="space-y-2">
                  {hotLeads.slice(0, 10).map(h => (
                    <div key={h.session_id} className="flex items-center justify-between bg-[#0b141a] border border-[#2f3b43] rounded-lg px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium">Session {h.session_id.slice(0, 8)}...</p>
                        <p className="text-gray-500 text-xs truncate">{h.messages[h.messages.length-1]?.content?.slice(0, 60)}</p>
                      </div>
                      <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 transition border border-[#25D366]/30">
                        <PhoneCall className="w-3 h-3" /> Call now
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
                      <select className="text-xs px-2 py-2 rounded-lg bg-[#2a3942] text-white">
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
                        <span className="text-gray-600 group-hover:text-gray-400 text-xs">›</span>
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

        {/* ── CONVERSATIONS ── */}
        {tab === 'conversations' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: 'calc(100vh - 200px)' }}>
            <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-xl overflow-y-auto">
              <div className="p-4 border-b border-[#2f3b43] sticky top-0 bg-[#1f2c34] space-y-3">
                <h2 className="font-semibold text-gray-300">All Conversations ({filteredConversations.length})</h2>
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
                  <select value={leadFilter} onChange={e => setLeadFilter(e.target.value as any)} className="bg-[#111b21] border border-[#2f3b43] rounded-lg px-2 py-1.5 text-xs text-white">
                    <option value="all">All</option>
                    <option value="hot">Hot</option>
                    <option value="warm">Warm</option>
                    <option value="cold">Cold</option>
                  </select>
                </div>
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
                        Session {convo.session_id.slice(0, 8)}...
                        {new Date(convo.last_message_at).getTime() > new Date(readMap[convo.session_id] || lastChecked).getTime() && (
                          <span className="inline-block w-2 h-2 rounded-full bg-[#25D366]" />
                        )}
                      </span>
                      <span className="text-xs text-gray-500">{timeAgo(convo.last_message_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">{convo.message_count} messages</span>
                      {leadTempForSession(convo.session_id) !== 'unknown' && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${TEMP_COLORS[leadTempForSession(convo.session_id)] || ''}`}>
                          {leadTempForSession(convo.session_id)}
                        </span>
                      )}
                    </div>
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
                    <h2 className="font-semibold text-gray-300">Session: {selectedConvo.session_id}</h2>
                    <p className="text-xs text-gray-500">Started {new Date(selectedConvo.started_at).toLocaleString()}</p>
                    <div className="mt-3 grid grid-cols-1 lg:grid-cols-3 gap-3">
                      <div className="bg-[#111b21] border border-[#2f3b43] rounded-lg p-3 lg:col-span-2">
                        <div className="text-[10px] text-gray-400 uppercase mb-2 flex items-center gap-1"><User className="w-3 h-3" /> Lead Profile</div>
                        {(() => {
                          const lead = buildLeadProfile(selectedConvo);
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
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#2a3942] text-[#e9edef]">{t}</span>
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
                        </div>
                      </div>
                      <div className="bg-[#111b21] border border-[#2f3b43] rounded-lg p-3">
                        <div className="text-[10px] text-gray-400 uppercase mb-2 flex items-center gap-1"><Bell className="w-3 h-3" /> Reminders</div>
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
                            onClick={() => setAdminMsg(t.text)}
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

        {/* ── EVENTS ── */}
        {tab === 'events' && (
          <div className="bg-[#1f2c34] border border-[#2f3b43] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#2f3b43] flex items-center justify-between">
              <h2 className="font-semibold text-gray-300">All Events ({events.length}) <span className="text-gray-500 text-xs font-normal ml-1">— click row for details</span></h2>
              <div className="flex gap-2">
                <button onClick={() => handleExport('csv', 'events')} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#25D366]/20 text-[#25D366] hover:bg-[#25D366]/30 transition border border-[#25D366]/30">
                  <Download className="w-3 h-3" /> CSV
                </button>
                <button onClick={() => handleExport('json', 'events')} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#2a3942] text-white hover:bg-[#3d4f5c] transition">
                  <Download className="w-3 h-3" /> JSON
                </button>
              </div>
            </div>
            {events.length === 0 ? <p className="text-gray-500 text-sm p-4">No events yet.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[#2f3b43] text-gray-400 bg-[#111b21]">
                    <tr>
                      <th className="text-left px-4 py-3">Event</th>
                      <th className="text-left px-4 py-3">Session</th>
                      <th className="text-left px-4 py-3">Intent</th>
                      <th className="text-left px-4 py-3">Lead</th>
                      <th className="text-left px-4 py-3">Data Preview</th>
                      <th className="text-left px-4 py-3">Time</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((evt, i) => (
                      <tr key={i} onClick={() => setSelectedEvent(evt)}
                        className="border-b border-[#2f3b43] hover:bg-[#2a3942] cursor-pointer transition group">
                        <td className="px-4 py-3"><span className="mr-2">{EVENT_ICONS[evt.event_type] || '📌'}</span><span className="capitalize">{evt.event_type.replace(/_/g, ' ')}</span></td>
                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">{evt.session_id.slice(0, 12)}...</td>
                        <td className="px-4 py-3 text-gray-400 capitalize">{evt.intent || '—'}</td>
                        <td className="px-4 py-3">
                          {evt.lead_temperature && evt.lead_temperature !== 'unknown'
                            ? <span className={`text-xs px-2 py-0.5 rounded-full ${TEMP_COLORS[evt.lead_temperature] || ''}`}>{evt.lead_temperature}</span>
                            : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-xs font-mono max-w-[180px] truncate">{evt.event_data ? JSON.stringify(evt.event_data).slice(0, 50) : '—'}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{timeAgo(evt.created_at)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(evt); }}
                            className="text-xs px-3 py-1 rounded-lg bg-[#00a884]/20 text-[#00a884] hover:bg-[#00a884]/30 border border-[#00a884]/30 transition font-medium"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
