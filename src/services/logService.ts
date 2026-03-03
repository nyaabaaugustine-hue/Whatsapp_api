import { Message } from '../types';

export interface UserInfo {
  name?: string;
  phone?: string;
  email?: string;
}

export interface ChatSession {
  id: string;
  startTime: Date;
  lastActivity: Date;
  userInfo: UserInfo;
  messages: Message[];
  leadTemperature: 'cold' | 'warm' | 'hot';
  intent: string;
}

export interface Booking {
  id: string;
  timestamp: Date;
  car_id: string;
  customer_email: string;
  customer_name?: string;
  customer_phone?: string;
  status: 'confirmed' | 'pending';
}

export interface TrackingLog {
  id: string;
  timestamp: Date;
  intent: string;
  lead_temperature: string;
  recommended_car_id?: string;
  messageText: string;
}

const STORAGE_KEYS = {
  logs: 'abena_logs',
  bookings: 'abena_bookings',
  sessions: 'abena_sessions',
};

function loadFromStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Rehydrate Date objects
    return parsed.map((item: any) => {
      const rehydrated: any = { ...item };
      ['timestamp', 'startTime', 'lastActivity'].forEach(field => {
        if (rehydrated[field]) rehydrated[field] = new Date(rehydrated[field]);
      });
      if (rehydrated.messages) {
        rehydrated.messages = rehydrated.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      }
      return rehydrated;
    });
  } catch {
    return [];
  }
}

function saveToStorage<T>(key: string, data: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Storage quota exceeded, trimming logs...');
    // Trim oldest half if storage is full
    const trimmed = (data as any[]).slice(Math.floor((data as any[]).length / 2));
    localStorage.setItem(key, JSON.stringify(trimmed));
  }
}

class LogService {
  private logs: TrackingLog[] = loadFromStorage<TrackingLog>(STORAGE_KEYS.logs);
  private bookings: Booking[] = loadFromStorage<Booking>(STORAGE_KEYS.bookings);
  private chatSessions: ChatSession[] = loadFromStorage<ChatSession>(STORAGE_KEYS.sessions);
  private currentSession: ChatSession | null = null;
  private listeners: (() => void)[] = [];

  startNewSession() {
    this.currentSession = {
      id: `SESSION-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      startTime: new Date(),
      lastActivity: new Date(),
      userInfo: {},
      messages: [],
      leadTemperature: 'cold',
      intent: 'browsing'
    };
    this.chatSessions.unshift(this.currentSession);
    saveToStorage(STORAGE_KEYS.sessions, this.chatSessions);
    this.notify();
    // Also persist to server
    this.persistToServer('session_start', { sessionId: this.currentSession.id });
  }

  addMessageToSession(message: Message) {
    if (!this.currentSession) this.startNewSession();
    this.currentSession!.messages.push(message);
    this.currentSession!.lastActivity = new Date();
    // Update session in storage
    const idx = this.chatSessions.findIndex(s => s.id === this.currentSession!.id);
    if (idx !== -1) this.chatSessions[idx] = this.currentSession!;
    saveToStorage(STORAGE_KEYS.sessions, this.chatSessions);
    // Persist message to server
    this.persistToServer('message', {
      sessionId: this.currentSession!.id,
      sender: message.sender,
      text: message.text,
      timestamp: message.timestamp
    });
    this.notify();
  }

  updateUserInfo(userInfo: Partial<UserInfo>) {
    if (!this.currentSession) this.startNewSession();
    this.currentSession!.userInfo = { ...this.currentSession!.userInfo, ...userInfo };
    const idx = this.chatSessions.findIndex(s => s.id === this.currentSession!.id);
    if (idx !== -1) this.chatSessions[idx] = this.currentSession!;
    saveToStorage(STORAGE_KEYS.sessions, this.chatSessions);
    this.notify();
  }

  updateSessionMetadata(leadTemperature?: string, intent?: string) {
    if (this.currentSession) {
      if (leadTemperature) this.currentSession.leadTemperature = leadTemperature as 'cold' | 'warm' | 'hot';
      if (intent) this.currentSession.intent = intent;
      const idx = this.chatSessions.findIndex(s => s.id === this.currentSession!.id);
      if (idx !== -1) this.chatSessions[idx] = this.currentSession!;
      saveToStorage(STORAGE_KEYS.sessions, this.chatSessions);
      this.notify();
    }
  }

  addLog(log: Omit<TrackingLog, 'id' | 'timestamp'>) {
    const newLog: TrackingLog = {
      ...log,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
    };
    this.logs.unshift(newLog);
    saveToStorage(STORAGE_KEYS.logs, this.logs);
    this.updateSessionMetadata(log.lead_temperature, log.intent);
    this.persistToServer('tracking_log', newLog);
    this.notify();
  }

  addBooking(booking: Omit<Booking, 'id' | 'timestamp'>) {
    const newBooking: Booking = {
      ...booking,
      id: `BK-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      timestamp: new Date(),
      customer_name: this.currentSession?.userInfo.name,
      customer_phone: this.currentSession?.userInfo.phone,
    };
    this.bookings.unshift(newBooking);
    saveToStorage(STORAGE_KEYS.bookings, this.bookings);
    this.addLog({
      intent: 'booking_confirmed',
      lead_temperature: 'hot',
      recommended_car_id: booking.car_id,
      messageText: `Booking confirmed for car ${booking.car_id}`
    });
    this.persistToServer('booking', newBooking);
    this.notify();
    return newBooking;
  }

  getLogs() { return this.logs; }
  getBookings() { return this.bookings; }
  getChatSessions() { return this.chatSessions; }
  getCurrentSession() { return this.currentSession; }

  clearCurrentSession() { this.currentSession = null; }

  clearAllData() {
    this.logs = [];
    this.bookings = [];
    this.chatSessions = [];
    this.currentSession = null;
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
    this.notify();
  }

  private async persistToServer(eventType: string, data: any) {
    try {
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType,
          sessionId: this.currentSession?.id || null,
          data,
          timestamp: new Date().toISOString()
        })
      });
    } catch {
      // Silent fail — localStorage is the source of truth
    }
  }

  exportToJSON() {
    return JSON.stringify({
      chatSessions: this.chatSessions,
      bookings: this.bookings,
      logs: this.logs,
      exportDate: new Date().toISOString()
    }, null, 2);
  }

  exportToCSV() {
    const headers = ['Session ID', 'Start Time', 'Customer Name', 'Phone', 'Email', 'Lead Temp', 'Intent', 'Messages', 'Last Activity'];
    const rows = this.chatSessions.map(s => [
      s.id, s.startTime.toLocaleString(), s.userInfo.name || 'N/A',
      s.userInfo.phone || 'N/A', s.userInfo.email || 'N/A',
      s.leadTemperature, s.intent, s.messages.length.toString(),
      s.lastActivity.toLocaleString()
    ]);
    return [headers, ...rows].map(r => r.join(',')).join('\n');
  }

  exportBookingsToCSV() {
    const headers = ['Booking ID', 'Timestamp', 'Customer Name', 'Phone', 'Email', 'Car ID', 'Status'];
    const rows = this.bookings.map(b => [
      b.id, b.timestamp.toLocaleString(), b.customer_name || 'N/A',
      b.customer_phone || 'N/A', b.customer_email || 'N/A', b.car_id, b.status
    ]);
    return [headers, ...rows].map(r => r.join(',')).join('\n');
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  private notify() { this.listeners.forEach(l => l()); }
}

export const logService = new LogService();
