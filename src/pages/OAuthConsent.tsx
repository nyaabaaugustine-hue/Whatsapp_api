import { useEffect, useMemo, useState } from 'react';
import { signInWithEmail, getSession } from '../services/auth';
import { isConfigured } from '../services/supabase';

export default function OAuthConsent() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!isConfigured()) { setLoading(false); return; }
      const s = await getSession();
      if (alive) { setLoggedIn(Boolean(s)); setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const approve = async () => {
    try {
      setError(null);
      const q = new URLSearchParams(params);
      q.set('decision', 'allow');
      const url = `${supabaseUrl}/auth/v1/oauth/authorize?${q.toString()}`;
      const res = await fetch(url, { method: 'POST', credentials: 'include' });
      if (res.redirected) { window.location.href = res.url; return; }
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await res.json();
        if ((data as any)?.redirect_to) { window.location.href = (data as any).redirect_to; return; }
      }
      if (!res.ok) throw new Error('Authorization failed');
    } catch (e: any) {
      setError(e?.message || 'Failed to authorize');
    }
  };

  const deny = () => {
    const redirect = params.get('redirect_uri') || '/';
    const state = params.get('state') || '';
    const sep = redirect.includes('?') ? '&' : '?';
    window.location.href = `${redirect}${sep}error=access_denied&state=${encodeURIComponent(state)}`;
  };

  const doLogin = async () => {
    try {
      setError(null);
      await signInWithEmail(email.trim(), password);
      setLoggedIn(true);
    } catch (e: any) {
      setError(e?.message || 'Sign in failed');
    }
  };

  if (!isConfigured()) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="bg-[#111b21] border border-[#2f3b43] rounded-2xl p-6 w-full max-w-sm">
          <div className="text-[#e9edef] text-lg font-bold mb-2">OAuth Consent</div>
          <div className="text-[#8696a0] text-xs">Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-[#e9edef]">Loading…</div>;
  }

  const clientId = params.get('client_id') || 'Unknown App';
  const scope = params.get('scope') || '';

  if (!loggedIn) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="bg-[#111b21] border border-[#2f3b43] rounded-2xl p-6 w-full max-w-sm">
          <div className="text-[#e9edef] text-lg font-bold mb-2">Sign in to Continue</div>
          <div className="text-[#8696a0] text-xs mb-4">Grant access to {clientId}</div>
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#2a3942] border border-[#3d4f5c] rounded-lg px-3 py-2 text-[#e9edef] text-sm outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#2a3942] border border-[#3d4f5c] rounded-lg px-3 py-2 text-[#e9edef] text-sm outline-none"
            />
            {error && <div className="text-red-400 text-xs">{error}</div>}
            <button onClick={doLogin} className="w-full bg-[#00a884] hover:bg-[#008f72] text-white text-sm font-bold py-2 rounded-lg">Sign in</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <div className="bg-[#111b21] border border-[#2f3b43] rounded-2xl p-6 w-full max-w-md">
        <div className="text-[#e9edef] text-lg font-bold mb-1">Authorize Application</div>
        <div className="text-[#8696a0] text-sm mb-4">App: {clientId}</div>
        <div className="text-[#aebac1] text-xs mb-4">Requested scopes: {scope || 'none'}</div>
        {error && <div className="text-red-400 text-xs mb-3">{error}</div>}
        <div className="flex gap-2">
          <button onClick={approve} className="flex-1 bg-[#00a884] hover:bg-[#008f72] text-white text-sm font-bold py-2 rounded-lg">Approve</button>
          <button onClick={deny} className="flex-1 bg-[#2a3942] hover:bg-[#3d4f5c] text-[#e9edef] text-sm font-bold py-2 rounded-lg">Deny</button>
        </div>
      </div>
    </div>
  );
}

