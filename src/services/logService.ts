import { Message } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

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
  lead_score?: number;
  recommended_car_id?: string;
  messageText: string;
}

class LogService {
  private logs: TrackingLog[] = [];
  private bookings: Booking[] = [];
  private chatSessions: ChatSession[] = [];
  private currentSession: ChatSession | null = null;
  private listeners: (() => void)[] = [];
  private useSupabase: boolean;

  constructor() {
    this.useSupabase = isSupabaseConfigured();
    if (this.useSupabase) {
      console.log('✅ Supabase enabled for data persistence');
    } else {
      console.log('⚠️ Using in-memory storage (Supabase not configured)');
    }
  }

  async startNewSession() {
    const sessionId = `SESSION-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    this.currentSession = {
      id: sessionId,
      startTime: new Date(),
      lastActivity: new Date(),
      userInfo: {},
      messages: [],
      leadTemperature: 'cold',
      intent: 'browsing'
    };

    if (this.useSupabase) {
      try {
        const { error } = await supabase.from('chat_sessions').insert({
          session_id: sessionId,
          start_time: new Date().toISOString(),
          last_activity: new Date().toISOString(),
          lead_temperature: 'cold',
          intent: 'browsing'
        });

        if (error) {
          console.error('Supabase insert error:', error);
          this.chatSessions.unshift(this.currentSession);
        }
      } catch (error) {
        console.error('Supabase error:', error);
        this.chatSessions.unshift(this.currentSession);
      }
    } else {
      this.chatSessions.unshift(this.currentSession);
    }
    
    this.notify();
  }

  async addMessageToSession(message: Message) {
    if (!this.currentSession) {
      await this.startNewSession();
    }

    this.currentSession!.messages.push(message);
    this.currentSession!.lastActivity = new Date();

    if (this.useSupabase) {
      try {
        const { error } = await supabase.from('messages').insert({
          session_id: this.currentSession!.id,
          message_id: message.id,
          sender: message.sender,
          text: message.text,
          message_timestamp: message.timestamp.toISOString(),
          attachment_type: message.attachment?.type,
          attachment_data: message.attachment?.data,
          attachment_url: message.attachment?.url,
          ai_images: message.aiImages || [],
          booking_car_id: message.bookingProposal?.carId,
          booking_car_name: message.bookingProposal?.carName
        });

        if (error) console.error('Supabase message insert error:', error);

        await supabase
          .from('chat_sessions')
          .update({ last_activity: new Date().toISOString() })
          .eq('session_id', this.currentSession!.id);
      } catch (error) {
        console.error('Supabase error:', error);
      }
    }

    this.notify();
  }

  async updateUserInfo(userInfo: Partial<UserInfo>) {
    if (!this.currentSession) {
      await this.startNewSession();
    }

    this.currentSession!.userInfo = {
      ...this.currentSession!.userInfo,
      ...userInfo
    };

    if (this.useSupabase) {
      try {
        await supabase
          .from('chat_sessions')
          .update({
            user_name: userInfo.name,
            user_phone: userInfo.phone,
            user_email: userInfo.email
          })
          .eq('session_id', this.currentSession!.id);
      } catch (error) {
        console.error('Supabase error:', error);
      }
    }

    this.notify();
  }

  async updateSessionMetadata(leadTemperature?: string, intent?: string) {
    if (!this.currentSession) return;

    if (leadTemperature) {
      this.currentSession.leadTemperature = leadTemperature as 'cold' | 'warm' | 'hot';
    }
    if (intent) {
      this.currentSession.intent = intent;
    }

    if (this.useSupabase) {
      try {
        const updates: any = {};
        if (leadTemperature) updates.lead_temperature = leadTemperature;
        if (intent) updates.intent = intent;

        await supabase
          .from('chat_sessions')
          .update(updates)
          .eq('session_id', this.currentSession.id);
      } catch (error) {
        console.error('Supabase error:', error);
      }
    }

    this.notify();
  }

  async addLog(log: Omit<TrackingLog, 'id' | 'timestamp'>) {
    const logId = Math.random().toString(36).substr(2, 9);
    const newLog: TrackingLog = {
      ...log,
      id: logId,
      timestamp: new Date(),
    };

    // Store locally first
    this.logs.unshift(newLog);

    // Send to Supabase if configured
    if (this.useSupabase) {
      try {
        await supabase.from('tracking_logs').insert({
          log_id: logId,
          session_id: this.currentSession?.id,
          intent: log.intent,
          lead_temperature: log.lead_temperature,
          lead_score: log.lead_score,
          recommended_car_id: log.recommended_car_id,
          message_text: log.messageText
        });
      } catch (error) {
        console.error('Supabase tracking_logs error:', error);
      }
    }

    // Also send to backend API for redundancy
    try {
      await fetch('/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: 'tracking_log',
          sessionId: this.currentSession?.id,
          timestamp: newLog.timestamp.toISOString(),
          data: {
            intent: log.intent,
            lead_temperature: log.lead_temperature,
            lead_score: log.lead_score,
            recommended_car_id: log.recommended_car_id,
            messageText: log.messageText
          }
        })
      });
    } catch (error) {
      console.error('Backend API log error:', error);
    }

    await this.updateSessionMetadata(log.lead_temperature, log.intent);
    this.notify();
  }

  async addBooking(booking: Omit<Booking, 'id' | 'timestamp'>) {
    const bookingId = `BK-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const newBooking: Booking = {
      ...booking,
      id: bookingId,
      timestamp: new Date(),
      customer_name: this.currentSession?.userInfo.name,
      customer_phone: this.currentSession?.userInfo.phone,
    };

    if (this.useSupabase) {
      try {
        await supabase.from('bookings').insert({
          booking_id: bookingId,
          session_id: this.currentSession?.id,
          car_id: booking.car_id,
          customer_email: booking.customer_email,
          customer_name: newBooking.customer_name,
          customer_phone: newBooking.customer_phone,
          status: booking.status
        });
      } catch (error) {
        console.error('Supabase error:', error);
        this.bookings.unshift(newBooking);
      }
    } else {
      this.bookings.unshift(newBooking);
    }

    await this.addLog({
      intent: 'booking',
      lead_temperature: 'hot',
      recommended_car_id: booking.car_id,
      messageText: `Booking confirmed: ${bookingId}`
    });

    this.notify();
    return newBooking;
  }

  async getLogs(): Promise<TrackingLog[]> {
    if (this.useSupabase) {
      try {
        const { data, error } = await supabase
          .from('tracking_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) throw error;

        return (data || []).map(row => ({
          id: row.log_id,
          timestamp: new Date(row.created_at),
          intent: row.intent,
          lead_temperature: row.lead_temperature,
          recommended_car_id: row.recommended_car_id,
          messageText: row.message_text
        }));
      } catch (error) {
        console.error('Supabase fetch error:', error);
        return this.logs;
      }
    }
    return this.logs;
  }

  async getBookings(): Promise<Booking[]> {
    if (this.useSupabase) {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map(row => ({
          id: row.booking_id,
          timestamp: new Date(row.created_at),
          car_id: row.car_id,
          customer_email: row.customer_email,
          customer_name: row.customer_name,
          customer_phone: row.customer_phone,
          status: row.status
        }));
      } catch (error) {
        console.error('Supabase fetch error:', error);
        return this.bookings;
      }
    }
    return this.bookings;
  }

  async getChatSessions(): Promise<ChatSession[]> {
    if (this.useSupabase) {
      try {
        const { data: sessions, error } = await supabase
          .from('chat_sessions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        const sessionsWithMessages = await Promise.all(
          (sessions || []).map(async (session) => {
            const { data: messages } = await supabase
              .from('messages')
              .select('*')
              .eq('session_id', session.session_id)
              .order('message_timestamp', { ascending: true });

            return {
              id: session.session_id,
              startTime: new Date(session.start_time),
              lastActivity: new Date(session.last_activity),
              userInfo: {
                name: session.user_name,
                phone: session.user_phone,
                email: session.user_email
              },
              messages: (messages || []).map(msg => ({
                id: msg.message_id,
                text: msg.text,
                sender: msg.sender,
                timestamp: new Date(msg.message_timestamp),
                attachment: msg.attachment_type ? {
                  type: msg.attachment_type,
                  data: msg.attachment_data,
                  url: msg.attachment_url,
                  mimeType: ''
                } : undefined,
                aiImages: msg.ai_images,
                bookingProposal: msg.booking_car_id ? {
                  carId: msg.booking_car_id,
                  carName: msg.booking_car_name
                } : undefined
              })),
              leadTemperature: session.lead_temperature as 'cold' | 'warm' | 'hot',
              intent: session.intent
            };
          })
        );

        return sessionsWithMessages;
      } catch (error) {
        console.error('Supabase fetch error:', error);
        return this.chatSessions;
      }
    }
    return this.chatSessions;
  }

  getCurrentSession() {
    return this.currentSession;
  }

  clearCurrentSession() {
    this.currentSession = null;
  }

  async exportToJSON(): Promise<string> {
    const logs = await this.getLogs();
    const bookings = await this.getBookings();
    const sessions = await this.getChatSessions();

    return JSON.stringify({
      logs,
      bookings,
      chatSessions: sessions,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  async exportToCSV(): Promise<string> {
    const sessions = await this.getChatSessions();
    
    let csv = 'Session ID,Customer,Phone,Email,Messages,Lead Temp,Intent,Started,Last Activity\n';
    
    sessions.forEach(session => {
      csv += `"${session.id}","${session.userInfo.name || 'Anonymous'}","${session.userInfo.phone || 'N/A'}","${session.userInfo.email || 'N/A'}",${session.messages.length},"${session.leadTemperature}","${session.intent}","${session.startTime.toISOString()}","${session.lastActivity.toISOString()}"\n`;
    });

    return csv;
  }

  subscribe(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }
}

export const logService = new LogService();
