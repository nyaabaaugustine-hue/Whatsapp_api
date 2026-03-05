interface CarFeatures {
  bodyType: string;
  color: string;
  brand?: string;
  confidence: number;
}

interface SimilarCar {
  id: string;
  similarity: number;
  matchedFeatures: string[];
}

class VisualRecognitionService {
  private apiKey: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_VISION_API_KEY || '';
  }

  async analyzeCarImage(imageFile: File): Promise<CarFeatures> {
    try {
      const base64Image = await this.fileToBase64(imageFile);
      
      const response = await fetch('/api/vision/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          features: ['car_detection', 'color_analysis', 'brand_recognition']
        })
      });

      if (!response.ok) {
        throw new Error('Vision API request failed');
      }

      const result = await response.json();
      return this.parseVisionResult(result);
    } catch (error) {
      console.error('Image analysis failed:', error);
      return this.fallbackAnalysis(imageFile);
    }
  }

  async findSimilarCars(features: CarFeatures, inventory: any[]): Promise<SimilarCar[]> {
    const similarities = inventory.map(car => {
      let score = 0;
      const matchedFeatures: string[] = [];

      if (this.matchesBodyType(car, features.bodyType)) {
        score += 0.4;
        matchedFeatures.push('body_type');
      }

      if (this.matchesColor(car.color, features.color)) {
        score += 0.3;
        matchedFeatures.push('color');
      }

      if (features.brand && this.matchesBrand(car.brand, features.brand)) {
        score += 0.3;
        matchedFeatures.push('brand');
      }

      return {
        id: car.id,
        similarity: score,
        matchedFeatures
      };
    });

    return similarities
      .filter(sim => sim.similarity > 0.2)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 6);
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

  private parseVisionResult(result: any): CarFeatures {
    return {
      bodyType: result.bodyType || 'sedan',
      color: result.dominantColor || 'unknown',
      brand: result.detectedBrand || undefined,
      confidence: result.confidence || 0.5
    };
  }

  private fallbackAnalysis(imageFile: File): CarFeatures {
    const fileName = imageFile.name.toLowerCase();
    let bodyType = 'sedan';
    let color = 'unknown';

    if (fileName.includes('suv')) bodyType = 'suv';
    if (fileName.includes('truck')) bodyType = 'pickup';
    if (fileName.includes('hatchback')) bodyType = 'hatchback';

    const colors = ['red', 'blue', 'white', 'black', 'silver', 'grey'];
    for (const c of colors) {
      if (fileName.includes(c)) {
        color = c;
        break;
      }
    }

    return {
      bodyType,
      color,
      confidence: 0.3
    };
  }

  private matchesBodyType(car: any, targetType: string): boolean {
    const carType = this.inferBodyType(car);
    return carType === targetType;
  }

  private matchesColor(carColor: string, targetColor: string): boolean {
    if (!carColor || !targetColor) return false;
    return carColor.toLowerCase().includes(targetColor.toLowerCase()) ||
           targetColor.toLowerCase().includes(carColor.toLowerCase());
  }

  private matchesBrand(carBrand: string, targetBrand: string): boolean {
    if (!carBrand || !targetBrand) return false;
    return carBrand.toLowerCase() === targetBrand.toLowerCase();
  }

  private inferBodyType(car: any): string {
    const model = car.model?.toLowerCase() || '';
    const brand = car.brand?.toLowerCase() || '';
    
    if (model.includes('suv') || model.includes('cr-v') || model.includes('rav4')) return 'suv';
    if (model.includes('f-150') || model.includes('pickup')) return 'pickup';
    if (model.includes('hatchback')) return 'hatchback';
    
    return 'sedan';
  }
}

export const visualRecognition = new VisualRecognitionService();