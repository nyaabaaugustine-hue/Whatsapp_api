import { useState, useEffect } from 'react';
import { ChatArea } from './components/ChatArea';
import AdminDashboard from './pages/AdminDashboard';
import InventoryPage from './pages/InventoryPage';
import { X, MessageCircle, BadgeCheck, ShieldCheck, Fuel, Truck } from 'lucide-react';
import { CAR_DATABASE } from './data/cars';
import { BookingModal } from './components/BookingModal';
import { InstallPrompt } from './components/InstallPrompt';

const WA_ICON = (
  <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

const formatPriceShort = (n: number) => {
  if (n >= 1_000_000) {
    const v = (n / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${v}M`;
  }
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${n}`;
};

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'home' | 'admin' | 'inventory'>('home');
  const [cars, setCars] = useState(CAR_DATABASE);
  const featured = cars.slice(0, 3);
  const listing = cars.length > 6 ? cars.slice(3, 9) : cars.slice(0, 6);
  const [bookingModal, setBookingModal] = useState<{ carId: string; carName: string } | null>(null);

  // Lock body scroll when chat open (mobile full screen)
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleHashChange = () => {
      const h = window.location.hash;
      if (h === '#admin') setView('admin');
      else if (h === '#inventory') setView('inventory');
      else setView('home');
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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

  if (view === 'admin') {
    return <AdminDashboard />;
  }
  if (view === 'inventory') {
    return <InventoryPage onBack={() => { window.location.hash = ''; }} />;
  }

  return (
    <div className="min-h-screen bg-[#0f172a] font-sans overflow-x-hidden">
      <header className="border-b border-[#1e293b] bg-[#0f172a]">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[#e9edef] font-black text-xl">Drivemond</span>
            <span className="text-xs text-white bg-[#800020] px-2 py-0.5 rounded-full font-black">Ghana</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="tel:+233504512884"
              className="text-[#e9edef] px-4 py-2 rounded-[7%] text-sm font-bold ring-2 ring-[#FFD700] ring-offset-2 ring-offset-[#0f172a] hover:bg-[#13202a] transition"
            >
              Call Developers
            </a>
          </div>
        </div>
      </header>

      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] via-[#0f172a] to-[#0b141a]" />
        <div className="max-w-6xl mx-auto px-5 py-14 relative">
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <div>
              <h1 className="text-white text-4xl sm:text-5xl font-black leading-tight">Find Your Car. Beautifully Simple.</h1>
              <p className="text-[#aebac1] text-base mt-3 max-w-xl">Clean, verified vehicles with transparent pricing. Book a test drive or chat instantly.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => { document.getElementById('inventory')?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="border border-[#2f3b43] text-[#e9edef] px-6 py-3 rounded-xl font-black hover:bg-[#13202a]"
                >
                  Browse Cars
                </button>
                <button
                  onClick={() => { window.location.hash = '#inventory'; }}
                  className="border border-[#2f3b43] text-[#e9edef] px-6 py-3 rounded-xl font-black hover:bg-[#13202a]"
                >
                  View All Inventory
                </button>
              </div>
              <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
                <div className="bg-[#101a21] border border-[#FFD700] rounded-xl p-4 text-center shadow-[0_0_0_1px_rgba(255,215,0,0.25)]">
                  <ShieldCheck className="w-6 h-6 text-[#e9edef] mx-auto" />
                  <p className="text-[#aebac1] text-xs font-bold mt-1">Verified History</p>
                </div>
                <div className="bg-[#101a21] border border-[#FFD700] rounded-xl p-4 text-center shadow-[0_0_0_1px_rgba(255,215,0,0.25)]">
                  <Fuel className="w-6 h-6 text-[#e9edef] mx-auto" />
                  <p className="text-[#aebac1] text-xs font-bold mt-1">Fuel Efficient</p>
                </div>
                <div className="bg-[#101a21] border border-[#FFD700] rounded-xl p-4 text-center shadow-[0_0_0_1px_rgba(255,215,0,0.25)]">
                  <Truck className="w-6 h-6 text-[#e9edef] mx-auto" />
                  <p className="text-[#aebac1] text-xs font-bold mt-1">Nationwide Delivery</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-[#1e293b]">
              <img src="https://res.cloudinary.com/dwsl2ktt2/image/upload/v1772196823/admin-ajax_qqvclw.jpg" alt="Hero" className="w-full h-[340px] object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Inventory Carousel */}
      {cars.length > 6 && (
        <section id="inventory" className="max-w-6xl mx-auto px-5 py-6">
          <div className="text-white font-black text-2xl mb-3">Featured Inventory</div>
          <div className="overflow-x-hidden">
            <div className="flex gap-4 snap-x snap-mandatory">
              {featured.map(car => {
                const img = (car as any).real_image || car.image_url;
                return (
                  <div key={`carousel-${car.id}`} className="snap-center flex-shrink-0 w-[320px] sm:w-[360px] rounded-2xl overflow-hidden bg-[#101a21] border border-[#1e293b] shadow-sm">
                    <div className="relative">
                      <img src={img} alt={`${car.brand} ${car.model}`} className="w-full h-40 object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between">
                        <div className="bg-black/70 backdrop-blur-[1px] px-2 py-1 rounded-md">
                          <p className="text-[#EDEDED] font-black text-[14px] drop-shadow-sm">{car.brand} {car.model}</p>
                          <p className="text-[#EDEDED]/90 text-[10px]">{car.year}</p>
                        </div>
                        <p
                          title={`GHS ${car.price.toLocaleString()}`}
                          className="bg-black/70 text-[#EDEDED] font-black text-[14px] drop-shadow-sm px-2 py-1 rounded-md"
                        >
                          GHS {formatPriceShort(car.price)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Inventory Grid */}
      <section className="max-w-6xl mx-auto px-5 pb-10">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listing.map(car => {
            const img = (car as any).real_image || car.image_url;
            return (
              <div key={car.id} className="group rounded-2xl overflow-hidden bg-[#101a21] border border-[#1e293b] shadow-sm hover:shadow-xl transition-all">
                <div className="relative">
                  <img src={img} alt={`${car.brand} ${car.model}`} className="w-full h-48 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-95" />
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
                  <div className="grid grid-cols-1 gap-2" />
                </div>
              </div>
            );
          })}
        </div>
      </section>


      {bookingModal && (
        <BookingModal
          carId={bookingModal.carId}
          carName={bookingModal.carName}
          onConfirm={() => { setBookingModal(null); }}
          onClose={() => setBookingModal(null)}
        />
      )}

      <footer className="bg-[#0f172a]">
        <div className="max-w-6xl mx-auto px-5 py-6 text-center">
          <p className="text-[#8696a0] text-xs">© 2026 Drivemond. All Rights Reserved.</p>
        </div>
      </footer>



      {/* CHAT OVERLAY
          Mobile -> fixed inset-0 (true full screen)
          Desktop -> floating panel bottom-right
      */}
      <>
        {/* Mobile full-screen chat */}
        <div
          className={`fixed inset-0 z-[999] flex flex-col bg-[#0b141a] sm:hidden transition-all duration-300 ease-out ${
            isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
          }`}
          style={{ height: '100dvh', width: '100vw' }}
        >
          <ChatArea onClose={() => setIsOpen(false)} />
        </div>

        {/* Desktop floating panel */}
        <div
          className={`hidden sm:flex fixed bottom-24 right-6 z-[999] w-[416px] flex-col bg-[#0b141a] rounded-2xl shadow-2xl overflow-hidden border border-[#2f3b43] transition-all duration-300 ease-out ${
            isOpen ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' : 'opacity-0 translate-y-6 scale-[0.98] pointer-events-none'
          }`}
          style={{ height: 'min(673px, calc(100vh - 120px))' }}
        >
          <ChatArea onClose={() => setIsOpen(false)} />
        </div>
      </>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          FLOATING ACTION BUTTON
          Shown on BOTH mobile & desktop when chat is closed
      â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open Chat"
          className="
            fixed bottom-6 right-6 z-[998]
            w-[73.6px] h-[73.6px] rounded-full
            bg-[#25D366] hover:bg-[#20bd5a]
            flex items-center justify-center
            shadow-2xl ring-2 ring-[#FFD700] ring-offset-2 ring-offset-[#0f172a]
            transition-transform active:scale-95 hover:scale-105
          "
        >
          <div className="relative">
            {WA_ICON}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-white border-2 border-[#25D366]" />
            </span>
          </div>
        </button>
      )}

      {/* Desktop close FAB (shows when chat is open on desktop) */}
      <button
        onClick={() => setIsOpen(false)}
        aria-label="Close Chat"
        className="
          hidden sm:flex
          fixed bottom-6 right-6 z-[1000]
          w-[73.6px] h-[73.6px] rounded-full
          bg-[#25D366] hover:bg-[#20bd5a]
          items-center justify-center
          shadow-2xl ring-2 ring-[#FFD700] ring-offset-2 ring-offset-[#0f172a]
          transition-transform active:scale-95 hover:scale-105
          sm:[display:flex]
        "
        style={{ display: isOpen ? undefined : 'none' }}
      >
        <X className="w-7 h-7 text-white" />
      </button>

      <style>{``}</style>
      <InstallPrompt />
    </div>
  );
}

