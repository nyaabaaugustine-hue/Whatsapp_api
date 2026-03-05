interface VoiceSearchResult {
  query: string;
  filters: {
    brand?: string;
    color?: string;
    bodyType?: string;
    maxPrice?: number;
    minPrice?: number;
    year?: number;
    fuel?: string;
  };
  confidence: number;
}

class VoiceSearchService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.setupRecognition();
      }
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;
  }

  async startListening(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      if (this.isListening) {
        reject(new Error('Already listening'));
        return;
      }

      this.isListening = true;

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.isListening = false;
        resolve(transcript);
      };

      this.recognition.onerror = (event) => {
        this.isListening = false;
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      this.recognition.start();
    });
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  parseVoiceQuery(transcript: string): VoiceSearchResult {
    const query = transcript.toLowerCase().trim();
    const filters: VoiceSearchResult['filters'] = {};

    const brandPatterns = {
      toyota: /toyota|camry|corolla|rav4|prius/i,
      honda: /honda|civic|accord|cr-v/i,
      nissan: /nissan|altima|sentra|pathfinder/i,
      ford: /ford|f-150|focus|mustang/i,
      mercedes: /mercedes|benz|c-class|e-class/i,
      bmw: /bmw|3 series|5 series/i,
      lexus: /lexus|rx|es|is/i,
      hyundai: /hyundai|elantra|sonata|tucson/i
    };

    const colorPatterns = {
      red: /red|crimson|burgundy/i,
      blue: /blue|navy|azure/i,
      white: /white|pearl|ivory/i,
      black: /black|charcoal|midnight/i,
      silver: /silver|metallic|grey|gray/i,
      green: /green|emerald/i,
      yellow: /yellow|gold/i
    };

    const bodyTypePatterns = {
      suv: /suv|sport utility|crossover/i,
      sedan: /sedan|saloon/i,
      hatchback: /hatchback|hatch/i,
      pickup: /pickup|truck|f-150/i,
      coupe: /coupe|sports car/i,
      wagon: /wagon|estate/i
    };

    const fuelPatterns = {
      petrol: /petrol|gasoline|gas/i,
      diesel: /diesel/i,
      hybrid: /hybrid|electric/i
    };

    for (const [brand, pattern] of Object.entries(brandPatterns)) {
      if (pattern.test(query)) {
        filters.brand = brand;
        break;
      }
    }

    for (const [color, pattern] of Object.entries(colorPatterns)) {
      if (pattern.test(query)) {
        filters.color = color;
        break;
      }
    }

    for (const [bodyType, pattern] of Object.entries(bodyTypePatterns)) {
      if (pattern.test(query)) {
        filters.bodyType = bodyType;
        break;
      }
    }

    for (const [fuel, pattern] of Object.entries(fuelPatterns)) {
      if (pattern.test(query)) {
        filters.fuel = fuel;
        break;
      }
    }

    const priceMatch = query.match(/under (\d+)k?|below (\d+)k?|less than (\d+)k?/i);
    if (priceMatch) {
      const price = parseInt(priceMatch[1] || priceMatch[2] || priceMatch[3]);
      filters.maxPrice = price * (query.includes('k') ? 1000 : 1);
    }

    const minPriceMatch = query.match(/above (\d+)k?|over (\d+)k?|more than (\d+)k?/i);
    if (minPriceMatch) {
      const price = parseInt(minPriceMatch[1] || minPriceMatch[2] || minPriceMatch[3]);
      filters.minPrice = price * (query.includes('k') ? 1000 : 1);
    }

    const yearMatch = query.match(/(\d{4})|after (\d{4})|from (\d{4})/i);
    if (yearMatch) {
      filters.year = parseInt(yearMatch[1] || yearMatch[2] || yearMatch[3]);
    }

    const confidence = this.calculateConfidence(filters, query);

    return {
      query: transcript,
      filters,
      confidence
    };
  }

  private calculateConfidence(filters: VoiceSearchResult['filters'], query: string): number {
    let confidence = 0.5;
    const filterCount = Object.keys(filters).length;
    
    if (filterCount > 0) confidence += 0.2;
    if (filterCount > 2) confidence += 0.2;
    
    const commonPhrases = [
      'find me', 'looking for', 'show me', 'search for', 'i want', 'i need'
    ];
    
    if (commonPhrases.some(phrase => query.toLowerCase().includes(phrase))) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  filterCars(cars: any[], filters: VoiceSearchResult['filters']): any[] {
    return cars.filter(car => {
      if (filters.brand && car.brand?.toLowerCase() !== filters.brand.toLowerCase()) {
        return false;
      }
      
      if (filters.color && !car.color?.toLowerCase().includes(filters.color.toLowerCase())) {
        return false;
      }
      
      if (filters.maxPrice && car.price > filters.maxPrice) {
        return false;
      }
      
      if (filters.minPrice && car.price < filters.minPrice) {
        return false;
      }
      
      if (filters.year && car.year < filters.year) {
        return false;
      }
      
      if (filters.fuel && car.fuel?.toLowerCase() !== filters.fuel.toLowerCase()) {
        return false;
      }
      
      if (filters.bodyType) {
        const carBodyType = this.inferBodyType(car);
        if (carBodyType !== filters.bodyType) {
          return false;
        }
      }
      
      return true;
    });
  }

  private inferBodyType(car: any): string {
    const model = car.model?.toLowerCase() || '';
    
    if (model.includes('suv') || model.includes('cr-v') || model.includes('rav4')) return 'suv';
    if (model.includes('f-150') || model.includes('pickup')) return 'pickup';
    if (model.includes('hatchback')) return 'hatchback';
    
    return 'sedan';
  }

  isSupported(): boolean {
    return !!this.recognition;
  }

  getIsListening(): boolean {
    return this.isListening;
  }
}

export const voiceSearch = new VoiceSearchService();