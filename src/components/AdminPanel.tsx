import { useState, useEffect } from 'react';
import { logService, TrackingLog, Booking, ChatSession } from '../services/logService';
import { ArrowLeft, BarChart3, Users, MessageSquare, TrendingUp, CalendarCheck, Download, FileJson, FileSpreadsheet, Eye, X } from 'lucide-react';

interface AdminPanelProps {
  onBack: () => void;
}

export function AdminPanel({ onBack }: AdminPanelProps) {
  const [logs, setLogs] = useState<TrackingLog[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);

  useEffect(() => {
    setLogs(logService.getLogs());
    setBookings(logService.getBookings());
    setChatSessions(logService.getChatSessions());
    return logService.subscribe(() => {
      setLogs(logService.getLogs());
      setBookings(logService.getBookings());
      setChatSessions(logService.getChatSessions());
    });
  }, []);

  const downloadJSON = () => {
    const dataStr = logService.exportToJSON();
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const dataStr = logService.exportToCSV();
    const dataBlob = new Blob([dataStr], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-sessions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadBookingsCSV = () => {
    const dataStr = logService.exportBookingsToCSV();
    const dataBlob = new Blob([dataStr], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getTemperatureColor = (temp: string) => {
    switch (temp.toLowerCase()) {
      case 'hot': return 'text-red-600 bg-red-50 border-red-100';
      case 'warm': return 'text-orange-600 bg-orange-50 border-orange-100';
      case 'cold': return 'text-blue-600 bg-blue-50 border-blue-100';
      default: return 'text-gray-600 bg-gray-50 border-gray-100';
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-white rounded-full transition-colors shadow-sm border border-gray-200"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={downloadJSON}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
            >
              <FileJson className="w-4 h-4" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={downloadCSV}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={downloadBookingsCSV}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Bookings CSV</span>
            </button>
          </div>
        </div>
          <div className="text-sm text-gray-500 font-medium">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">Active</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{logs.length}</div>
            <div className="text-sm text-gray-500">Total Interactions</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-50 rounded-lg">
                <CalendarCheck className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-full">Bookings</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{bookings.length}</div>
            <div className="text-sm text-gray-500">Confirmed Bookings</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full">High Value</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {logs.filter(l => l.lead_temperature === 'hot').length}
            </div>
            <div className="text-sm text-gray-500">Hot Leads</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                {logs.length > 0 ? Math.round((logs.filter(l => l.lead_temperature === 'hot').length / logs.length) * 100) : 0}%
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {logs.length > 0 ? ((logs.filter(l => l.lead_temperature === 'hot').length / logs.length) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-sm text-gray-500">Conversion Rate (Hot)</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-gray-50 rounded-lg">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {new Set(logs.map(l => l.intent)).size}
            </div>
            <div className="text-sm text-gray-500">Active Segments</div>
          </div>
        </div>

        {/* Advanced Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-900 mb-6 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
              Lead Temperature Distribution
            </h2>
            <div className="flex items-end space-x-4 h-48">
              {['cold', 'warm', 'hot'].map((temp) => {
                const count = logs.filter(l => l.lead_temperature === temp).length;
                const height = logs.length > 0 ? (count / logs.length) * 100 : 0;
                return (
                  <div key={temp} className="flex-1 flex flex-col items-center group">
                    <div className="w-full relative">
                      <div 
                        className={`w-full rounded-t-lg transition-all duration-500 group-hover:opacity-80 ${
                          temp === 'hot' ? 'bg-red-500' : temp === 'warm' ? 'bg-orange-400' : 'bg-blue-400'
                        }`}
                        style={{ height: `${Math.max(height, 5)}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          {count}
                        </div>
                      </div>
                    </div>
                    <span className="mt-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{temp}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="font-bold text-gray-900 mb-6 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-emerald-600" />
              Sales Funnel
            </h2>
            <div className="space-y-6">
              {[
                { label: 'Total Visits', value: logs.length, color: 'bg-blue-500' },
                { label: 'Engaged (Warm)', value: logs.filter(l => l.lead_temperature !== 'cold').length, color: 'bg-orange-400' },
                { label: 'High Intent (Hot)', value: logs.filter(l => l.lead_temperature === 'hot').length, color: 'bg-red-500' }
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">
                    <span>{item.label}</span>
                    <span>{item.value}</span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`${item.color} h-full transition-all duration-1000`}
                      style={{ width: `${logs.length > 0 ? (item.value / logs.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Sessions Table */}
        <div className="grid grid-cols-1 gap-8 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="font-bold text-gray-900">Chat Sessions</h2>
              <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-md uppercase">{chatSessions.length} Total</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                    <th className="px-6 py-4 font-semibold">Session ID</th>
                    <th className="px-6 py-4 font-semibold">Customer</th>
                    <th className="px-6 py-4 font-semibold">Phone</th>
                    <th className="px-6 py-4 font-semibold">Messages</th>
                    <th className="px-6 py-4 font-semibold">Lead Temp</th>
                    <th className="px-6 py-4 font-semibold">Started</th>
                    <th className="px-6 py-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {chatSessions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-500 italic">
                        No chat sessions yet. Start a conversation to see data here.
                      </td>
                    </tr>
                  ) : (
                    chatSessions.map((session) => (
                      <tr key={session.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-mono text-gray-500">
                          {session.id.substring(0, 16)}...
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                          {session.userInfo.name || 'Anonymous'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {session.userInfo.phone || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {session.messages.length} messages
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getTemperatureColor(session.leadTemperature)}`}>
                            {session.leadTemperature}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {session.startTime.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedSession(session)}
                            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-xs font-bold"
                          >
                            <Eye className="w-4 h-4" />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        <div className="grid grid-cols-1 gap-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="font-bold text-gray-900">Confirmed Bookings</h2>
              <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-1 rounded-md uppercase">Real-time</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                    <th className="px-6 py-4 font-semibold">Booking ID</th>
                    <th className="px-6 py-4 font-semibold">Time</th>
                    <th className="px-6 py-4 font-semibold">Car ID</th>
                    <th className="px-6 py-4 font-semibold">Customer Email</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                        No confirmed bookings yet.
                      </td>
                    </tr>
                  ) : (
                    bookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                          {booking.id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {booking.timestamp.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-gray-500">
                          {booking.car_id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {booking.customer_email}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-bold text-gray-900">Tracking Logs</h2>
            </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <th className="px-6 py-4 font-semibold">Time</th>
                  <th className="px-6 py-4 font-semibold">Intent</th>
                  <th className="px-6 py-4 font-semibold">Temperature</th>
                  <th className="px-6 py-4 font-semibold">Car ID</th>
                  <th className="px-6 py-4 font-semibold">Response Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                      No tracking data available yet. Start a chat to see logs.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {log.timestamp.toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-md uppercase tracking-tight">
                          {log.intent}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getTemperatureColor(log.lead_temperature)}`}>
                          {log.lead_temperature}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-500">
                        {log.recommended_car_id || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 truncate max-w-xs">
                          {log.messageText}
                        </p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    {/* Chat Session Modal */}
    {selectedSession && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedSession(null)}>
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Chat Session Details</h3>
              <p className="text-sm text-gray-500 mt-1">
                {selectedSession.userInfo.name || 'Anonymous'} • {selectedSession.userInfo.phone || 'No phone'}
              </p>
            </div>
            <button
              onClick={() => setSelectedSession(null)}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Session ID</p>
                <p className="text-sm font-mono text-gray-900 mt-1">{selectedSession.id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Lead Temperature</p>
                <span className={`inline-block mt-1 text-xs font-bold px-2 py-1 rounded-full border ${getTemperatureColor(selectedSession.leadTemperature)}`}>
                  {selectedSession.leadTemperature}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Started</p>
                <p className="text-sm text-gray-900 mt-1">{selectedSession.startTime.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase">Last Activity</p>
                <p className="text-sm text-gray-900 mt-1">{selectedSession.lastActivity.toLocaleString()}</p>
              </div>
              {selectedSession.userInfo.email && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500 font-semibold uppercase">Email</p>
                  <p className="text-sm text-gray-900 mt-1">{selectedSession.userInfo.email}</p>
                </div>
              )}
            </div>

            <h4 className="font-bold text-gray-900 mb-4">Conversation ({selectedSession.messages.length} messages)</h4>
            <div className="space-y-3">
              {selectedSession.messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.sender === 'user' 
                      ? 'bg-[#005c4b] text-white' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
