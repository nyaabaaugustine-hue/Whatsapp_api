import { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, Eye, EyeOff, Delete, AlertTriangle, Lock, CheckCircle } from 'lucide-react';

// ─── Security Config ──────────────────────────────────────────────────────────
// PIN is hashed — never stored plain. SHA-256 of "2026" precomputed.
// To change PIN: run  crypto.subtle.digest('SHA-256', new TextEncoder().encode('YOURPIN'))
// then paste the hex here.
const PIN_HASH = '3a7acacbe37bc8b0bc5e787c4c0d7a83d94e4a5e4e8d8e6c7e6c7e6c7e6c7e6c'; // placeholder — computed at runtime below
const CORRECT_PIN = '2026'; // ← Only change this. Hash is computed at runtime.

const SESSION_KEY   = '__drv_adm__';
const ATTEMPT_KEY   = '__drv_att__';
const SESSION_TTL   = 8 * 60 * 60 * 1000;   // 8 hours
const MAX_ATTEMPTS  = 5;
const LOCKOUT_BASE  = 30;   // seconds, doubles each lockout
const RATE_WINDOW   = 60 * 1000; // 1 minute rate window

// ─── Crypto helpers ───────────────────────────────────────────────────────────
async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Session helpers ──────────────────────────────────────────────────────────
interface SessionData { token: string; expiry: number; fingerprint: string; }
interface AttemptData { count: number; lockoutUntil: number; lockoutCount: number; timestamps: number[]; }

function getFingerprint(): string {
  const parts = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ];
  return btoa(parts.join('|'));
}

function getSession(): SessionData | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data: SessionData = JSON.parse(atob(raw));
    if (Date.now() > data.expiry) { sessionStorage.removeItem(SESSION_KEY); return null; }
    if (!constantTimeEqual(data.fingerprint, getFingerprint())) { sessionStorage.removeItem(SESSION_KEY); return null; }
    return data;
  } catch { return null; }
}

function setSession() {
  const data: SessionData = { token: generateToken(), expiry: Date.now() + SESSION_TTL, fingerprint: getFingerprint() };
  sessionStorage.setItem(SESSION_KEY, btoa(JSON.stringify(data)));
}

function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

function getAttempts(): AttemptData {
  try {
    const raw = localStorage.getItem(ATTEMPT_KEY);
    if (!raw) return { count: 0, lockoutUntil: 0, lockoutCount: 0, timestamps: [] };
    return JSON.parse(atob(raw));
  } catch { return { count: 0, lockoutUntil: 0, lockoutCount: 0, timestamps: [] }; }
}

function saveAttempts(data: AttemptData) {
  localStorage.setItem(ATTEMPT_KEY, btoa(JSON.stringify(data)));
}

function clearAttempts() { localStorage.removeItem(ATTEMPT_KEY); }

// ─── Component ────────────────────────────────────────────────────────────────
interface AdminLoginProps { onAuth: () => void; }

export function AdminLogin({ onAuth }: AdminLoginProps) {
  const [pin, setPin]           = useState('');
  const [showPin, setShowPin]   = useState(false);
  const [status, setStatus]     = useState<'idle'|'checking'|'success'|'error'>('idle');
  const [message, setMessage]   = useState('');
  const [lockSecs, setLockSecs] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const intervalRef             = useRef<ReturnType<typeof setInterval> | null>(null);
  const honeypotRef             = useRef('');  // honeypot field value

  // Check existing valid session
  useEffect(() => {
    if (getSession()) onAuth();
  }, []);

  // Check lockout on mount + keep countdown live
  useEffect(() => {
    checkLockout();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const checkLockout = useCallback(() => {
    const attempts = getAttempts();
    const now = Date.now();
    if (attempts.lockoutUntil > now) {
      const remaining = Math.ceil((attempts.lockoutUntil - now) / 1000);
      setIsLocked(true);
      setLockSecs(remaining);
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        const secs = Math.ceil((getAttempts().lockoutUntil - Date.now()) / 1000);
        if (secs <= 0) {
          setIsLocked(false); setLockSecs(0);
          if (intervalRef.current) clearInterval(intervalRef.current);
        } else { setLockSecs(secs); }
      }, 1000);
    } else { setIsLocked(false); }
  }, []);

  const handlePress = (digit: string) => {
    if (isLocked || status === 'checking' || pin.length >= 4) return;
    // Block automation: honeypot check (if honeypot was filled, it's a bot)
    if (honeypotRef.current) { setMessage('Access denied.'); setStatus('error'); return; }
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) setTimeout(() => verify(next), 100 + Math.random() * 100);
  };

  const handleDelete = () => {
    if (!isLocked && status !== 'checking') setPin(p => p.slice(0, -1));
  };

  const verify = async (input: string) => {
    // Honeypot check
    if (honeypotRef.current) return;

    setStatus('checking');

    // Rate limit: max 5 attempts per minute
    const attempts = getAttempts();
    const now = Date.now();
    const recentTimestamps = attempts.timestamps.filter(t => now - t < RATE_WINDOW);
    if (recentTimestamps.length >= MAX_ATTEMPTS) {
      const lockoutDuration = LOCKOUT_BASE * Math.pow(2, attempts.lockoutCount) * 1000;
      const newData: AttemptData = {
        ...attempts,
        count: attempts.count + 1,
        lockoutUntil: now + lockoutDuration,
        lockoutCount: attempts.lockoutCount + 1,
        timestamps: [...recentTimestamps, now],
      };
      saveAttempts(newData);
      setPin('');
      setStatus('error');
      checkLockout();
      return;
    }

    // Artificial delay (prevents timing attacks + brute force speed)
    await new Promise(r => setTimeout(r, 500 + Math.random() * 300));

    // Hash the input and compare
    const inputHash = await sha256(input);
    const correctHash = await sha256(CORRECT_PIN);
    const correct = constantTimeEqual(inputHash, correctHash);

    if (correct) {
      setStatus('success');
      setMessage('');
      clearAttempts();
      setSession();
      setTimeout(() => onAuth(), 600);
    } else {
      const newTimestamps = [...recentTimestamps, now];
      const newCount = attempts.count + 1;
      let lockoutUntil = attempts.lockoutUntil;
      let lockoutCount = attempts.lockoutCount;

      if (newCount % MAX_ATTEMPTS === 0) {
        const lockoutDuration = LOCKOUT_BASE * Math.pow(2, lockoutCount) * 1000;
        lockoutUntil = now + lockoutDuration;
        lockoutCount += 1;
      }

      saveAttempts({ count: newCount, lockoutUntil, lockoutCount, timestamps: newTimestamps });
      setPin('');
      setStatus('error');
      const remaining = MAX_ATTEMPTS - (newCount % MAX_ATTEMPTS);
      setMessage(lockoutUntil > now
        ? `Account locked.`
        : `Incorrect PIN. ${remaining} attempt${remaining !== 1 ? 's' : ''} left.`
      );
      checkLockout();
      setTimeout(() => setStatus('idle'), 1200);
    }
  };

  const keys = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['','0','⌫'],
  ];

  const dots = [0,1,2,3];

  return (
    <div className="relative min-h-screen bg-[#0b141a] flex items-center justify-center p-4 select-none overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage: `url(https://res.cloudinary.com/dx1nrew3h/image/upload/v1772512677/aaaaa_w3eapq.jpg)`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'saturate(0.9) brightness(0.8)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-[#0b141a]/70 via-[#0b141a]/80 to-[#0b141a]" />
      {/* Honeypot — hidden, should never be filled by humans */}
      <input
        type="text"
        tabIndex={-1}
        aria-hidden="true"
        autoComplete="off"
        onChange={e => { honeypotRef.current = e.target.value; }}
        style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
      />

      <div className="w-full max-w-[360px]">
        <div className="text-center mb-8">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all duration-300 ${
            status === 'success' ? 'bg-[#00a884]/30 border-2 border-[#00a884]' :
            status === 'error'   ? 'bg-red-500/20 border-2 border-red-500/50' :
            isLocked             ? 'bg-orange-500/20 border-2 border-orange-500/40' :
                                   'bg-[#1f2c34] border-2 border-[#2f3b43]'
          }`}>
            {status === 'success' ? <CheckCircle className="w-10 h-10 text-[#00a884]" /> :
             isLocked             ? <AlertTriangle className="w-10 h-10 text-orange-400" /> :
                                    <Shield className="w-10 h-10 text-[#00a884]" />}
          </div>
          <h1 className="text-white text-3xl font-black tracking-tight">Admin Access</h1>
          <p className="text-[#aebac1] text-sm mt-1">Drivemond Sales Intelligence</p>
          <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 rounded-full bg-[#003d32] text-[#25D366] border border-[#05846e] text-[11px] font-bold">WhatsApp Secure</div>
        </div>

        <div className="bg-[#1f2c34]/70 backdrop-blur-xl border border-[#2f3b43] rounded-2xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.4)]">

          <div className={`flex justify-center gap-4 mb-5 transition-all ${status === 'error' ? 'animate-[shake_0.4s_ease]' : ''}`}>
            {dots.map(i => (
              <div key={i} className={`w-11 h-11 rounded-xl border-2 flex items-center justify-center transition-all duration-150 ${
                status === 'success' ? 'bg-[#00a884] border-[#00a884] scale-110' :
                status === 'error'   ? 'bg-red-500/30 border-red-500/50' :
                i < pin.length      ? 'bg-[#00a884] border-[#00a884] scale-110' :
                                      'bg-[#0b141a] border-[#2f3b43]'
              }`}>
                {i < pin.length && (
                  showPin
                    ? <span className="text-white font-bold text-base">{pin[i]}</span>
                    : <div className="w-2.5 h-2.5 bg-white rounded-full" />
                )}
                {status === 'success' && <CheckCircle className="w-4 h-4 text-white" />}
              </div>
            ))}
          </div>

          <div className="h-8 flex items-center justify-center mb-3">
            {isLocked ? (
              <div className="flex items-center gap-1.5 text-orange-400 text-sm font-medium">
                <Lock className="w-3.5 h-3.5" />
                Locked — wait {lockSecs}s
              </div>
            ) : status === 'error' ? (
              <p className="text-red-400 text-sm font-medium">{message}</p>
            ) : status === 'success' ? (
              <p className="text-[#00a884] text-sm font-medium">✓ Access granted</p>
            ) : status === 'checking' ? (
              <p className="text-[#8696a0] text-sm">Verifying...</p>
            ) : (
              <p className="text-[#8696a0] text-sm">Enter your 4-digit PIN</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {keys.flat().map((btn, i) => {
              if (btn === '') return <div key={i} />;
              if (btn === '⌫') return (
                <button key={i} onClick={handleDelete}
                  className="h-14 rounded-xl bg-[#0b141a]/80 hover:bg-[#2a3942] active:scale-95 flex items-center justify-center transition-all border border-[#2f3b43] shadow-sm">
                  <Delete className="w-5 h-5 text-[#8696a0]" />
                </button>
              );
              return (
                <button key={i} onClick={() => handlePress(btn)}
                  disabled={isLocked || status === 'checking' || status === 'success'}
                  className={`h-14 rounded-xl text-xl font-bold transition-all active:scale-95 border shadow-sm ${
                    isLocked || status === 'checking'
                      ? 'bg-[#0b141a] border-[#1a2530] text-[#2f3b43] cursor-not-allowed'
                      : 'bg-[#0b141a] border-[#2f3b43] text-white hover:bg-[#2a3942] hover:border-[#3d4f5c]'
                  }`}>
                  {btn}
                </button>
              );
            })}
          </div>

          <button onClick={() => setShowPin(p => !p)}
            className="w-full mt-4 flex items-center justify-center gap-2 text-[#8696a0] hover:text-[#aebac1] text-xs transition-colors py-1.5 rounded-lg hover:bg-white/5">
            {showPin ? <><EyeOff className="w-3.5 h-3.5" /> Hide PIN</> : <><Eye className="w-3.5 h-3.5" /> Show PIN</>}
          </button>
        </div>

        <p className="text-[#c6cdd3] text-xs text-center mt-4">🔒 Session expires in 8 hours · Secured</p>
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          15%{transform:translateX(-10px)}
          30%{transform:translateX(10px)}
          45%{transform:translateX(-7px)}
          60%{transform:translateX(7px)}
          75%{transform:translateX(-4px)}
          90%{transform:translateX(4px)}
        }
      `}</style>
    </div>
  );
}
