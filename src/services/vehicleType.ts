export type VehicleType = 'Sedan' | 'SUV' | 'Pickup' | 'Luxury';

export function deriveVehicleType(brand: string, model: string): VehicleType {
  const b = brand.toLowerCase();
  const m = model.toLowerCase();
  if (['rav4', 'cr-v', 'rx'].some(x => m.includes(x))) return 'SUV';
  if (m.includes('f-150')) return 'Pickup';
  if (['mercedes-benz', 'lexus'].some(x => b.includes(x))) return 'Luxury';
  return 'Sedan';
}
