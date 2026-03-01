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

class LogService {
  private logs: TrackingLog[] = [];
  private bookings: Booking[] = [];
  private chatSessions: ChatSession[] = [];
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
    this.notify();
  }

  addMessageToSession(message: Message) {
    if (!this.currentSession) {
      this.startNewSession();
    }
    this.currentSession!.messages.push(message);
    this.currentSession!.lastActivity = new Date();
    this.notify();
  }

  updateUserInfo(userInfo: Partial<UserInfo>) {
    if (!this.currentSession) {
      this.startNewSession();
    }
    this.currentSession!.userInfo = {
      ...this.currentSession!.userInfo,
      ...userInfo
    };
    this.notify();
  }

  updateSessionMetadata(leadTemperature?: string, intent?: string) {
    if (this.currentSession) {
      if (leadTemperature) {
        this.currentSession.leadTemperature = leadTemperature as 'cold' | 'warm' | 'hot';
      }
      if (intent) {
        this.currentSession.intent = intent;
      }
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
    
    // Update session metadata
    this.updateSessionMetadata(log.lead_temperature, log.intent);
    
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
    
    // Also add to logs for visibility
    this.addLog({
      intent: 'booking_confirmed',
      lead_temperature: 'hot',
      recommended_car_id: booking.car_id,
      messageText: `Booking confirmed for car ${booking.car_id}`
    });
    
    this.notify();
    return newBooking;
  }

  getLogs() {
    return this.logs;
  }

  getBookings() {
    return this.bookings;
  }

  getChatSessions() {
    return this.chatSessions;
  }

  getCurrentSession() {
    return this.currentSession;
  }

  clearCurrentSession() {
    this.currentSession = null;
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
    // Export chat sessions as CSV
    const headers = ['Session ID', 'Start Time', 'Customer Name', 'Phone', 'Email', 'Lead Temp', 'Intent', 'Messages Count', 'Last Activity'];
    const rows = this.chatSessions.map(session => [
      session.id,
      session.startTime.toLocaleString(),
      session.userInfo.name || 'N/A',
      session.userInfo.phone || 'N/A',
      session.userInfo.email || 'N/A',
      session.leadTemperature,
      session.intent,
      session.messages.length.toString(),
      session.lastActivity.toLocaleString()
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  exportBookingsToCSV() {
    const headers = ['Booking ID', 'Timestamp', 'Customer Name', 'Phone', 'Email', 'Car ID', 'Status'];
    const rows = this.bookings.map(booking => [
      booking.id,
      booking.timestamp.toLocaleString(),
      booking.customer_name || 'N/A',
      booking.customer_phone || 'N/A',
      booking.customer_email || 'N/A',
      booking.car_id,
      booking.status
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }
}

export const logService = new LogService();
