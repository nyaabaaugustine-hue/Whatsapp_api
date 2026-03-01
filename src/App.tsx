/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { ChatArea } from './components/ChatArea';
import { AdminPanel } from './components/AdminPanel';
import { X, Settings } from 'lucide-react';

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'home' | 'admin'>('home');

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setView('admin');
      } else {
        setView('home');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (view === 'admin') {
    return <AdminPanel onBack={() => window.location.hash = ''} />;
  }

  return (
    <div style={{ margin: 0, padding: 0, backgroundColor: '#0f172a', fontFamily: 'Helvetica, Arial, sans-serif', minHeight: '100vh' }}>
      <table width="100%" cellPadding={0} cellSpacing={0} border={0} style={{ backgroundColor: '#0f172a', padding: '40px 15px' }}>
        <tbody>
          <tr>
            <td align="center">
              {/* MAIN CONTAINER */}
              <table width="720" cellPadding={0} cellSpacing={0} border={0} style={{ background: '#ffffff', borderRadius: '18px', overflow: 'hidden', boxShadow: '0 25px 60px rgba(0,0,0,0.45)' }}>
                <tbody>
                  {/* HEADER */}
                  <tr>
                    <td align="center" style={{ background: 'linear-gradient(135deg,#0f172a,#1e293b)', padding: '40px 30px' }}>
                      <h1 style={{ margin: 0, color: '#ffffff', fontSize: '32px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase' }}>
                        🚗 Premium Vehicle Sales & Consulting
                      </h1>
                    </td>
                  </tr>

                  {/* HERO IMAGE */}
                  <tr>
                    <td>
                      <img src="https://res.cloudinary.com/dwsl2ktt2/image/upload/v1772196823/admin-ajax_qqvclw.jpg" width="100%" style={{ display: 'block', width: '100%', height: 'auto' }} alt="Hero" />
                    </td>
                  </tr>

                  {/* INTRO */}
                  <tr>
                    <td style={{ padding: '50px 50px 20px 50px', color: '#0f172a', textAlign: 'center' }}>
                      <h2 style={{ margin: '0 0 20px 0', fontSize: '22px', fontWeight: 900, textTransform: 'uppercase', color: '#1e3a8a' }}>
                        Find Your Dream Car Today
                      </h2>
                      <p style={{ margin: 0, fontSize: '16px', lineHeight: 1.9, fontWeight: 700 }}>
                        We offer the cleanest and most reliable vehicles in the Ghanaian market. From fuel-efficient daily drivers to high-end luxury models, we help you find the perfect match with prestige and peace of mind.
                      </p>
                    </td>
                  </tr>

                  {/* FEATURES SECTION */}
                  <tr>
                    <td style={{ padding: '40px 40px', background: '#f8fafc' }}>
                      <h2 style={{ margin: '0 0 30px 0', fontSize: '20px', fontWeight: 900, textTransform: 'uppercase', textAlign: 'center', color: '#111827' }}>
                        ✨ Key Features
                      </h2>
                      <table width="100%" cellPadding={0} cellSpacing={0}>
                        <tbody>
                          <tr>
                            <td width="50%" style={{ padding: '12px' }}>
                              <div style={{ background: '#ffffff', padding: '22px', borderRadius: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                                <div style={{ fontSize: '26px' }}>🏎</div>
                                <p style={{ margin: '10px 0 0 0', fontWeight: 800 }}>Luxury Sedans</p>
                              </div>
                            </td>
                            <td width="50%" style={{ padding: '12px' }}>
                              <div style={{ background: '#ffffff', padding: '22px', borderRadius: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                                <div style={{ fontSize: '26px' }}>🏔</div>
                                <p style={{ margin: '10px 0 0 0', fontWeight: 800 }}>Rugged SUVs</p>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td width="50%" style={{ padding: '12px' }}>
                              <div style={{ background: '#ffffff', padding: '22px', borderRadius: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                                <div style={{ fontSize: '26px' }}>⛽</div>
                                <p style={{ margin: '10px 0 0 0', fontWeight: 800 }}>Fuel Efficient</p>
                              </div>
                            </td>
                            <td width="50%" style={{ padding: '12px' }}>
                              <div style={{ background: '#ffffff', padding: '22px', borderRadius: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                                <div style={{ fontSize: '26px' }}>🛡</div>
                                <p style={{ margin: '10px 0 0 0', fontWeight: 800 }}>Verified History</p>
                              </div>
                            </td>
                          </tr>
                          <tr>
                            <td colSpan={2} style={{ padding: '12px' }}>
                              <div style={{ background: '#ffffff', padding: '22px', borderRadius: '12px', boxShadow: '0 8px 20px rgba(0,0,0,0.06)', textAlign: 'center' }}>
                                <div style={{ fontSize: '26px' }}>🤝</div>
                                <p style={{ margin: '10px 0 0 0', fontWeight: 800 }}>Expert Consulting</p>
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>

                  {/* BENEFITS */}
                  <tr>
                    <td style={{ padding: '50px 45px' }}>
                      <h2 style={{ margin: '0 0 30px 0', fontSize: '20px', fontWeight: 900, textTransform: 'uppercase', textAlign: 'center', color: '#1e3a8a' }}>
                        💎 Why Choose Us?
                      </h2>
                      <p style={{ margin: '8px 0', fontSize: '15px', fontWeight: 800 }}>✔ Clean Title & Verified History</p>
                      <p style={{ margin: '8px 0', fontSize: '15px', fontWeight: 800 }}>✔ Competitive Pricing in GHS</p>
                      <p style={{ margin: '8px 0', fontSize: '15px', fontWeight: 800 }}>✔ Flexible Payment Options</p>
                      <p style={{ margin: '8px 0', fontSize: '15px', fontWeight: 800 }}>✔ Professional After-Sales Support</p>
                      <p style={{ margin: '8px 0', fontSize: '15px', fontWeight: 800 }}>✔ Nationwide Delivery Available</p>
                    </td>
                  </tr>

                  {/* CTA */}
                  <tr>
                    <td align="center" style={{ background: '#f3f4f6', padding: '60px 30px' }}>
                      <h2 style={{ margin: '0 0 25px 0', fontWeight: 900, textTransform: 'uppercase' }}>
                        Ready to Find Your Next Car?
                      </h2>
                      <button onClick={() => setIsOpen(true)} style={{ display: 'inline-block', background: '#25D366', color: '#ffffff', padding: '16px 38px', textDecoration: 'none', fontWeight: 900, borderRadius: '7%', margin: '8px', cursor: 'pointer', border: 'none', fontSize: '16px' }}>
                        💬 CHAT WITH ABENA Developers
                      </button>
                    </td>
                  </tr>

                  {/* FOOTER */}
                  <tr>
                    <td style={{ background: '#0f172a', padding: '35px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', lineHeight: '22px' }}>
                      <p style={{ margin: '0 0 10px 0', fontWeight: 700 }}>
                        © 2026. All Rights Reserved.
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Admin Link (Subtle) */}
      <a 
        href="#admin" 
        className="fixed top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white/40 hover:text-white/80 rounded-full transition-all backdrop-blur-sm"
        title="Admin Panel"
      >
        <Settings className="w-5 h-5" />
      </a>

      {/* Floating WhatsApp Widget */}
      <div className="fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
        {isOpen && (
          <div className="fixed inset-0 sm:absolute sm:inset-auto sm:bottom-10 sm:right-0 w-full h-[100dvh] sm:w-[440px] sm:h-[685px] sm:max-h-[90vh] sm:max-w-[calc(100vw-3rem)] bg-[#0b141a] sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col origin-bottom-right transition-all border-none sm:border sm:border-[#2f3b43] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <ChatArea onClose={() => setIsOpen(false)} />
          </div>
        )}
        
        <div className="relative group p-4 sm:p-0">
          {/* Decorative Ring */}
          <div className="absolute -inset-1 bg-gradient-to-r from-[#25D366] to-[#128C7E] rounded-full blur opacity-40 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
          
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="relative w-16 h-16 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 z-10"
            aria-label="Toggle WhatsApp Chat"
          >
            {isOpen ? (
              <X className="w-7 h-7" />
            ) : (
              <div className="relative">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                </svg>
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-white border-2 border-[#25D366]"></span>
                </span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
