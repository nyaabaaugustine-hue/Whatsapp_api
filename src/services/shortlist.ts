import { CAR_DATABASE } from '../data/cars';

export type ShortlistItem = {
  id: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  image: string;
  note?: string;
};

const KEY = '__shortlist__';
const NOTES_KEY = '__shortlist_notes__';

export function getShortlist(): ShortlistItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function setShortlist(items: ShortlistItem[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
}

export function addToShortlist(car: any) {
  const img = (car as any).real_image || car.image_url;
  const item: ShortlistItem = {
    id: String(car.id),
    brand: car.brand,
    model: car.model,
    year: Number(car.year || new Date().getFullYear()),
    price: Number(car.price || 0),
    image: img,
  };
  const list = getShortlist();
  if (!list.find(s => s.id === item.id)) {
    list.push(item);
    setShortlist(list);
  }
}

export function removeFromShortlist(id: string) {
  const list = getShortlist().filter(s => s.id !== id);
  setShortlist(list);
}

export function setNote(id: string, note: string) {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[id] = note;
    localStorage.setItem(NOTES_KEY, JSON.stringify(map));
  } catch {}
}

export function getNote(id: string): string {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map[id] || '';
  } catch { return ''; }
}

export function shortlistShareText(): string {
  const list = getShortlist();
  if (!list.length) return 'My shortlist is empty.';
  const lines = list.map(s => `• ${s.year} ${s.brand} ${s.model} — GHS ${s.price.toLocaleString()}`);
  return `My shortlist at Drivemond:\n\n${lines.join('\n')}\n\nChat with Drivemond: https://wa.me/233504512884`;
}

export function findSimilar(seedId: string, limit = 6): ShortlistItem[] {
  const seed = CAR_DATABASE.find(c => String(c.id) === String(seedId));
  if (!seed) return [];
  const seedType = (() => {
    const b = seed.brand.toLowerCase();
    const m = seed.model.toLowerCase();
    if (['rav4','cr-v','rx'].some(x => m.includes(x))) return 'SUV';
    if (m.includes('f-150')) return 'Pickup';
    if (['mercedes-benz','lexus'].some(x => b.includes(x))) return 'Luxury';
    return 'Sedan';
  })();
  const scores = CAR_DATABASE.map((c: any) => {
    const typeScore = (() => {
      const b = c.brand.toLowerCase();
      const m = c.model.toLowerCase();
      const t = ['rav4','cr-v','rx'].some(x => m.includes(x)) ? 'SUV' : m.includes('f-150') ? 'Pickup' : (['mercedes-benz','lexus'].some(x => b.includes(x)) ? 'Luxury' : 'Sedan');
      return t === seedType ? 3 : 0;
    })();
    const brandScore = c.brand === seed.brand ? 2 : 0;
    const priceDiff = Math.abs(Number(c.price || 0) - Number(seed.price || 0));
    const priceScore = priceDiff < 20000 ? 2 : priceDiff < 50000 ? 1 : 0;
    const score = typeScore + brandScore + priceScore;
    return { c, score };
  }).filter(x => String(x.c.id) !== String(seedId));
  const sorted = scores.sort((a, b) => b.score - a.score).slice(0, limit).map(({ c }) => ({
    id: String(c.id),
    brand: c.brand,
    model: c.model,
    year: Number(c.year || new Date().getFullYear()),
    price: Number(c.price || 0),
    image: (c as any).real_image || c.image_url,
  }));
  return sorted;
}
