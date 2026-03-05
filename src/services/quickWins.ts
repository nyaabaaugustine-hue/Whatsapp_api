interface SavedCar {
  carId: string;
  carName: string;
  price: number;
  savedAt: number;
  expiresAt: number;
  reason?: string;
}

interface Comparison {
  car1: any;
  car2: any;
  differences: {
    price: string;
    year: string;
    fuel: string;
    transmission: string;
    mileage: string;
  };
  recommendation: string;
}

interface Testimonial {
  id: string;
  customerName: string;
  carModel: string;
  rating: number;
  review: string;
  date: string;
  verified: boolean;
}

interface UrgencyTrigger {
  type: 'low_stock' | 'high_demand' | 'price_drop' | 'new_arrival';
  message: string;
  carId: string;
}

class QuickWinsService {
  private savedCars: Map<string, SavedCar[]> = new Map();
  private readonly STORAGE_KEY = '__saved_cars__';
  private readonly SAVE_DURATION = 24 * 60 * 60 * 1000;

  private testimonials: Testimonial[] = [
    {
      id: '1',
      customerName: 'Kwame A.',
      carModel: 'Toyota Corolla',
      rating: 5,
      review: 'Excellent service! Found my perfect car in under 30 minutes. The team was very professional.',
      date: '2026-02-15',
      verified: true
    },
    {
      id: '2',
      customerName: 'Ama B.',
      carModel: 'Honda CR-V',
      rating: 5,
      review: 'Best car buying experience in Ghana. Transparent pricing and genuine cars. Highly recommend!',
      date: '2026-02-20',
      verified: true
    },
    {
      id: '3',
      customerName: 'Kofi M.',
      carModel: 'Toyota RAV4',
      rating: 5,
      review: 'Got my RAV4 at a great price. The financing options made it easy. Thank you!',
      date: '2026-02-28',
      verified: true
    },
    {
      id: '4',
      customerName: 'Abena S.',
      carModel: 'Nissan Altima',
      rating: 4,
      review: 'Good selection of cars. The chat assistant was very helpful in narrowing down my options.',
      date: '2026-03-01',
      verified: true
    }
  ];

  constructor() {
    this.loadFromStorage();
  }

  saveForLater(userId: string, car: any, reason?: string): SavedCar {
    const userSaved = this.savedCars.get(userId) || [];
    
    const existing = userSaved.find(s => s.carId === car.id);
    if (existing) {
      existing.savedAt = Date.now();
      existing.expiresAt = Date.now() + this.SAVE_DURATION;
      existing.reason = reason;
    } else {
      const saved: SavedCar = {
        carId: car.id,
        carName: `${car.brand} ${car.model}`,
        price: car.price,
        savedAt: Date.now(),
        expiresAt: Date.now() + this.SAVE_DURATION,
        reason
      };
      userSaved.push(saved);
    }

    this.savedCars.set(userId, userSaved);
    this.saveToStorage();
    return userSaved[userSaved.length - 1];
  }

  getSavedCars(userId: string): SavedCar[] {
    const saved = this.savedCars.get(userId) || [];
    const now = Date.now();
    
    const valid = saved.filter(s => s.expiresAt > now);
    
    if (valid.length !== saved.length) {
      this.savedCars.set(userId, valid);
      this.saveToStorage();
    }

    return valid;
  }

  removeSavedCar(userId: string, carId: string) {
    const saved = this.savedCars.get(userId) || [];
    const filtered = saved.filter(s => s.carId !== carId);
    this.savedCars.set(userId, filtered);
    this.saveToStorage();
  }

  compareCars(car1: any, car2: any): Comparison {
    const differences = {
      price: this.formatPriceDiff(car1.price, car2.price),
      year: this.formatYearDiff(car1.year, car2.year),
      fuel: this.formatFuelDiff(car1.fuel, car2.fuel),
      transmission: this.formatTransmissionDiff(car1.transmission, car2.transmission),
      mileage: this.formatMileageDiff(car1.mileage, car2.mileage)
    };

    const recommendation = this.generateRecommendation(car1, car2, differences);

    return {
      car1,
      car2,
      differences,
      recommendation
    };
  }

  getComparisonMessage(comparison: Comparison): string {
    const { car1, car2, differences, recommendation } = comparison;
    
    const lines = [
      `📊 Comparison: ${car1.brand} ${car1.model} vs ${car2.brand} ${car2.model}`,
      '',
      `💰 Price: ${differences.price}`,
      `📅 Year: ${differences.year}`,
      `⛽ Fuel: ${differences.fuel}`,
      `⚙️ Transmission: ${differences.transmission}`,
      `🛣️ Mileage: ${differences.mileage}`,
      '',
      `💡 ${recommendation}`
    ];

    return lines.join('\n');
  }

  getTestimonial(carModel?: string): Testimonial | null {
    let filtered = this.testimonials;
    
    if (carModel) {
      const modelLower = carModel.toLowerCase();
      filtered = this.testimonials.filter(t => 
        t.carModel.toLowerCase().includes(modelLower)
      );
    }

    if (filtered.length === 0) {
      filtered = this.testimonials;
    }

    return filtered[Math.floor(Math.random() * filtered.length)];
  }

  getTestimonialMessage(testimonial: Testimonial): string {
    const stars = '⭐'.repeat(testimonial.rating);
    const verified = testimonial.verified ? '✓ Verified Purchase' : '';
    
    return `${stars} ${verified}\n"${testimonial.review}"\n- ${testimonial.customerName}, ${testimonial.carModel}`;
  }

  getUrgencyTrigger(car: any, viewCount?: number): UrgencyTrigger | null {
    const triggers: UrgencyTrigger[] = [];

    if (viewCount && viewCount > 5) {
      triggers.push({
        type: 'high_demand',
        message: `🔥 ${viewCount} people viewed this ${car.brand} ${car.model} today!`,
        carId: car.id
      });
    }

    const randomStock = Math.floor(Math.random() * 3) + 1;
    if (randomStock === 1) {
      triggers.push({
        type: 'low_stock',
        message: `⚠️ Only 1 unit left of this ${car.brand} ${car.model} at this price!`,
        carId: car.id
      });
    }

    const isNewArrival = car.year >= new Date().getFullYear() - 1;
    if (isNewArrival) {
      triggers.push({
        type: 'new_arrival',
        message: `✨ Fresh arrival! This ${car.brand} ${car.model} just landed this week.`,
        carId: car.id
      });
    }

    if (triggers.length === 0) return null;
    
    return triggers[Math.floor(Math.random() * triggers.length)];
  }

  getSmartFollowUp(car: any, stage: 'thinking' | 'comparing' | 'hesitating'): string {
    const carName = `${car.brand} ${car.model}`;
    
    const followUps = {
      thinking: [
        `Still thinking about the ${carName}? Here's why customers love it:`,
        `The ${carName} is a popular choice. Here's what makes it special:`,
        `Let me share why the ${carName} might be perfect for you:`
      ],
      comparing: [
        `Comparing options? The ${carName} stands out because:`,
        `Here's what sets the ${carName} apart from others:`,
        `The ${carName} offers unique advantages:`
      ],
      hesitating: [
        `I understand choosing a car is a big decision. About the ${carName}:`,
        `Take your time! Meanwhile, here's what you should know about the ${carName}:`,
        `No pressure! Let me share some key facts about the ${carName}:`
      ]
    };

    const messages = followUps[stage];
    const message = messages[Math.floor(Math.random() * messages.length)];

    const benefits = [
      '✓ Verified clean title and inspection report',
      '✓ Strong fuel efficiency for Ghana roads',
      '✓ Easy maintenance with local parts availability',
      '✓ Strong resale value in the market',
      '✓ Flexible financing options available'
    ];

    return `${message}\n\n${benefits.slice(0, 3).join('\n')}`;
  }

  getFAQShortcuts() {
    return [
      { id: 'faq_financing', text: '💳 Financing Options', value: 'financing_info' },
      { id: 'faq_inspection', text: '🔍 Inspection Report', value: 'inspection_info' },
      { id: 'faq_warranty', text: '🛡️ Warranty Info', value: 'warranty_info' },
      { id: 'faq_delivery', text: '🚚 Delivery Options', value: 'delivery_info' },
      { id: 'faq_trade', text: '🔄 Trade-in Value', value: 'trade_in_info' },
      { id: 'faq_location', text: '📍 Our Location', value: 'location_info' }
    ];
  }

  getFAQAnswer(topic: string): string {
    const answers: Record<string, string> = {
      financing_info: '💳 Financing Options\n\nWe offer flexible payment plans:\n• 20-30% down payment\n• 12-48 months terms\n• Competitive interest rates\n• Quick approval process\n\nWould you like to speak with our finance advisor?',
      
      inspection_info: '🔍 Inspection Report\n\nEvery car comes with:\n• Full mechanical inspection\n• Body condition report\n• Service history verification\n• Clean title guarantee\n\nRequest a detailed report for any car!',
      
      warranty_info: '🛡️ Warranty Information\n\nAll cars include:\n• 30-day mechanical warranty\n• Free first service\n• Roadside assistance (optional)\n• Extended warranty available\n\nAsk about specific coverage!',
      
      delivery_info: '🚚 Delivery Options\n\nWe deliver nationwide:\n• Accra: Free delivery\n• Outside Accra: Affordable rates\n• Door-to-door service\n• Insurance during transit\n\nWhere should we deliver?',
      
      trade_in_info: '🔄 Trade-in Your Car\n\nGet instant valuation:\n• Upload 3-4 photos\n• Receive quote in 24 hours\n• Use value as down payment\n• Hassle-free process\n\nReady to get your car valued?',
      
      location_info: '📍 Our Location\n\nShowroom Address:\nEast Legon, Accra\nGhana\n\nOpen Hours:\nMon-Sat: 8AM - 6PM\nSun: 10AM - 4PM\n\nWant directions or a pin?'
    };

    return answers[topic] || 'Let me connect you with our team for more details.';
  }

  private formatPriceDiff(price1: number, price2: number): string {
    const diff = Math.abs(price1 - price2);
    if (price1 === price2) return 'Same price';
    if (price1 < price2) return `GHS ${diff.toLocaleString()} cheaper`;
    return `GHS ${diff.toLocaleString()} more expensive`;
  }

  private formatYearDiff(year1: number, year2: number): string {
    if (year1 === year2) return 'Same year';
    if (year1 > year2) return `${year1 - year2} year(s) newer`;
    return `${year2 - year1} year(s) older`;
  }

  private formatFuelDiff(fuel1: string, fuel2: string): string {
    if (fuel1 === fuel2) return `Both ${fuel1}`;
    return `${fuel1} vs ${fuel2}`;
  }

  private formatTransmissionDiff(trans1: string, trans2: string): string {
    if (trans1 === trans2) return `Both ${trans1}`;
    return `${trans1} vs ${trans2}`;
  }

  private formatMileageDiff(mile1: string, mile2: string): string {
    if (mile1 === mile2) return 'Same mileage';
    return `${mile1} vs ${mile2}`;
  }

  private generateRecommendation(car1: any, car2: any, differences: any): string {
    const recommendations: string[] = [];

    if (car1.price < car2.price) {
      recommendations.push(`${car1.brand} ${car1.model} offers better value for money.`);
    } else if (car2.price < car1.price) {
      recommendations.push(`${car2.brand} ${car2.model} is more budget-friendly.`);
    }

    if (car1.year > car2.year) {
      recommendations.push(`${car1.brand} ${car1.model} is newer with potentially lower maintenance.`);
    } else if (car2.year > car1.year) {
      recommendations.push(`${car2.brand} ${car2.model} is newer with modern features.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Both are excellent choices. Consider your budget and preferences.');
    }

    return recommendations.join(' ');
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.savedCars = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load saved cars:', error);
    }
  }

  private saveToStorage() {
    try {
      const data = Object.fromEntries(this.savedCars);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save cars:', error);
    }
  }
}

export const quickWins = new QuickWinsService();
export type { SavedCar, Comparison, Testimonial, UrgencyTrigger };