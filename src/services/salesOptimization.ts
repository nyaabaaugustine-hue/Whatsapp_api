interface ObjectionPattern {
  keywords: string[];
  type: 'price' | 'quality' | 'timing' | 'trust' | 'comparison' | 'features';
  responses: string[];
}

interface ComparisonData {
  car1: any;
  car2: any;
  differences: {
    category: string;
    car1Value: string;
    car2Value: string;
    winner?: 'car1' | 'car2' | 'tie';
  }[];
  recommendation: string;
}

interface FinancingCalculation {
  carPrice: number;
  downPayment: number;
  loanAmount: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
}

class SalesOptimizationService {
  private objectionPatterns: ObjectionPattern[] = [
    {
      keywords: ['expensive', 'too much', 'high price', 'costly', 'afford', 'budget'],
      type: 'price',
      responses: [
        "I understand budget is important. This car offers excellent value with low maintenance costs and strong resale value.",
        "Let me show you our financing options - you can own this for as low as GHS {monthly} per month.",
        "Consider the total cost of ownership: fuel efficiency, maintenance, and resale value make this a smart investment.",
        "We have similar models in a lower price range. Would you like to see those options?"
      ]
    },
    {
      keywords: ['quality', 'condition', 'reliable', 'trust', 'verified', 'inspection'],
      type: 'quality',
      responses: [
        "Every car undergoes a comprehensive 150-point inspection by certified mechanics.",
        "We provide full service history and a detailed inspection report for complete transparency.",
        "This vehicle comes with a warranty and has been verified for quality and authenticity.",
        "You can schedule a test drive and bring your own mechanic for an independent inspection."
      ]
    },
    {
      keywords: ['think about it', 'not sure', 'maybe later', 'need time', 'rush'],
      type: 'timing',
      responses: [
        "Take your time! Would you like me to save this car to your shortlist?",
        "I can set up a price alert if this car drops in price. Interested?",
        "No pressure at all. Can I answer any specific questions to help your decision?",
        "This model is popular - 2 other customers viewed it this week. Want me to reserve it for 24 hours?"
      ]
    },
    {
      keywords: ['scam', 'fraud', 'fake', 'legitimate', 'real'],
      type: 'trust',
      responses: [
        "We're a registered business with verified customer reviews. You can visit our showroom in East Legon.",
        "All our cars have verified documents and clean titles. We provide full transparency.",
        "You can meet us in person, inspect the car, and verify all documents before any commitment.",
        "We have 500+ satisfied customers. Check our reviews and testimonials."
      ]
    },
    {
      keywords: ['compare', 'vs', 'versus', 'difference', 'better', 'which one'],
      type: 'comparison',
      responses: [
        "Great question! Let me create a side-by-side comparison for you.",
        "Both are excellent choices. The key differences are in fuel efficiency, space, and maintenance costs.",
        "Based on your needs, I'd recommend {car} because of {reason}.",
        "Would you like to see a detailed comparison table?"
      ]
    },
    {
      keywords: ['features', 'specs', 'specifications', 'details', 'what does it have'],
      type: 'features',
      responses: [
        "This model includes: {features}. Would you like more details on any specific feature?",
        "Key highlights: fuel-efficient engine, spacious interior, modern safety features, and easy maintenance.",
        "I can send you the full specification sheet. What features matter most to you?",
        "Compared to similar models, this offers better value with more standard features."
      ]
    }
  ];

  detectObjection(userMessage: string): { type: string; response: string } | null {
    const lowerMessage = userMessage.toLowerCase();
    
    for (const pattern of this.objectionPatterns) {
      const hasKeyword = pattern.keywords.some(keyword => lowerMessage.includes(keyword));
      if (hasKeyword) {
        const response = pattern.responses[Math.floor(Math.random() * pattern.responses.length)];
        return { type: pattern.type, response };
      }
    }
    
    return null;
  }

  detectHesitation(messageHistory: Array<{ role: string; content: string }>): boolean {
    if (messageHistory.length < 3) return false;

    const recentMessages = messageHistory.slice(-5);
    const hesitationPhrases = [
      'not sure', 'maybe', 'thinking', 'hmm', 'let me think',
      'i dont know', "i don't know", 'confused', 'uncertain'
    ];

    const hesitationCount = recentMessages.filter(msg => 
      msg.role === 'user' && hesitationPhrases.some(phrase => 
        msg.content.toLowerCase().includes(phrase)
      )
    ).length;

    return hesitationCount >= 2;
  }

  generateComparison(car1: any, car2: any): ComparisonData {
    const differences = [
      {
        category: 'Price',
        car1Value: `GHS ${car1.price.toLocaleString()}`,
        car2Value: `GHS ${car2.price.toLocaleString()}`,
        winner: car1.price < car2.price ? 'car1' as const : car2.price < car1.price ? 'car2' as const : 'tie' as const
      },
      {
        category: 'Year',
        car1Value: car1.year.toString(),
        car2Value: car2.year.toString(),
        winner: car1.year > car2.year ? 'car1' as const : car2.year > car1.year ? 'car2' as const : 'tie' as const
      },
      {
        category: 'Fuel Type',
        car1Value: car1.fuel || 'N/A',
        car2Value: car2.fuel || 'N/A',
        winner: 'tie' as const
      },
      {
        category: 'Transmission',
        car1Value: car1.transmission || 'N/A',
        car2Value: car2.transmission || 'N/A',
        winner: 'tie' as const
      },
      {
        category: 'Mileage',
        car1Value: car1.mileage || 'N/A',
        car2Value: car2.mileage || 'N/A',
        winner: 'tie' as const
      }
    ];

    let recommendation = '';
    const priceDiff = Math.abs(car1.price - car2.price);
    const yearDiff = Math.abs(car1.year - car2.year);

    if (priceDiff < 20000 && yearDiff <= 1) {
      recommendation = `Both are excellent choices with similar value. ${car1.brand} ${car1.model} offers slightly better features, while ${car2.brand} ${car2.model} has a competitive price point.`;
    } else if (car1.price < car2.price && car1.year >= car2.year - 1) {
      recommendation = `${car1.brand} ${car1.model} offers better value - newer or similar age at a lower price.`;
    } else if (car2.price < car1.price && car2.year >= car1.year - 1) {
      recommendation = `${car2.brand} ${car2.model} offers better value - newer or similar age at a lower price.`;
    } else {
      recommendation = `${car1.brand} ${car1.model} is newer but pricier. ${car2.brand} ${car2.model} is more budget-friendly. Choose based on your priority: latest features or cost savings.`;
    }

    return {
      car1,
      car2,
      differences,
      recommendation
    };
  }

  formatComparisonTable(comparison: ComparisonData): string {
    const lines = [
      `📊 Comparison: ${comparison.car1.brand} ${comparison.car1.model} vs ${comparison.car2.brand} ${comparison.car2.model}`,
      '',
    ];

    comparison.differences.forEach(diff => {
      const winner1 = diff.winner === 'car1' ? '✓' : '';
      const winner2 = diff.winner === 'car2' ? '✓' : '';
      lines.push(`${diff.category}:`);
      lines.push(`  ${comparison.car1.brand}: ${diff.car1Value} ${winner1}`);
      lines.push(`  ${comparison.car2.brand}: ${diff.car2Value} ${winner2}`);
      lines.push('');
    });

    lines.push(`💡 Recommendation: ${comparison.recommendation}`);
    return lines.join('\n');
  }

  calculateFinancing(
    carPrice: number,
    downPaymentPercent: number = 20,
    interestRate: number = 18,
    termMonths: number = 36
  ): FinancingCalculation {
    const downPayment = carPrice * (downPaymentPercent / 100);
    const loanAmount = carPrice - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    
    const monthlyPayment = loanAmount * 
      (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / 
      (Math.pow(1 + monthlyRate, termMonths) - 1);
    
    const totalCost = downPayment + (monthlyPayment * termMonths);
    const totalInterest = totalCost - carPrice;

    return {
      carPrice,
      downPayment: Math.round(downPayment),
      loanAmount: Math.round(loanAmount),
      interestRate,
      termMonths,
      monthlyPayment: Math.round(monthlyPayment),
      totalInterest: Math.round(totalInterest),
      totalCost: Math.round(totalCost)
    };
  }

  formatFinancingBreakdown(calc: FinancingCalculation): string {
    return `
💰 Financing Breakdown

Car Price: GHS ${calc.carPrice.toLocaleString()}
Down Payment (20%): GHS ${calc.downPayment.toLocaleString()}
Loan Amount: GHS ${calc.loanAmount.toLocaleString()}

📅 ${calc.termMonths}-Month Plan
Monthly Payment: GHS ${calc.monthlyPayment.toLocaleString()}
Interest Rate: ${calc.interestRate}% per year
Total Interest: GHS ${calc.totalInterest.toLocaleString()}
Total Cost: GHS ${calc.totalCost.toLocaleString()}

✨ You can own this car for just GHS ${calc.monthlyPayment.toLocaleString()} per month!
    `.trim();
  }

  generateUrgencyMessage(car: any, viewCount: number = 0): string | null {
    const messages = [];

    if (viewCount >= 3) {
      messages.push(`🔥 ${viewCount} people viewed this ${car.brand} ${car.model} this week!`);
    }

    if (car.year >= new Date().getFullYear() - 2) {
      messages.push(`⚡ Almost new! ${car.year} model with low mileage.`);
    }

    if (car.price < 150000) {
      messages.push(`💎 Great value! Priced below market average.`);
    }

    const random = Math.random();
    if (random < 0.3) {
      messages.push(`⏰ Limited availability - only 1 unit in stock.`);
    } else if (random < 0.5) {
      messages.push(`📢 2 other customers are considering this car.`);
    }

    return messages.length > 0 ? messages[Math.floor(Math.random() * messages.length)] : null;
  }

  generateTradeInPrompt(userBudget: number): string {
    return `
🔄 Trade-In Your Current Car

Have a car to trade in? We offer:
✓ Instant valuation
✓ Fair market prices
✓ Quick paperwork
✓ Apply trade-in value to your new car

Your budget: GHS ${userBudget.toLocaleString()}
With trade-in, you could upgrade to a higher range!

Would you like to get a trade-in estimate?
    `.trim();
  }

  shouldOfferTradeIn(messageHistory: Array<{ role: string; content: string }>): boolean {
    const recentMessages = messageHistory.slice(-10).map(m => m.content.toLowerCase()).join(' ');
    
    const tradeInKeywords = [
      'current car', 'my car', 'old car', 'existing car',
      'trade', 'exchange', 'sell my', 'upgrade'
    ];

    return tradeInKeywords.some(keyword => recentMessages.includes(keyword));
  }

  generateTestDrivePrompt(car: any): string {
    return `
🚗 Schedule a Test Drive

${car.brand} ${car.model} (${car.year})
Price: GHS ${car.price.toLocaleString()}

Available slots:
📅 Weekdays: 9 AM - 6 PM
📅 Saturdays: 10 AM - 4 PM

📍 Location: East Legon Showroom

What works best for you?
    `.trim();
  }
}

export const salesOptimization = new SalesOptimizationService();
export type { ComparisonData, FinancingCalculation };