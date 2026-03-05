interface CarCondition {
  exterior: 'excellent' | 'good' | 'fair' | 'poor';
  interior: 'excellent' | 'good' | 'fair' | 'poor';
  mechanical: 'excellent' | 'good' | 'fair' | 'poor';
  overall: 'excellent' | 'good' | 'fair' | 'poor';
  damagePoints: DamagePoint[];
}

interface DamagePoint {
  type: 'scratch' | 'dent' | 'rust' | 'wear' | 'crack';
  severity: 'minor' | 'moderate' | 'major';
  location: string;
  impactOnValue: number;
}

interface CarIdentification {
  brand: string;
  model: string;
  year: number;
  confidence: number;
  features: string[];
}

interface TradeInEstimate {
  carId: string;
  identification: CarIdentification;
  condition: CarCondition;
  marketValue: number;
  tradeInValue: number;
  privatePartyValue: number;
  dealerRetailValue: number;
  depreciation: {
    age: number;
    mileage: number;
    condition: number;
    market: number;
  };
  recommendations: string[];
  confidence: number;
  timestamp: string;
}

interface PhotoAnalysis {
  imageType: 'exterior_front' | 'exterior_rear' | 'exterior_side' | 'interior' | 'engine' | 'dashboard' | 'other';
  quality: number;
  damages: DamagePoint[];
  features: string[];
}

class TradeInEstimatorService {
  private marketData: Map<string, any> = new Map();

  constructor() {
    this.initializeMarketData();
  }

  async estimateTradeInValue(photos: File[], userInputs?: {
    mileage?: number;
    year?: number;
    brand?: string;
    model?: string;
  }): Promise<TradeInEstimate> {
    try {
      const photoAnalyses = await Promise.all(
        photos.map(photo => this.analyzePhoto(photo))
      );

      const identification = await this.identifyCar(photoAnalyses, userInputs);
      const condition = this.assessCondition(photoAnalyses);
      const valuation = this.calculateValuation(identification, condition, userInputs);

      return {
        carId: this.generateCarId(identification),
        identification,
        condition,
        ...valuation,
        recommendations: this.generateRecommendations(condition, valuation),
        confidence: this.calculateOverallConfidence(identification, condition, photoAnalyses),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Trade-in estimation failed:', error);
      throw new Error('Unable to estimate trade-in value. Please try again with clearer photos.');
    }
  }

  private async analyzePhoto(photo: File): Promise<PhotoAnalysis> {
    try {
      const base64Image = await this.fileToBase64(photo);
      
      const response = await fetch('/api/vision/analyze-condition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          analysisType: 'condition_assessment'
        })
      });

      if (response.ok) {
        const result = await response.json();
        return this.parsePhotoAnalysis(result);
      }
    } catch (error) {
      console.error('Photo analysis failed:', error);
    }

    return this.fallbackPhotoAnalysis(photo);
  }

  private async identifyCar(analyses: PhotoAnalysis[], userInputs?: any): Promise<CarIdentification> {
    const features = analyses.flatMap(a => a.features);
    
    if (userInputs?.brand && userInputs?.model && userInputs?.year) {
      return {
        brand: userInputs.brand,
        model: userInputs.model,
        year: userInputs.year,
        confidence: 0.9,
        features
      };
    }

    const exteriorAnalyses = analyses.filter(a => a.imageType.startsWith('exterior'));
    
    if (exteriorAnalyses.length > 0) {
      const identificationFeatures = this.extractIdentificationFeatures(exteriorAnalyses);
      return this.matchCarModel(identificationFeatures, features);
    }

    return {
      brand: 'Unknown',
      model: 'Unknown',
      year: new Date().getFullYear() - 5,
      confidence: 0.3,
      features
    };
  }

  private assessCondition(analyses: PhotoAnalysis[]): CarCondition {
    const allDamages = analyses.flatMap(a => a.damages);
    
    const exteriorDamages = allDamages.filter(d => 
      analyses.find(a => a.damages.includes(d))?.imageType.startsWith('exterior')
    );
    
    const interiorDamages = allDamages.filter(d => 
      analyses.find(a => a.damages.includes(d))?.imageType === 'interior'
    );

    const exterior = this.calculateConditionScore(exteriorDamages);
    const interior = this.calculateConditionScore(interiorDamages);
    const mechanical = this.estimateMechanicalCondition(analyses);
    
    const overall = this.calculateOverallCondition(exterior, interior, mechanical);

    return {
      exterior,
      interior,
      mechanical,
      overall,
      damagePoints: allDamages
    };
  }

  private calculateValuation(
    identification: CarIdentification, 
    condition: CarCondition, 
    userInputs?: any
  ) {
    const baseValue = this.getMarketValue(identification);
    const mileage = userInputs?.mileage || 50000;
    const age = new Date().getFullYear() - identification.year;

    const depreciation = {
      age: this.calculateAgeDepreciation(age),
      mileage: this.calculateMileageDepreciation(mileage),
      condition: this.calculateConditionDepreciation(condition),
      market: 0.05
    };

    const totalDepreciation = Object.values(depreciation).reduce((sum, dep) => sum + dep, 0);
    const adjustedValue = baseValue * (1 - Math.min(totalDepreciation, 0.8));

    return {
      marketValue: baseValue,
      tradeInValue: Math.round(adjustedValue * 0.8),
      privatePartyValue: Math.round(adjustedValue * 0.95),
      dealerRetailValue: Math.round(adjustedValue * 1.15),
      depreciation
    };
  }

  private generateRecommendations(condition: CarCondition, valuation: any): string[] {
    const recommendations: string[] = [];

    if (condition.overall === 'poor') {
      recommendations.push('Consider minor repairs before trade-in to increase value');
    }

    if (condition.exterior === 'fair' || condition.exterior === 'poor') {
      recommendations.push('Professional detailing could increase trade-in value by 5-10%');
    }

    if (valuation.tradeInValue < valuation.privatePartyValue * 0.85) {
      recommendations.push('Private sale might yield 15-20% more than trade-in');
    }

    if (condition.mechanical === 'good' || condition.mechanical === 'excellent') {
      recommendations.push('Mechanical condition is strong - good time to trade');
    }

    const damageCount = condition.damagePoints.length;
    if (damageCount > 3) {
      recommendations.push('Multiple damage points detected - consider repair estimates');
    }

    if (recommendations.length === 0) {
      recommendations.push('Your car is in good condition for trade-in');
    }

    return recommendations;
  }

  private calculateConditionScore(damages: DamagePoint[]): 'excellent' | 'good' | 'fair' | 'poor' {
    if (damages.length === 0) return 'excellent';
    
    const totalImpact = damages.reduce((sum, damage) => sum + damage.impactOnValue, 0);
    
    if (totalImpact < 0.05) return 'excellent';
    if (totalImpact < 0.15) return 'good';
    if (totalImpact < 0.3) return 'fair';
    return 'poor';
  }

  private estimateMechanicalCondition(analyses: PhotoAnalysis[]): 'excellent' | 'good' | 'fair' | 'poor' {
    const engineAnalysis = analyses.find(a => a.imageType === 'engine');
    
    if (!engineAnalysis) return 'good';
    
    const mechanicalDamages = engineAnalysis.damages.filter(d => 
      ['rust', 'wear', 'crack'].includes(d.type)
    );
    
    return this.calculateConditionScore(mechanicalDamages);
  }

  private calculateOverallCondition(
    exterior: string, 
    interior: string, 
    mechanical: string
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    const scores = { excellent: 4, good: 3, fair: 2, poor: 1 };
    const avgScore = (scores[exterior as keyof typeof scores] + 
                     scores[interior as keyof typeof scores] + 
                     scores[mechanical as keyof typeof scores]) / 3;
    
    if (avgScore >= 3.5) return 'excellent';
    if (avgScore >= 2.5) return 'good';
    if (avgScore >= 1.5) return 'fair';
    return 'poor';
  }

  private getMarketValue(identification: CarIdentification): number {
    const key = `${identification.brand}_${identification.model}_${identification.year}`;
    const marketData = this.marketData.get(key.toLowerCase());
    
    if (marketData) {
      return marketData.averagePrice;
    }

    const baseValues: Record<string, number> = {
      toyota: 150000,
      honda: 140000,
      nissan: 120000,
      ford: 180000,
      mercedes: 400000,
      bmw: 350000,
      lexus: 300000,
      hyundai: 110000
    };

    const brandValue = baseValues[identification.brand.toLowerCase()] || 130000;
    const ageAdjustment = Math.max(0.3, 1 - (new Date().getFullYear() - identification.year) * 0.08);
    
    return Math.round(brandValue * ageAdjustment);
  }

  private calculateAgeDepreciation(age: number): number {
    return Math.min(age * 0.08, 0.6);
  }

  private calculateMileageDepreciation(mileage: number): number {
    const avgMileagePerYear = 15000;
    const excessMileage = Math.max(0, mileage - avgMileagePerYear * 5);
    return Math.min(excessMileage / 100000 * 0.2, 0.3);
  }

  private calculateConditionDepreciation(condition: CarCondition): number {
    const conditionMultipliers = {
      excellent: 0,
      good: 0.05,
      fair: 0.15,
      poor: 0.35
    };
    
    return conditionMultipliers[condition.overall];
  }

  private calculateOverallConfidence(
    identification: CarIdentification,
    condition: CarCondition,
    analyses: PhotoAnalysis[]
  ): number {
    let confidence = identification.confidence * 0.4;
    
    const photoQuality = analyses.reduce((sum, a) => sum + a.quality, 0) / analyses.length;
    confidence += photoQuality * 0.3;
    
    const hasExteriorPhotos = analyses.some(a => a.imageType.startsWith('exterior'));
    const hasInteriorPhotos = analyses.some(a => a.imageType === 'interior');
    
    if (hasExteriorPhotos) confidence += 0.15;
    if (hasInteriorPhotos) confidence += 0.1;
    if (analyses.length >= 4) confidence += 0.05;
    
    return Math.min(confidence, 1.0);
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private parsePhotoAnalysis(result: any): PhotoAnalysis {
    return {
      imageType: result.imageType || 'other',
      quality: result.quality || 0.7,
      damages: result.damages || [],
      features: result.features || []
    };
  }

  private fallbackPhotoAnalysis(photo: File): PhotoAnalysis {
    const fileName = photo.name.toLowerCase();
    let imageType: PhotoAnalysis['imageType'] = 'other';
    
    if (fileName.includes('front')) imageType = 'exterior_front';
    else if (fileName.includes('rear') || fileName.includes('back')) imageType = 'exterior_rear';
    else if (fileName.includes('side')) imageType = 'exterior_side';
    else if (fileName.includes('interior') || fileName.includes('inside')) imageType = 'interior';
    else if (fileName.includes('engine')) imageType = 'engine';
    else if (fileName.includes('dashboard')) imageType = 'dashboard';

    return {
      imageType,
      quality: 0.6,
      damages: [],
      features: []
    };
  }

  private extractIdentificationFeatures(analyses: PhotoAnalysis[]): string[] {
    return analyses.flatMap(a => a.features).filter(Boolean);
  }

  private matchCarModel(identificationFeatures: string[], allFeatures: string[]): CarIdentification {
    const commonBrands = ['toyota', 'honda', 'nissan', 'ford', 'mercedes', 'bmw', 'lexus', 'hyundai'];
    const detectedBrand = commonBrands.find(brand => 
      allFeatures.some(feature => feature.toLowerCase().includes(brand))
    ) || 'Unknown';

    return {
      brand: detectedBrand,
      model: 'Unknown',
      year: new Date().getFullYear() - 3,
      confidence: detectedBrand !== 'Unknown' ? 0.7 : 0.3,
      features: allFeatures
    };
  }

  private generateCarId(identification: CarIdentification): string {
    return `${identification.brand}_${identification.model}_${identification.year}_${Date.now()}`.toLowerCase();
  }

  private initializeMarketData() {
    const sampleData = [
      { brand: 'toyota', model: 'corolla', year: 2020, averagePrice: 180000 },
      { brand: 'toyota', model: 'rav4', year: 2019, averagePrice: 220000 },
      { brand: 'honda', model: 'civic', year: 2020, averagePrice: 170000 },
      { brand: 'honda', model: 'cr-v', year: 2019, averagePrice: 210000 },
      { brand: 'nissan', model: 'altima', year: 2018, averagePrice: 140000 },
      { brand: 'ford', model: 'f-150', year: 2020, averagePrice: 350000 },
      { brand: 'mercedes', model: 'c-class', year: 2021, averagePrice: 450000 },
      { brand: 'lexus', model: 'rx', year: 2018, averagePrice: 380000 }
    ];

    sampleData.forEach(data => {
      const key = `${data.brand}_${data.model}_${data.year}`;
      this.marketData.set(key, data);
    });
  }
}

export const tradeInEstimator = new TradeInEstimatorService();
export type { TradeInEstimate, CarCondition, CarIdentification };