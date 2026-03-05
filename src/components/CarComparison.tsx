import { CalendarCheck, TrendingUp, Gauge, Fuel, Settings2, Check, X } from 'lucide-react';
import { CAR_DATABASE } from '../data/cars';

interface CarComparisonProps {
  carId1: string;
  carId2: string;
  onBook?: (carId: string, carName: string) => void;
}

export function CarComparison({ carId1, carId2, onBook }: CarComparisonProps) {
  const car1 = CAR_DATABASE.find(c => c.id === carId1);
  const car2 = CAR_DATABASE.find(c => c.id === carId2);
  if (!car1 || !car2) return null;

  const formatPriceShort = (n: number) => {
    if (n >= 1_000_000) {
      const v = (n / 1_000_000).toFixed(1).replace(/\.0$/, '');
      return `${v}M`;
    }
    if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
    return `${n}`;
  };

  const rows = [
    { label: 'Price', icon: '💰', v1: `GHS ${formatPriceShort(car1.price)}`, v2: `GHS ${formatPriceShort(car2.price)}`, winner: car1.price < car2.price ? 1 : 2, full1: `GHS ${car1.price.toLocaleString()}`, full2: `GHS ${car2.price.toLocaleString()}` },
    { label: 'Year', icon: '📅', v1: String(car1.year), v2: String(car2.year), winner: car1.year > car2.year ? 1 : 2 },
    { label: 'Mileage', icon: '📍', v1: (car1 as any).mileage || 'N/A', v2: (car2 as any).mileage || 'N/A', winner: 0 },
    { label: 'Fuel', icon: '⛽', v1: (car1 as any).fuel || 'Petrol', v2: (car2 as any).fuel || 'Petrol', winner: 0 },
    { label: 'Transmission', icon: '⚙️', v1: (car1 as any).transmission || 'Auto', v2: (car2 as any).transmission || 'Auto', winner: 0 },
    { label: 'Colour', icon: '🎨', v1: (car1 as any).color || 'N/A', v2: (car2 as any).color || 'N/A', winner: 0 },
  ];

  return (
    <div className="rounded-2xl overflow-hidden border border-[#2f3b43] bg-[#111b21] mb-2 w-full">
      {/* Header */}
      <div className="bg-[#0b141a] px-3 py-2 flex items-center gap-2 border-b border-[#2f3b43]">
        <TrendingUp className="w-3.5 h-3.5 text-[#00a884]" />
        <span className="text-[#00a884] text-[11px] font-bold uppercase tracking-wide">Side-by-Side Comparison</span>
      </div>

      {/* Car headers */}
      <div className="grid grid-cols-3 gap-0">
        <div /> {/* spacer */}
        {[car1, car2].map((car, i) => (
          <div key={i} className={`p-2 text-center border-b border-[#2f3b43] ${i === 0 ? 'border-r border-[#2f3b43]' : ''}`}>
            <div className="relative mb-1.5">
              <img src={(car as any).real_image || car.image_url} alt={`${car.brand} ${car.model}`}
                className="w-full h-20 object-cover rounded-xl"
                onError={e => { e.currentTarget.src = car.image_url; }} />
              <span className="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{car.year}</span>
            </div>
            <p className="text-[#e9edef] font-bold text-[11px] leading-tight">{car.brand}</p>
            <p className="text-[#8696a0] text-[10px]">{car.model}</p>
          </div>
        ))}
      </div>

      {/* Comparison rows */}
      {rows.map((row, i) => (
        <div key={i} className={`grid grid-cols-3 border-b border-[#2f3b43] last:border-0 ${i % 2 === 0 ? 'bg-[#0b141a]/50' : ''}`}>
          <div className="px-2 py-2 flex items-center gap-1.5">
            <span className="text-[11px]">{row.icon}</span>
            <span className="text-[#8696a0] text-[10px] font-medium">{row.label}</span>
          </div>
          {[{ val: row.v1, win: row.winner === 1, full: (row as any).full1 }, { val: row.v2, win: row.winner === 2, full: (row as any).full2 }].map((cell, j) => (
            <div key={j} className={`px-2 py-2 text-center border-l border-[#2f3b43] ${cell.win ? 'bg-[#00a884]/10' : ''}`}>
              <span title={cell.full} className={`text-[11px] font-semibold ${cell.win ? 'text-[#00a884]' : 'text-[#e9edef]'}`}>
                {cell.val}
                {cell.win && <span className="ml-1 text-[9px]">✓</span>}
              </span>
            </div>
          ))}
        </div>
      ))}

      {/* Book buttons */}
      <div className="grid grid-cols-2 gap-2 p-2 bg-[#0b141a]">
        {[car1, car2].map((car, i) => (
          <button key={i}
            onClick={() => onBook?.(car.id, `${car.brand} ${car.model}`)}
            className="flex items-center justify-center gap-1.5 bg-[#00a884] hover:bg-[#008f72] active:scale-95 text-white text-[11px] font-bold py-2 rounded-[6%] transition-all">
            <CalendarCheck className="w-3 h-3" />
            Book {car.model}
          </button>
        ))}
      </div>
    </div>
  );
}

