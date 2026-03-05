interface ErrorRecoveryResponse {
  message: string;
  suggestions: string[];
  quickReplies?: Array<{ id: string; text: string; value: string }>;
  fallbackToHuman?: boolean;
}

interface MisunderstoodQuery {
  query: string;
  timestamp: number;
  attemptedIntent: string;
}

class ErrorRecoveryService {
  private misunderstoodQueries: MisunderstoodQuery[] = [];
  private readonly MAX_MISUNDERSTANDINGS = 3;
  private readonly MISUNDERSTANDING_WINDOW = 5 * 60 * 1000;

  handleMisunderstood(query: string, attemptedIntent: string = 'unknown'): ErrorRecoveryResponse {
    this.trackMisunderstanding(query, attemptedIntent);

    const recentMisunderstandings = this.getRecentMisunderstandings();
    
    if (recentMisunderstandings >= this.MAX_MISUNDERSTANDINGS) {
      return this.offerHumanHandoff();
    }

    const suggestions = this.generateSuggestions(query);
    
    if (suggestions.length > 0) {
      return {
        message: "I didn't quite catch that. Did you mean:",
        suggestions,
        quickReplies: suggestions.map((s, i) => ({
          id: `suggest_${i}`,
          text: s,
          value: s
        }))
      };
    }

    return this.getGenericRecovery();
  }

  handleTypo(query: string, allCars: any[]): ErrorRecoveryResponse | null {
    const corrected = this.correctTypos(query, allCars);
    
    if (corrected && corrected !== query) {
      return {
        message: `Did you mean "${corrected}"?`,
        suggestions: [corrected, 'No, try again'],
        quickReplies: [
          { id: 'typo_yes', text: `Yes, ${corrected}`, value: corrected },
          { id: 'typo_no', text: 'No, let me rephrase', value: 'rephrase' }
        ]
      };
    }

    return null;
  }

  handleVagueQuery(query: string): ErrorRecoveryResponse {
    const clarifications = this.getClarificationQuestions(query);
    
    return {
      message: "I'd love to help! Could you tell me more about:",
      suggestions: clarifications,
      quickReplies: clarifications.map((c, i) => ({
        id: `clarify_${i}`,
        text: c,
        value: c
      }))
    };
  }

  offerHumanHandoff(): ErrorRecoveryResponse {
    return {
      message: "I'm having trouble understanding. Would you like to speak with our sales team? They can help you better.",
      suggestions: ['Connect me with sales', 'Let me try again'],
      quickReplies: [
        { id: 'handoff_yes', text: 'Yes, connect me', value: 'connect_sales' },
        { id: 'handoff_retry', text: 'Let me try again', value: 'retry' },
        { id: 'handoff_call', text: 'Call me instead', value: 'request_call' }
      ],
      fallbackToHuman: true
    };
  }

  getDidYouMean(query: string, options: string[]): string[] {
    const queryLower = query.toLowerCase();
    const matches: Array<{ option: string; score: number }> = [];

    for (const option of options) {
      const score = this.calculateSimilarity(queryLower, option.toLowerCase());
      if (score > 0.6) {
        matches.push({ option, score });
      }
    }

    return matches
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(m => m.option);
  }

  private trackMisunderstanding(query: string, attemptedIntent: string) {
    this.misunderstoodQueries.push({
      query,
      timestamp: Date.now(),
      attemptedIntent
    });

    this.cleanupOldMisunderstandings();
  }

  private getRecentMisunderstandings(): number {
    const now = Date.now();
    return this.misunderstoodQueries.filter(
      m => now - m.timestamp < this.MISUNDERSTANDING_WINDOW
    ).length;
  }

  private cleanupOldMisunderstandings() {
    const now = Date.now();
    this.misunderstoodQueries = this.misunderstoodQueries.filter(
      m => now - m.timestamp < this.MISUNDERSTANDING_WINDOW
    );
  }

  private generateSuggestions(query: string): string[] {
    const queryLower = query.toLowerCase();
    const suggestions: string[] = [];

    const commonIntents = [
      { keywords: ['price', 'cost', 'budget'], suggestion: 'Show me cars in my budget' },
      { keywords: ['suv', 'sedan', 'pickup'], suggestion: 'Show me SUVs' },
      { keywords: ['toyota', 'honda', 'nissan'], suggestion: 'Show me Toyota cars' },
      { keywords: ['compare', 'vs', 'difference'], suggestion: 'Compare two cars' },
      { keywords: ['book', 'test drive', 'appointment'], suggestion: 'Book a test drive' },
      { keywords: ['location', 'where', 'address'], suggestion: 'Show me your location' },
      { keywords: ['contact', 'call', 'phone'], suggestion: 'Contact sales team' }
    ];

    for (const intent of commonIntents) {
      if (intent.keywords.some(k => queryLower.includes(k))) {
        suggestions.push(intent.suggestion);
      }
    }

    if (suggestions.length === 0) {
      suggestions.push('Show me available cars', 'Help me find a car', 'Talk to sales team');
    }

    return suggestions.slice(0, 3);
  }

  private correctTypos(query: string, allCars: any[]): string | null {
    const queryLower = query.toLowerCase();
    
    const brandCorrections: Record<string, string> = {
      'toyot': 'toyota',
      'toyoto': 'toyota',
      'hond': 'honda',
      'hondi': 'honda',
      'nisan': 'nissan',
      'nissan': 'nissan',
      'mercedez': 'mercedes',
      'mercedes': 'mercedes-benz',
      'benz': 'mercedes-benz',
      'lexas': 'lexus',
      'lexis': 'lexus',
      'hyundai': 'hyundai',
      'hundai': 'hyundai'
    };

    for (const [typo, correct] of Object.entries(brandCorrections)) {
      if (queryLower.includes(typo)) {
        return query.replace(new RegExp(typo, 'gi'), correct);
      }
    }

    const brands = [...new Set(allCars.map(c => c.brand.toLowerCase()))];
    for (const brand of brands) {
      const similarity = this.calculateSimilarity(queryLower, brand);
      if (similarity > 0.7 && similarity < 1) {
        return query.replace(new RegExp(queryLower, 'gi'), brand);
      }
    }

    return null;
  }

  private getClarificationQuestions(query: string): string[] {
    const queryLower = query.toLowerCase();
    const clarifications: string[] = [];

    if (queryLower.includes('car') && queryLower.split(' ').length < 3) {
      clarifications.push('What type of car? (SUV, Sedan, Pickup)');
      clarifications.push('What\'s your budget range?');
      clarifications.push('What will you use it for?');
    } else if (queryLower.includes('cheap') || queryLower.includes('affordable')) {
      clarifications.push('What\'s your maximum budget?');
      clarifications.push('Are you looking for fuel efficiency?');
    } else {
      clarifications.push('What type of car are you looking for?');
      clarifications.push('What\'s your budget?');
      clarifications.push('When do you need it?');
    }

    return clarifications.slice(0, 3);
  }

  private getGenericRecovery(): ErrorRecoveryResponse {
    return {
      message: "I'm here to help you find the perfect car. Let's start with:",
      suggestions: ['Show me available cars', 'I have a budget in mind', 'I need help choosing'],
      quickReplies: [
        { id: 'generic_browse', text: 'Browse Cars', value: 'browse_cars' },
        { id: 'generic_budget', text: 'Set Budget', value: 'set_budget' },
        { id: 'generic_help', text: 'Help Me Choose', value: 'help_choose' }
      ]
    };
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  resetMisunderstandings() {
    this.misunderstoodQueries = [];
  }
}

export const errorRecovery = new ErrorRecoveryService();
export type { ErrorRecoveryResponse };