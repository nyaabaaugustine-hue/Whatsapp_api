interface ConversationMetrics {
  sessionId: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  messageCount: number;
  userMessageCount: number;
  botMessageCount: number;
  completed: boolean;
  bookingMade: boolean;
  dropOffPoint?: string;
  leadScore: number;
  satisfactionScore?: number;
  responseTime: number[];
}

interface DropOffPoint {
  stage: string;
  count: number;
  percentage: number;
}

interface QuestionFrequency {
  question: string;
  count: number;
  category: string;
}

interface ConversionFunnel {
  stage: string;
  entered: number;
  completed: number;
  conversionRate: number;
}

class MetricsTrackingService {
  private metrics: Map<string, ConversationMetrics> = new Map();
  private questions: Map<string, number> = new Map();
  private readonly STORAGE_KEY = '__metrics__';
  private readonly QUESTIONS_KEY = '__questions__';

  constructor() {
    this.loadFromStorage();
  }

  startConversation(sessionId: string, userId?: string): ConversationMetrics {
    const metrics: ConversationMetrics = {
      sessionId,
      userId,
      startTime: Date.now(),
      messageCount: 0,
      userMessageCount: 0,
      botMessageCount: 0,
      completed: false,
      bookingMade: false,
      leadScore: 0,
      responseTime: []
    };

    this.metrics.set(sessionId, metrics);
    this.saveToStorage();
    return metrics;
  }

  trackMessage(sessionId: string, isUser: boolean, responseTime?: number) {
    const metrics = this.metrics.get(sessionId);
    if (!metrics) return;

    metrics.messageCount++;
    if (isUser) {
      metrics.userMessageCount++;
    } else {
      metrics.botMessageCount++;
      if (responseTime) {
        metrics.responseTime.push(responseTime);
      }
    }

    this.metrics.set(sessionId, metrics);
    this.saveToStorage();
  }

  trackQuestion(question: string, category: string = 'general') {
    const normalized = question.toLowerCase().trim();
    const current = this.questions.get(normalized) || 0;
    this.questions.set(normalized, current + 1);
    this.saveQuestionsToStorage();
  }

  trackDropOff(sessionId: string, stage: string) {
    const metrics = this.metrics.get(sessionId);
    if (!metrics) return;

    metrics.dropOffPoint = stage;
    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.completed = false;

    this.metrics.set(sessionId, metrics);
    this.saveToStorage();
  }

  trackCompletion(sessionId: string, bookingMade: boolean = false) {
    const metrics = this.metrics.get(sessionId);
    if (!metrics) return;

    metrics.completed = true;
    metrics.bookingMade = bookingMade;
    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;

    this.metrics.set(sessionId, metrics);
    this.saveToStorage();
  }

  updateLeadScore(sessionId: string, score: number) {
    const metrics = this.metrics.get(sessionId);
    if (!metrics) return;

    metrics.leadScore = Math.max(metrics.leadScore, score);
    this.metrics.set(sessionId, metrics);
    this.saveToStorage();
  }

  updateSatisfactionScore(sessionId: string, score: number) {
    const metrics = this.metrics.get(sessionId);
    if (!metrics) return;

    metrics.satisfactionScore = score;
    this.metrics.set(sessionId, metrics);
    this.saveToStorage();
  }

  getConversationCompletionRate(): number {
    const allMetrics = Array.from(this.metrics.values());
    if (allMetrics.length === 0) return 0;

    const completed = allMetrics.filter(m => m.completed).length;
    return (completed / allMetrics.length) * 100;
  }

  getAverageTimeToBooking(): number {
    const bookings = Array.from(this.metrics.values()).filter(m => m.bookingMade && m.duration);
    if (bookings.length === 0) return 0;

    const totalTime = bookings.reduce((sum, m) => sum + (m.duration || 0), 0);
    return totalTime / bookings.length / 1000 / 60;
  }

  getDropOffPoints(): DropOffPoint[] {
    const dropOffs = Array.from(this.metrics.values())
      .filter(m => m.dropOffPoint && !m.completed);

    const stageCounts = new Map<string, number>();
    dropOffs.forEach(m => {
      const stage = m.dropOffPoint!;
      stageCounts.set(stage, (stageCounts.get(stage) || 0) + 1);
    });

    const total = dropOffs.length;
    return Array.from(stageCounts.entries())
      .map(([stage, count]) => ({
        stage,
        count,
        percentage: (count / total) * 100
      }))
      .sort((a, b) => b.count - a.count);
  }

  getMostAskedQuestions(limit: number = 10): QuestionFrequency[] {
    return Array.from(this.questions.entries())
      .map(([question, count]) => ({
        question,
        count,
        category: this.categorizeQuestion(question)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  getLeadConversionRate(): number {
    const allMetrics = Array.from(this.metrics.values());
    if (allMetrics.length === 0) return 0;

    const conversions = allMetrics.filter(m => m.bookingMade).length;
    return (conversions / allMetrics.length) * 100;
  }

  getAverageResponseTime(): number {
    const allResponseTimes = Array.from(this.metrics.values())
      .flatMap(m => m.responseTime);

    if (allResponseTimes.length === 0) return 0;

    const total = allResponseTimes.reduce((sum, time) => sum + time, 0);
    return total / allResponseTimes.length;
  }

  getAverageSatisfactionScore(): number {
    const scores = Array.from(this.metrics.values())
      .filter(m => m.satisfactionScore !== undefined)
      .map(m => m.satisfactionScore!);

    if (scores.length === 0) return 0;

    const total = scores.reduce((sum, score) => sum + score, 0);
    return total / scores.length;
  }

  getConversionFunnel(): ConversionFunnel[] {
    const stages = ['greeting', 'discovery', 'recommendation', 'negotiation', 'booking'];
    const allMetrics = Array.from(this.metrics.values());

    return stages.map((stage, index) => {
      const entered = allMetrics.length;
      const completed = allMetrics.filter(m => {
        if (stage === 'booking') return m.bookingMade;
        if (stage === 'greeting') return m.messageCount > 0;
        return m.messageCount > index * 3;
      }).length;

      return {
        stage,
        entered,
        completed,
        conversionRate: entered > 0 ? (completed / entered) * 100 : 0
      };
    });
  }

  getHotLeads(threshold: number = 70): ConversationMetrics[] {
    return Array.from(this.metrics.values())
      .filter(m => m.leadScore >= threshold && !m.bookingMade)
      .sort((a, b) => b.leadScore - a.leadScore);
  }

  getDashboardSummary() {
    const allMetrics = Array.from(this.metrics.values());
    const last24h = allMetrics.filter(m => Date.now() - m.startTime < 24 * 60 * 60 * 1000);

    return {
      totalConversations: allMetrics.length,
      conversationsLast24h: last24h.length,
      completionRate: this.getConversationCompletionRate(),
      avgTimeToBooking: this.getAverageTimeToBooking(),
      conversionRate: this.getLeadConversionRate(),
      avgResponseTime: this.getAverageResponseTime(),
      avgSatisfactionScore: this.getAverageSatisfactionScore(),
      hotLeads: this.getHotLeads().length,
      topDropOffPoints: this.getDropOffPoints().slice(0, 3),
      topQuestions: this.getMostAskedQuestions(5)
    };
  }

  exportMetrics(): string {
    const summary = this.getDashboardSummary();
    const funnel = this.getConversionFunnel();

    const report = [
      '📊 Conversation Analytics Report',
      '================================',
      '',
      '📈 Overview',
      `Total Conversations: ${summary.totalConversations}`,
      `Last 24 Hours: ${summary.conversationsLast24h}`,
      `Completion Rate: ${summary.completionRate.toFixed(1)}%`,
      `Conversion Rate: ${summary.conversionRate.toFixed(1)}%`,
      '',
      '⏱️ Performance',
      `Avg Time to Booking: ${summary.avgTimeToBooking.toFixed(1)} minutes`,
      `Avg Response Time: ${summary.avgResponseTime.toFixed(0)}ms`,
      `Avg Satisfaction: ${summary.avgSatisfactionScore.toFixed(1)}/5`,
      '',
      '🔥 Hot Leads',
      `Active Hot Leads: ${summary.hotLeads}`,
      '',
      '📉 Drop-off Points',
      ...summary.topDropOffPoints.map(d => `${d.stage}: ${d.percentage.toFixed(1)}%`),
      '',
      '❓ Top Questions',
      ...summary.topQuestions.map(q => `${q.question} (${q.count}x)`),
      '',
      '🎯 Conversion Funnel',
      ...funnel.map(f => `${f.stage}: ${f.conversionRate.toFixed(1)}%`)
    ];

    return report.join('\n');
  }

  private categorizeQuestion(question: string): string {
    const lower = question.toLowerCase();
    
    if (lower.includes('price') || lower.includes('cost') || lower.includes('budget')) {
      return 'pricing';
    }
    if (lower.includes('finance') || lower.includes('loan') || lower.includes('payment')) {
      return 'financing';
    }
    if (lower.includes('location') || lower.includes('where') || lower.includes('address')) {
      return 'location';
    }
    if (lower.includes('test drive') || lower.includes('book') || lower.includes('appointment')) {
      return 'booking';
    }
    if (lower.includes('warranty') || lower.includes('guarantee')) {
      return 'warranty';
    }
    if (lower.includes('delivery') || lower.includes('shipping')) {
      return 'delivery';
    }
    
    return 'general';
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.metrics = new Map(Object.entries(data));
      }

      const questionsStored = localStorage.getItem(this.QUESTIONS_KEY);
      if (questionsStored) {
        const data = JSON.parse(questionsStored);
        this.questions = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  }

  private saveToStorage() {
    try {
      const data = Object.fromEntries(this.metrics);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }

  private saveQuestionsToStorage() {
    try {
      const data = Object.fromEntries(this.questions);
      localStorage.setItem(this.QUESTIONS_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save questions:', error);
    }
  }
}

export const metricsTracking = new MetricsTrackingService();
export type { ConversationMetrics, DropOffPoint, QuestionFrequency, ConversionFunnel };