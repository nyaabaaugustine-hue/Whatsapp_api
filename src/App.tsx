import { useState, useEffect } from 'react';
import { ChatArea } from './components/ChatArea';
import AdminDashboard from './pages/AdminDashboard';
import { X, MessageCircle } from 'lucide-react';

const WA_ICON = (
  <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'home' | 'admin'>('home');

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
      setView(window.location.hash === '#admin' ? 'admin' : 'home');
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (view === 'admin') {
    return <AdminDashboard />;
  }

  return (
    <div className="min-h-screen bg-[#0f172a] font-sans">

      {/* ══════════════════════════════
          MOBILE LAYOUT  (< 640px)
      ══════════════════════════════ */}
      <div className="block sm:hidden">
        <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] px-5 pt-10 pb-6 text-center">
          <div className="text-5xl mb-3">🚗</div>
          <h1 className="text-white text-2xl font-black leading-tight mb-2">Premium Cars<br />in Ghana</h1>
          <p className="text-slate-400 text-sm leading-relaxed">Clean, reliable vehicles. Daily drivers to luxury models.</p>
        </div>

        <img
          src="https://res.cloudinary.com/dwsl2ktt2/image/upload/v1772196823/admin-ajax_qqvclw.jpg"
          alt="Cars"
          className="w-full h-48 object-cover"
        />

        <div className="bg-white px-4 py-6">
          <h2 className="text-center text-sm font-black uppercase text-slate-500 mb-4">✨ What We Offer</h2>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { icon: '🏎', label: 'Luxury Sedans' },
              { icon: '🏔', label: 'Rugged SUVs' },
              { icon: '⛽', label: 'Fuel Efficient' },
              { icon: '🛡', label: 'Verified History' },
            ].map(f => (
              <div key={f.label} className="bg-slate-50 rounded-xl p-4 text-center shadow-sm">
                <div className="text-2xl mb-1">{f.icon}</div>
                <p className="text-xs font-bold text-slate-700">{f.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 rounded-xl p-4 mb-6">
            <h3 className="text-sm font-black text-blue-900 mb-3">💎 Why Choose Us?</h3>
            {['Clean Title & Verified History', 'Competitive Pricing in GHS', 'Flexible Payment Options', 'Professional After-Sales Support', 'Nationwide Delivery'].map(b => (
              <p key={b} className="text-xs font-semibold text-blue-800 py-1">✔ {b}</p>
            ))}
          </div>

          <button
            onClick={() => setIsOpen(true)}
            className="w-full bg-[#25D366] text-white py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
          >
            <MessageCircle className="w-5 h-5" />
            Chat with Abena Now
          </button>
          <p className="text-center text-xs text-slate-400 mt-2">Typically replies in seconds</p>
        </div>

        <div className="bg-[#0f172a] py-6 text-center">
          <p className="text-slate-500 text-xs">© 2026 Drivemond. All Rights Reserved.</p>
        </div>
      </div>

      {/* ══════════════════════════════
          DESKTOP LAYOUT  (≥ 640px)
      ══════════════════════════════ */}
      <div className="hidden sm:block">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-r from-[#0f172a] to-[#1e3a8a] px-8 py-10 text-center">
              <h1 className="text-white text-3xl font-black uppercase tracking-wide">
                🚗 Premium Vehicle Sales & Consulting
              </h1>
            </div>
            <img
              src="https://res.cloudinary.com/dwsl2ktt2/image/upload/v1772196823/admin-ajax_qqvclw.jpg"
              alt="Hero"
              className="w-full h-64 object-cover"
            />
            <div className="px-12 py-10 text-center">
              <h2 className="text-xl font-black uppercase text-blue-900 mb-4">Find Your Dream Car Today</h2>
              <p className="text-slate-600 leading-relaxed font-semibold">
                We offer the cleanest and most reliable vehicles in the Ghanaian market. From fuel-efficient daily drivers to high-end luxury models, we help you find the perfect match with prestige and peace of mind.
              </p>
            </div>
            <div className="bg-slate-50 px-8 py-8">
              <h2 className="text-center text-lg font-black uppercase mb-6">✨ Key Features</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: '🏎', label: 'Luxury Sedans' },
                  { icon: '🏔', label: 'Rugged SUVs' },
                  { icon: '⛽', label: 'Fuel Efficient' },
                  { icon: '🛡', label: 'Verified History' },
                  { icon: '🤝', label: 'Expert Consulting' },
                  { icon: '🚚', label: 'Nationwide Delivery' },
                ].map(f => (
                  <div key={f.label} className="bg-white rounded-xl p-5 text-center shadow-sm">
                    <div className="text-3xl mb-2">{f.icon}</div>
                    <p className="font-bold text-sm text-slate-700">{f.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-12 py-10">
              <h2 className="text-lg font-black uppercase text-center text-blue-900 mb-6">💎 Why Choose Us?</h2>
              {['Clean Title & Verified History', 'Competitive Pricing in GHS', 'Flexible Payment Options', 'Professional After-Sales Support', 'Nationwide Delivery Available'].map(b => (
                <p key={b} className="font-bold text-slate-700 py-1.5">✔ {b}</p>
              ))}
            </div>
            <div className="bg-slate-100 px-8 py-12 text-center">
              <h2 className="text-xl font-black uppercase mb-6">Ready to Find Your Next Car?</h2>
              <button
                onClick={() => setIsOpen(true)}
                className="bg-[#25D366] text-white px-10 py-4 rounded-xl font-black text-lg hover:bg-[#20bd5a] transition shadow-lg"
              >
                💬 Chat with Abena
              </button>
            </div>
            <div className="bg-[#0f172a] py-6 text-center">
              <p className="text-slate-500 text-sm">© 2026 Drivemond. All Rights Reserved.</p>
            </div>
          </div>
        </div>
      </div>



      {/* ══════════════════════════════════════════════════
          CHAT OVERLAY
          • Mobile  → fixed inset-0  (TRUE full screen)
          • Desktop → floating panel bottom-right
      ══════════════════════════════════════════════════ */}
      {isOpen && (
        <>
          {/* ── MOBILE full-screen chat ── */}
          <div
            className="
              fixed inset-0 z-[999]
              flex flex-col
              bg-[#0b141a]
              sm:hidden
            "
            style={{ height: '100dvh', width: '100vw' }}
          >
            <ChatArea onClose={() => setIsOpen(false)} />
          </div>

          {/* ── DESKTOP floating panel ── */}
          <div
            className="
              hidden sm:flex
              fixed bottom-24 right-6 z-[999]
              w-[378px]
              flex-col
              bg-[#0b141a] rounded-2xl shadow-2xl overflow-hidden
              border border-[#2f3b43]
            "
            style={{ animation: 'slideUp 0.25s ease', height: 'min(612px, calc(100vh - 120px))' }}
          >
            <ChatArea onClose={() => setIsOpen(false)} />
          </div>
        </>
      )}

      {/* ══════════════════════════════
          FLOATING ACTION BUTTON
          Shown on BOTH mobile & desktop when chat is closed
      ══════════════════════════════ */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          aria-label="Open Chat"
          className="
            fixed bottom-6 right-6 z-[998]
            w-16 h-16 rounded-full
            bg-[#25D366] hover:bg-[#20bd5a]
            flex items-center justify-center
            shadow-2xl
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
          w-16 h-16 rounded-full
          bg-[#25D366] hover:bg-[#20bd5a]
          items-center justify-center
          shadow-2xl
          transition-transform active:scale-95 hover:scale-105
          sm:[display:flex]
        "
        style={{ display: isOpen ? undefined : 'none' }}
      >
        <X className="w-7 h-7 text-white" />
      </button>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
