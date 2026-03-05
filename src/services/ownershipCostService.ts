import { deriveVehicleType } from './vehicleType';

export type OwnershipCostConfig = {
  sedan_base: number;
  suv_base: number;
  pickup_base: number;
  luxury_base: number;
  service_avg: number;
  insurance_avg: number;
};

let cachedConfig: OwnershipCostConfig | null = null;
let lastFetch = 0;
const TTL_MS = 10 * 60 * 1000;

function getEnvConfig(): OwnershipCostConfig {
  const env = (import.meta as any).env || {};
  return {
    sedan_base: Number(env.VITE_COST_BASE_SEDAN ?? 500),
    suv_base: Number(env.VITE_COST_BASE_SUV ?? 650),
    pickup_base: Number(env.VITE_COST_BASE_PICKUP ?? 700),
    luxury_base: Number(env.VITE_COST_BASE_LUXURY ?? 600),
    service_avg: Number(env.VITE_COST_SERVICE ?? 200),
    insurance_avg: Number(env.VITE_COST_INSURANCE ?? 250),
  };
}

async function fetchLatestConfig(): Promise<void> {
  try {
    const r = await fetch('/api/config/ownership');
    if (!r.ok) {
      cachedConfig = getEnvConfig();
      lastFetch = Date.now();
      return;
    }
    const data = await r.json();
    const cfg = {
      sedan_base: Number(data?.sedan_base ?? 500),
      suv_base: Number(data?.suv_base ?? 650),
      pickup_base: Number(data?.pickup_base ?? 700),
      luxury_base: Number(data?.luxury_base ?? 600),
      service_avg: Number(data?.service_avg ?? 200),
      insurance_avg: Number(data?.insurance_avg ?? 250),
    };
    cachedConfig = cfg;
    lastFetch = Date.now();
    try { localStorage.setItem('__ownership_cfg__', JSON.stringify(cfg)); } catch {}
  } catch {
    try {
      const raw = localStorage.getItem('__ownership_cfg__');
      cachedConfig = raw ? JSON.parse(raw) : getEnvConfig();
    } catch {
      cachedConfig = getEnvConfig();
    }
    lastFetch = Date.now();
  }
}

export async function estimateMonthlyCost(car: { brand?: string; model?: string; fuel?: string }): Promise<number | null> {
  if (!car || !car.brand || !car.model) return null;
  const now = Date.now();
  if (!cachedConfig || now - lastFetch > TTL_MS) {
    await fetchLatestConfig();
    if (!cachedConfig) cachedConfig = getEnvConfig();
  }
  const cfg = cachedConfig!;
  const type = deriveVehicleType(car.brand, car.model);
  const base =
    type === 'SUV' ? cfg.suv_base :
    type === 'Pickup' ? cfg.pickup_base :
    type === 'Luxury' ? cfg.luxury_base :
    cfg.sedan_base;
  const monthly = base + cfg.service_avg + cfg.insurance_avg;
  return Math.round(monthly);
}
