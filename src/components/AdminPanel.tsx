import { useState, useEffect, useCallback } from 'react';
import { logService, TrackingLog, Booking, ChatSession } from '../services/logService';
import {
  ArrowLeft, BarChart3, Users, MessageSquare, TrendingUp,
  CalendarCheck, Download, FileJson, FileSpreadsheet, Eye, X,
  RefreshCw, Trash2, Flame, Thermometer, Snowflake, Clock
} from 'lucide-react';

interface AdminPanelProps { onBack: () => void; }

export function AdminPanel({ onBack }: AdminPanelProps) {
  const [logs, setLogs] = useState<TrackingLog[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'bookings' | 'logs'>('overview');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [serverEvents, setServerEvents] = useState<any[]>([]);

  const refresh = useCallback(async () => {
    const logsData = await logService.getLogs();
    const bookingsData = await logService.getBookings();
    const sessions = await logService.getChatSessions();
    setLogs([...logsData]);
    setBookings([...bookingsData]);
    setChatSessions([...sessions]);
    setLastRefresh(new Date());
  }, []);

  // Fetch server-side events
  const fetchServerEvents = useCallback(async () => {
    try {
      const res = await fetch('/api/log');
      const data = await res.json();
      setServerEvents(data.events || []);
    } catch {}
  }, []);

  useEffect(() => {
    refresh();
    fetchServerEvents();
    const unsubscribe = logService.subscribe(refresh);
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => { refresh(); fetchServerEvents(); }, 10000);
    return () => { unsubscribe(); clearInterval(interval); };
  }, [refresh, fetchServerEvents]);

  const handleClearData = () => {
    if (window.confirm('Clear ALL dashboard data? This cannot be undone.')) {
      // Clear local data
      localStorage.clear();
      sessionStorage.clear();
      setServerEvents([]);
      refresh();
      window.location.reload();
    }
  };

  const downloadJSON = async () => {
    const jsonData = await logService.exportToJSON();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `abena-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const downloadCSV = async () => {
    const csvData = await logService.exportToCSV();
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `sessions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const downloadBookingsCSV = async () => {
    const csvData = await logService.exportToCSV();
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const tempColor = (t: string) => ({
    hot: 'text-red-600 bg-red-50 border-red-200',
    warm: 'text-orange-500 bg-orange-50 border-orange-200',
    cold: 'text-blue-500 bg-blue-50 border-blue-200',
  }[t.toLowerCase()] || 'text-gray-500 bg-gray-50 border-gray-200');

  const TempIcon = ({ t }: { t: string }) => {
    if (t === 'hot') return <Flame className="w-3 h-3 inline mr-1" />;
    if (t === 'warm') return <Thermometer className="w-3 h-3 inline mr-1" />;
    return <Snowflake className="w-3 h-3 inline mr-1" />;
  };

  const hotCount = logs.filter(l => l.lead_temperature === 'hot').length;
  const warmCount = logs.filter(l => l.lead_temperature === 'warm').length;
  const convRate = logs.length > 0 ? ((hotCount / logs.length) * 100).toFixed(1) : '0';
  const totalMessages = chatSessions.reduce((acc, s) => acc + s.messages.length, 0);

  const tabs = ['overview', 'sessions', 'bookings', 'logs'];

  return (
    <>
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
        {/* Top Bar */}
        <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Abena Admin Dashboard</h1>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { refresh(); fetchServerEvents(); }} className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
            <button onClick={downloadJSON} className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors">
              <FileJson className="w-4 h-4" /> JSON
            </button>
            <button onClick={downloadCSV} className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm transition-colors">
              <FileSpreadsheet className="w-4 h-4" /> CSV
            </button>
            <button onClick={downloadBookingsCSV} className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition-colors">
              <Download className="w-4 h-4" /> Bookings
            </button>
            <button onClick={handleClearData} className="flex items-center gap-2 px-3 py-2 bg-red-900/50 hover:bg-red-800 rounded-lg text-sm text-red-300 transition-colors">
              <Trash2 className="w-4 h-4" /> Clear
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Sessions', value: chatSessions.length, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Total Messages', value: totalMessages, icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Hot Leads', value: hotCount, icon: Flame, color: 'text-red-400', bg: 'bg-red-500/10' },
              { label: 'Bookings', value: bookings.length, icon: CalendarCheck, color: 'text-purple-400', bg: 'bg-purple-500/10' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div className="text-3xl font-bold text-white mb-1">{value}</div>
                <div className="text-sm text-slate-400">{label}</div>
              </div>
            ))}
          </div>

          {/* Mini charts row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {/* Lead distribution */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 md:col-span-2">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Lead Distribution</h3>
              <div className="flex gap-3 h-28 items-end">
                {[
                  { label: 'Cold', count: logs.filter(l => l.lead_temperature === 'cold').length, color: 'bg-blue-500' },
                  { label: 'Warm', count: warmCount, color: 'bg-orange-400' },
                  { label: 'Hot', count: hotCount, color: 'bg-red-500' },
                ].map(({ label, count, color }) => (
                  <div key={label} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-xs text-slate-400 font-medium">{count}</span>
                    <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
                      <div
                        className={`w-full ${color} rounded-t-md transition-all duration-700`}
                        style={{ height: `${logs.length > 0 ? Math.max((count / logs.length) * 80, count > 0 ? 8 : 0) : 0}px` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Conversion funnel */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Funnel</h3>
              <div className="space-y-3">
                {[
                  { label: 'Visitors', value: chatSessions.length, color: 'bg-blue-500' },
                  { label: 'Engaged', value: logs.filter(l => l.lead_temperature !== 'cold').length, color: 'bg-orange-400' },
                  { label: 'Hot', value: hotCount, color: 'bg-red-500' },
                  { label: 'Booked', value: bookings.length, color: 'bg-purple-500' },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs text-slate-400 mb-1"><span>{label}</span><span>{value}</span></div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`${color} h-full rounded-full transition-all duration-700`}
                        style={{ width: `${chatSessions.length > 0 ? Math.max((value / chatSessions.length) * 100, value > 0 ? 5 : 0) : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-4">Conversion rate: <span className="text-emerald-400 font-bold">{convRate}%</span></p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 mb-6 w-fit">
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${activeTab === tab ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                {tab}
              </button>
            ))}
          </div>

          {/* Tab: Overview = server events */}
          {activeTab === 'overview' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                <h2 className="font-bold text-white">Live Server Events</h2>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full font-medium">{serverEvents.length} events</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-xs uppercase text-slate-500 border-b border-slate-800">
                    <th className="px-6 py-3 text-left">Time</th>
                    <th className="px-6 py-3 text-left">Event</th>
                    <th className="px-6 py-3 text-left">Details</th>
                  </tr></thead>
                  <tbody>
                    {serverEvents.length === 0 ? (
                      <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-500 italic">No server events yet. Chat to generate events.</td></tr>
                    ) : (
                      [...serverEvents].reverse().slice(0, 50).map((ev, i) => (
                        <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                          <td className="px-6 py-3 text-slate-400 whitespace-nowrap text-xs">{new Date(ev.serverTimestamp || ev.timestamp).toLocaleString()}</td>
                          <td className="px-6 py-3"><span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-emerald-400">{ev.eventType}</span></td>
                          <td className="px-6 py-3 text-slate-400 text-xs truncate max-w-xs">{JSON.stringify(ev.data).substring(0, 100)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Sessions */}
          {activeTab === 'sessions' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                <h2 className="font-bold text-white">Chat Sessions</h2>
                <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full font-medium">{chatSessions.length} total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-xs uppercase text-slate-500 border-b border-slate-800">
                    <th className="px-6 py-3 text-left">Session</th>
                    <th className="px-6 py-3 text-left">Customer</th>
                    <th className="px-6 py-3 text-left">Messages</th>
                    <th className="px-6 py-3 text-left">Lead</th>
                    <th className="px-6 py-3 text-left">Started</th>
                    <th className="px-6 py-3 text-left">Action</th>
                  </tr></thead>
                  <tbody>
                    {chatSessions.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">No sessions yet. Start a conversation.</td></tr>
                    ) : chatSessions.map(s => (
                      <tr key={s.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-6 py-3 text-xs font-mono text-slate-400">{s.id.substring(0, 20)}...</td>
                        <td className="px-6 py-3 font-medium text-white">{s.userInfo.name || <span className="text-slate-500 italic">Anonymous</span>}{s.userInfo.phone && <span className="text-xs text-slate-400 block">{s.userInfo.phone}</span>}</td>
                        <td className="px-6 py-3 text-slate-300">{s.messages.length}</td>
                        <td className="px-6 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-full border ${tempColor(s.leadTemperature)}`}><TempIcon t={s.leadTemperature} />{s.leadTemperature}</span></td>
                        <td className="px-6 py-3 text-slate-400 text-xs">{new Date(s.startTime).toLocaleString()}</td>
                        <td className="px-6 py-3"><button onClick={() => setSelectedSession(s)} className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs font-medium"><Eye className="w-4 h-4" /> View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Bookings */}
          {activeTab === 'bookings' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                <h2 className="font-bold text-white">Confirmed Bookings</h2>
                <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full font-medium">{bookings.length} total</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-xs uppercase text-slate-500 border-b border-slate-800">
                    <th className="px-6 py-3 text-left">Booking ID</th>
                    <th className="px-6 py-3 text-left">Time</th>
                    <th className="px-6 py-3 text-left">Customer</th>
                    <th className="px-6 py-3 text-left">Car ID</th>
                    <th className="px-6 py-3 text-left">Status</th>
                  </tr></thead>
                  <tbody>
                    {bookings.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">No bookings yet.</td></tr>
                    ) : bookings.map(b => (
                      <tr key={b.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-6 py-3 font-bold text-emerald-400">{b.id}</td>
                        <td className="px-6 py-3 text-slate-400 text-xs">{new Date(b.timestamp).toLocaleString()}</td>
                        <td className="px-6 py-3 text-white">{b.customer_name || 'N/A'}{b.customer_phone && <span className="text-xs text-slate-400 block">{b.customer_phone}</span>}</td>
                        <td className="px-6 py-3 font-mono text-slate-300">#{b.car_id}</td>
                        <td className="px-6 py-3"><span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">{b.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab: Logs */}
          {activeTab === 'logs' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                <h2 className="font-bold text-white">Tracking Logs</h2>
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full font-medium">{logs.length} events</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="text-xs uppercase text-slate-500 border-b border-slate-800">
                    <th className="px-6 py-3 text-left">Time</th>
                    <th className="px-6 py-3 text-left">Intent</th>
                    <th className="px-6 py-3 text-left">Lead Temp</th>
                    <th className="px-6 py-3 text-left">Car</th>
                    <th className="px-6 py-3 text-left">Message Preview</th>
                  </tr></thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">No logs yet. Start a conversation.</td></tr>
                    ) : logs.map(log => (
                      <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-6 py-3 text-slate-400 text-xs whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</td>
                        <td className="px-6 py-3"><span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded text-slate-300">{log.intent}</span></td>
                        <td className="px-6 py-3"><span className={`text-xs font-bold px-2 py-1 rounded-full border ${tempColor(log.lead_temperature)}`}><TempIcon t={log.lead_temperature} />{log.lead_temperature}</span></td>
                        <td className="px-6 py-3 font-mono text-slate-400 text-xs">{log.recommended_car_id || '-'}</td>
                        <td className="px-6 py-3 text-slate-400 text-xs truncate max-w-xs">{log.messageText.substring(0, 80)}{log.messageText.length > 80 ? '...' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedSession(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white">Conversation Viewer</h3>
                <p className="text-xs text-slate-400 mt-1">{selectedSession.userInfo.name || 'Anonymous'} Â· {new Date(selectedSession.startTime).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-bold px-2 py-1 rounded-full border ${tempColor(selectedSession.leadTemperature)}`}>
                  <TempIcon t={selectedSession.leadTemperature} />{selectedSession.leadTemperature}
                </span>
                <button onClick={() => setSelectedSession(null)} className="p-2 hover:bg-slate-800 rounded-lg"><X className="w-4 h-4 text-slate-400" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#0b141a]">
              {selectedSession.messages.length === 0 ? (
                <p className="text-center text-slate-500 italic py-8">No messages in this session</p>
              ) : selectedSession.messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2 rounded-lg text-sm ${msg.sender === 'user' ? 'bg-[#005c4b] text-white rounded-br-none' : 'bg-[#202c33] text-slate-100 rounded-bl-none'}`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    <p className="text-xs opacity-50 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

