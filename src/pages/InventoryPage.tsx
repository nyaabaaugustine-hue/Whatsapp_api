import { BadgeCheck, ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CAR_DATABASE } from '../data/cars';

interface InventoryPageProps {
  onBack: () => void;
}

export default function InventoryPage({ onBack }: InventoryPageProps) {
  const [cars, setCars] = useState(CAR_DATABASE);

  const formatPriceShort = (n: number) => {
    if (n >= 1_000_000) {
      const v = (n / 1_000_000).toFixed(1).replace(/\.0$/, '');
      return `${v}M`;
    }
    if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
    return `${n}`;
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/cars');
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data?.cars) ? data.cars : [];
        if (active && list.length > 0) setCars(list);
      } catch {}
    })();
    return () => { active = false; };
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] font-sans">
      <header className="border-b border-[#1e293b] bg-[#0f172a]">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-[#e9edef] px-3 py-2 rounded-[7%] text-sm font-bold border border-[#2f3b43] hover:bg-[#13202a] transition inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <span className="text-[#e9edef] font-black text-xl">All Inventory</span>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-5 py-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map(car => {
            const img = (car as any).real_image || car.image_url;
            return (
              <div key={car.id} className="group rounded-2xl overflow-hidden bg-[#101a21] border border-[#1e293b] shadow-sm hover:shadow-xl transition-all">
                <div className="relative">
                  <img src={img} alt={`${car.brand} ${car.model}`} className="w-full h-48 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-90" />
                  <div className="absolute top-3 left-3 text-white text-xs px-2 py-1 rounded-full bg-black/50 border border-white/20">
                    {car.year}
                  </div>
                  <div className="absolute top-3 right-3 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-[#003d32] text-[#25D366] border border-[#05846e]">
                    <BadgeCheck className="w-3 h-3" /> Available
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                    <div className="bg-black/70 backdrop-blur-[1px] px-2 py-1 rounded-md">
                      <p className="text-[#EDEDED] font-black text-[16px] drop-shadow-sm">{car.brand} {car.model}</p>
                      <p className="text-[#EDEDED]/90 text-[11px]">Clean title - Verified</p>
                    </div>
                    <div className="text-right">
                      <p
                        title={`GHS ${car.price.toLocaleString()}`}
                        className="bg-black/70 text-[#EDEDED] font-black text-[18px] drop-shadow-sm px-2 py-1 rounded-md"
                      >
                        GHS {formatPriceShort(car.price)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(car as any).transmission && <span className="text-[11px] px-2 py-1 rounded-full bg-[#2a3942] text-[#aebac1] border border-[#3d4f5c]">Transmission: {(car as any).transmission}</span>}
                    {(car as any).fuel && <span className="text-[11px] px-2 py-1 rounded-full bg-[#2a3942] text-[#aebac1] border border-[#3d4f5c]">Fuel: {(car as any).fuel}</span>}
                    {(car as any).mileage && <span className="text-[11px] px-2 py-1 rounded-full bg-[#2a3942] text-[#aebac1] border border-[#3d4f5c]">Mileage: {(car as any).mileage}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
