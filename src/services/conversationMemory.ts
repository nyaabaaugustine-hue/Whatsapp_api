interface ConversationContext {
  sessionId: string;
  userId?: string;
  userName?: string;
  userPhone?: string;
  preferences: {
    budget?: number;
    budgetMin?: number;
    budgetMax?: number;
    carType?: string;
    brand?: string;
    color?: string;
    purpose?: string;
    priority?: string;
    financing?: 'full' | 'financing';
    location?: string;
    timeline?: string;
  };
  viewedCars: string[];
  shortlistedCars: string[];
  lastQuery?: string;
  conversationStage: 'greeting' | 'discovery' | 'recommendation' | 'negotiation' | 'booking' | 'completed';
  messageHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    intent?: string;
  }>;
  lastActivity: number;
  createdAt: number;
}

class ConversationMemoryService {
  private sessions: Map<string, ConversationContext> = new Map();
  private readonly SESSION_TIMEOUT = 30 * 60 * 1000;
  private readonly STORAGE_KEY = '__conv_memory__';

  constructor() {
    this.loadFromStorage();
    this.startCleanupTimer();
  }

  createSession(userId?: string): string {
    const sessionId = this.generateSessionId();
    const context: ConversationContext = {
      sessionId,
      userId,
      preferences: {},
      viewedCars: [],
      shortlistedCars: [],
      conversationStage: 'greeting',
      messageHistory: [],
      lastActivity: Date.now(),
      createdAt: Date.now()
    };
    this.sessions.set(sessionId, context);
    this.saveToStorage();
    return sessionId;
  }

  getSession(sessionId: string): ConversationContext | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    
    if (Date.now() - session.lastActivity > this.SESSION_TIMEOUT) {
      this.sessions.delete(sessionId);
      this.saveToStorage();
      return null;
    }
    
    return session;
  }

  updateSession(sessionId: string, updates: Partial<ConversationContext>) {
    const session = this.getSession(sessionId);
    if (!session) return;

    Object.assign(session, updates, { lastActivity: Date.now() });
    this.sessions.set(sessionId, session);
    this.saveToStorage();
  }

  updatePreferences(sessionId: string, preferences: Partial<ConversationContext['preferences']>) {
    const session = this.getSession(sessionId);
    if (!session) return;

    session.preferences = { ...session.preferences, ...preferences };
    session.lastActivity = Date.now();
    this.sessions.set(sessionId, session);
    this.saveToStorage();
  }

  addMessage(sessionId: string, role: 'user' | 'assistant', content: string, intent?: string) {
    const session = this.getSession(sessionId);
    if (!session) return;

    session.messageHistory.push({
      role,
      content,
      timestamp: Date.now(),
      intent
    });

    if (session.messageHistory.length > 50) {
      session.messageHistory = session.messageHistory.slice(-50);
    }

    session.lastQuery = role === 'user' ? content : session.lastQuery;
    session.lastActivity = Date.now();
    this.sessions.set(sessionId, session);
    this.saveToStorage();
  }

  addViewedCar(sessionId: string, carId: string) {
    const session = this.getSession(sessionId);
    if (!session) return;

    if (!session.viewedCars.includes(carId)) {
      session.viewedCars.push(carId);
    }
    session.lastActivity = Date.now();
    this.sessions.set(sessionId, session);
    this.saveToStorage();
  }

  addShortlistedCar(sessionId: string, carId: string) {
    const session = this.getSession(sessionId);
    if (!session) return;

    if (!session.shortlistedCars.includes(carId)) {
      session.shortlistedCars.push(carId);
    }
    session.lastActivity = Date.now();
    this.sessions.set(sessionId, session);
    this.saveToStorage();
  }

  getConversationHistory(sessionId: string, limit: number = 10): Array<{ role: string; content: string }> {
    const session = this.getSession(sessionId);
    if (!session) return [];

    return session.messageHistory
      .slice(-limit)
      .map(msg => ({ role: msg.role, content: msg.content }));
  }

  canGoBack(sessionId: string): boolean {
    const session = this.getSession(sessionId);
    if (!session) return false;
    return session.messageHistory.length > 2;
  }

  goBack(sessionId: string): ConversationContext | null {
    const session = this.getSession(sessionId);
    if (!session || session.messageHistory.length < 2) return null;

    session.messageHistory = session.messageHistory.slice(0, -2);
    
    const stages: ConversationContext['conversationStage'][] = ['greeting', 'discovery', 'recommendation', 'negotiation', 'booking'];
    const currentIndex = stages.indexOf(session.conversationStage);
    if (currentIndex > 0) {
      session.conversationStage = stages[currentIndex - 1];
    }

    session.lastActivity = Date.now();
    this.sessions.set(sessionId, session);
    this.saveToStorage();
    return session;
  }

  resetPreferences(sessionId: string) {
    const session = this.getSession(sessionId);
    if (!session) return;

    session.preferences = {};
    session.conversationStage = 'discovery';
    session.lastActivity = Date.now();
    this.sessions.set(sessionId, session);
    this.saveToStorage();
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.sessions = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load conversation memory:', error);
    }
  }

  private saveToStorage() {
    try {
      const data = Object.fromEntries(this.sessions);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save conversation memory:', error);
    }
  }

  private startCleanupTimer() {
    setInterval(() => {
      const now = Date.now();
      for (const [sessionId, session] of this.sessions.entries()) {
        if (now - session.lastActivity > this.SESSION_TIMEOUT) {
          this.sessions.delete(sessionId);
        }
      }
      this.saveToStorage();
    }, 5 * 60 * 1000);
  }
}

export const conversationMemory = new ConversationMemoryService();
export type { ConversationContext };