interface UserProfile {
  userId: string;
  name?: string;
  phone?: string;
  email?: string;
  preferences: {
    favoriteCarTypes: string[];
    budgetRange: { min: number; max: number };
    preferredBrands: string[];
    preferredColors: string[];
    purpose: string[];
  };
  searchHistory: Array<{
    query: string;
    filters: any;
    timestamp: number;
  }>;
  viewedCars: Array<{
    carId: string;
    viewCount: number;
    lastViewed: number;
    timeSpent: number;
  }>;
  shortlistedCars: string[];
  interactions: {
    totalSessions: number;
    totalMessages: number;
    lastActive: number;
    firstSeen: number;
  };
  behavior: {
    avgSessionDuration: number;
    preferredTimeOfDay: string;
    deviceType: string;
    engagementScore: number;
  };
  purchaseIntent: 'cold' | 'warm' | 'hot';
  tags: string[];
}

class PersonalizationService {
  private profiles: Map<string, UserProfile> = new Map();
  private readonly STORAGE_KEY = '__user_profiles__';

  constructor() {
    this.loadFromStorage();
  }

  getOrCreateProfile(userId: string, name?: string, phone?: string): UserProfile {
    let profile = this.profiles.get(userId);
    
    if (!profile) {
      profile = {
        userId,
        name,
        phone,
        preferences: {
          favoriteCarTypes: [],
          budgetRange: { min: 0, max: 0 },
          preferredBrands: [],
          preferredColors: [],
          purpose: []
        },
        searchHistory: [],
        viewedCars: [],
        shortlistedCars: [],
        interactions: {
          totalSessions: 0,
          totalMessages: 0,
          lastActive: Date.now(),
          firstSeen: Date.now()
        },
        behavior: {
          avgSessionDuration: 0,
          preferredTimeOfDay: this.getTimeOfDay(),
          deviceType: this.getDeviceType(),
          engagementScore: 0
        },
        purchaseIntent: 'cold',
        tags: []
      };
      this.profiles.set(userId, profile);
      this.saveToStorage();
    }

    return profile;
  }

  updateProfile(userId: string, updates: Partial<UserProfile>) {
    const profile = this.getOrCreateProfile(userId);
    Object.assign(profile, updates);
    profile.interactions.lastActive = Date.now();
    this.profiles.set(userId, profile);
    this.saveToStorage();
  }

  trackSearch(userId: string, query: string, filters: any) {
    const profile = this.getOrCreateProfile(userId);
    profile.searchHistory.push({
      query,
      filters,
      timestamp: Date.now()
    });

    if (profile.searchHistory.length > 50) {
      profile.searchHistory = profile.searchHistory.slice(-50);
    }

    this.updatePreferencesFromSearch(profile, filters);
    this.profiles.set(userId, profile);
    this.saveToStorage();
  }

  trackCarView(userId: string, carId: string, timeSpent: number = 0) {
    const profile = this.getOrCreateProfile(userId);
    const existing = profile.viewedCars.find(v => v.carId === carId);

    if (existing) {
      existing.viewCount++;
      existing.lastViewed = Date.now();
      existing.timeSpent += timeSpent;
    } else {
      profile.viewedCars.push({
        carId,
        viewCount: 1,
        lastViewed: Date.now(),
        timeSpent
      });
    }

    if (profile.viewedCars.length > 100) {
      profile.viewedCars = profile.viewedCars
        .sort((a, b) => b.lastViewed - a.lastViewed)
        .slice(0, 100);
    }

    this.updateEngagementScore(profile);
    this.profiles.set(userId, profile);
    this.saveToStorage();
  }

  trackInteraction(userId: string, messageCount: number = 1) {
    const profile = this.getOrCreateProfile(userId);
    profile.interactions.totalMessages += messageCount;
    profile.interactions.lastActive = Date.now();
    this.updateEngagementScore(profile);
    this.profiles.set(userId, profile);
    this.saveToStorage();
  }

  getPersonalizedGreeting(userId: string): string {
    const profile = this.profiles.get(userId);
    if (!profile) return "Hello! I'm here to help you find the perfect car.";

    const name = profile.name || 'there';
    const daysSinceLastActive = Math.floor((Date.now() - profile.interactions.lastActive) / (1000 * 60 * 60 * 24));

    if (daysSinceLastActive === 0) {
      return `Welcome back, ${name}!`;
    } else if (daysSinceLastActive === 1) {
      return `Good to see you again, ${name}!`;
    } else if (daysSinceLastActive < 7) {
      return `Welcome back, ${name}! It's been ${daysSinceLastActive} days.`;
    } else if (daysSinceLastActive < 30) {
      return `Great to have you back, ${name}!`;
    } else {
      return `Welcome back, ${name}! It's been a while.`;
    }
  }

  getPersonalizedContext(userId: string): string {
    const profile = this.profiles.get(userId);
    if (!profile) return '';

    const contexts: string[] = [];

    if (profile.preferences.favoriteCarTypes.length > 0) {
      const types = profile.preferences.favoriteCarTypes.slice(0, 2).join(' and ');
      contexts.push(`Still interested in ${types}?`);
    }

    if (profile.viewedCars.length > 0) {
      const recentViews = profile.viewedCars
        .sort((a, b) => b.lastViewed - a.lastViewed)
        .slice(0, 3);
      
      if (recentViews.length > 0) {
        contexts.push(`You recently viewed ${recentViews.length} car${recentViews.length > 1 ? 's' : ''}.`);
      }
    }

    if (profile.shortlistedCars.length > 0) {
      contexts.push(`You have ${profile.shortlistedCars.length} car${profile.shortlistedCars.length > 1 ? 's' : ''} in your shortlist.`);
    }

    return contexts.join(' ');
  }

  getRecommendations(userId: string, allCars: any[]): any[] {
    const profile = this.profiles.get(userId);
    if (!profile) return allCars.slice(0, 3);

    const scoredCars = allCars.map(car => {
      let score = 0;

      if (profile.preferences.favoriteCarTypes.includes(this.inferCarType(car))) {
        score += 3;
      }

      if (profile.preferences.preferredBrands.includes(car.brand)) {
        score += 2;
      }

      if (profile.preferences.preferredColors.includes(car.color)) {
        score += 1;
      }

      if (profile.preferences.budgetRange.min > 0 && profile.preferences.budgetRange.max > 0) {
        if (car.price >= profile.preferences.budgetRange.min && car.price <= profile.preferences.budgetRange.max) {
          score += 2;
        }
      }

      const viewed = profile.viewedCars.find(v => v.carId === car.id);
      if (viewed) {
        score += viewed.viewCount * 0.5;
      }

      return { car, score };
    });

    return scoredCars
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.car);
  }

  getSimilarUserRecommendations(userId: string, allCars: any[]): string {
    const profile = this.profiles.get(userId);
    if (!profile || profile.viewedCars.length === 0) return '';

    const viewedCarIds = profile.viewedCars.map(v => v.carId);
    const similarCars = allCars.filter(car => !viewedCarIds.includes(car.id));

    if (similarCars.length === 0) return '';

    const randomCars = similarCars
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const carNames = randomCars.map(c => `${c.brand} ${c.model}`).join(', ');
    return `People with similar interests also viewed: ${carNames}`;
  }

  updatePurchaseIntent(userId: string, intent: 'cold' | 'warm' | 'hot') {
    const profile = this.getOrCreateProfile(userId);
    profile.purchaseIntent = intent;
    
    if (intent === 'hot') {
      if (!profile.tags.includes('hot_lead')) {
        profile.tags.push('hot_lead');
      }
    }

    this.profiles.set(userId, profile);
    this.saveToStorage();
  }

  private updatePreferencesFromSearch(profile: UserProfile, filters: any) {
    if (filters.carType && !profile.preferences.favoriteCarTypes.includes(filters.carType)) {
      profile.preferences.favoriteCarTypes.push(filters.carType);
    }

    if (filters.brand && !profile.preferences.preferredBrands.includes(filters.brand)) {
      profile.preferences.preferredBrands.push(filters.brand);
    }

    if (filters.color && !profile.preferences.preferredColors.includes(filters.color)) {
      profile.preferences.preferredColors.push(filters.color);
    }

    if (filters.maxPrice) {
      if (profile.preferences.budgetRange.max === 0 || filters.maxPrice > profile.preferences.budgetRange.max) {
        profile.preferences.budgetRange.max = filters.maxPrice;
      }
    }

    if (filters.minPrice) {
      if (profile.preferences.budgetRange.min === 0 || filters.minPrice < profile.preferences.budgetRange.min) {
        profile.preferences.budgetRange.min = filters.minPrice;
      }
    }
  }

  private updateEngagementScore(profile: UserProfile) {
    let score = 0;

    score += Math.min(profile.interactions.totalMessages / 10, 20);
    score += Math.min(profile.viewedCars.length * 2, 30);
    score += Math.min(profile.shortlistedCars.length * 5, 25);
    score += Math.min(profile.searchHistory.length * 1.5, 15);

    const daysSinceFirstSeen = (Date.now() - profile.interactions.firstSeen) / (1000 * 60 * 60 * 24);
    if (daysSinceFirstSeen < 1) score += 10;

    profile.behavior.engagementScore = Math.min(Math.round(score), 100);
  }

  private inferCarType(car: any): string {
    const model = car.model?.toLowerCase() || '';
    if (model.includes('suv') || model.includes('cr-v') || model.includes('rav4')) return 'SUV';
    if (model.includes('f-150') || model.includes('pickup')) return 'Pickup';
    return 'Sedan';
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  private getDeviceType(): string {
    const ua = navigator.userAgent;
    if (/mobile/i.test(ua)) return 'mobile';
    if (/tablet/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.profiles = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load user profiles:', error);
    }
  }

  private saveToStorage() {
    try {
      const data = Object.fromEntries(this.profiles);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save user profiles:', error);
    }
  }
}

export const personalization = new PersonalizationService();
export type { UserProfile };