import { useEffect, useState } from 'react';
import { getSession, getCurrentUserRole, Role, signOut, signInWithEmail } from '../services/auth';
import { isConfigured } from '../services/supabase';
import { Shield, Eye, EyeOff, AlertCircle, Loader2, ArrowRight, Lock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';

export function AuthGate({ required, children }: { required: Role | Role[]; children: any }) {
  const [role, setRole] = useState<Role>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const needs = Array.isArray(required) ? required : [required];

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!isConfigured()) {
          if (alive) { setRole(null); setLoading(false); }
          return;
        }
        const s = await getSession();
        if (!s) {
          if (alive) setRole(null);
          return;
        }
        const r = await getCurrentUserRole();
        if (alive) setRole(r);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const doLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    try {
      setBusy(true);
      setError(null);
      await signInWithEmail(email.trim(), password);
      const r = await getCurrentUserRole();
      setRole(r);
    } catch (e: any) {
      setError(e?.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setBusy(false);
    }
  };

  const allowed = role && needs.includes(role);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0b141a] via-[#0f172a] to-[#1a1f2e] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#00a884] animate-spin" />
          <p className="text-[#8696a0] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!allowed) {
    if (!isConfigured()) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-[#0b141a] via-[#0f172a] to-[#1a1f2e] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[url('https://res.cloudinary.com/dwsl2ktt2/image/upload/v1772594297/y10n_fpni_211014_d9esey.jpg')] opacity-5 bg-cover bg-center" />
          <Card className="w-full max-w-md relative z-10 border-[#2f3b43] bg-[#111b21]/95 backdrop-blur-xl shadow-2xl">
            <CardHeader className="text-center space-y-3 pb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border-2 border-orange-500/30 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-orange-400" />
              </div>
              <CardTitle className="text-2xl text-[#e9edef]">Configuration Required</CardTitle>
              <CardDescription className="text-[#8696a0]">
                Admin/company login is disabled because Supabase is not configured.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-[#0b141a] border border-[#2f3b43] rounded-lg p-3 font-mono text-xs text-[#aebac1]">
                <div>VITE_SUPABASE_URL</div>
                <div>VITE_SUPABASE_ANON_KEY</div>
              </div>
              <p className="text-center text-xs text-[#8696a0]">
                Set these environment variables to enable authentication.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0b141a] via-[#0f172a] to-[#1a1f2e] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('https://res.cloudinary.com/dwsl2ktt2/image/upload/v1772594297/y10n_fpni_211014_d9esey.jpg')] opacity-5 bg-cover bg-center" />
        
        <Card className="w-full max-w-md relative z-10 border-[#2f3b43] bg-[#111b21]/95 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center space-y-3 pb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00a884]/20 to-[#25D366]/20 border-2 border-[#00a884]/50 flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-[#00a884]" />
            </div>
            <div>
              <CardTitle className="text-2xl text-[#e9edef] mb-2">Sign in</CardTitle>
              <CardDescription className="text-[#8696a0]">
                Access restricted
              </CardDescription>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#003d32] text-[#25D366] border border-[#05846e] text-xs font-semibold">
              <Lock className="w-3 h-3" />
              Secure Login
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={doLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#e9edef] text-sm font-medium">
                  Email Address
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="you@example.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  className="h-11 bg-[#0b141a] border-[#2f3b43] text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#00a884] focus:ring-[#00a884]"
                  disabled={busy}
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#e9edef] text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    className="h-11 bg-[#0b141a] border-[#2f3b43] text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#00a884] focus:ring-[#00a884] pr-10"
                    disabled={busy}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8696a0] hover:text-[#e9edef] transition-colors"
                    disabled={busy}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="bg-[#0b141a] border border-[#2f3b43] rounded-lg p-3 space-y-2">
                <p className="text-[#8696a0] text-xs font-semibold">Demo Accounts:</p>
                <div className="space-y-1 font-mono text-xs">
                  <div className="flex justify-between text-[#aebac1]">
                    <span>admin@demo.com</span>
                    <span className="text-[#00a884]">admin123</span>
                  </div>
                  <div className="flex justify-between text-[#aebac1]">
                    <span>company@demo.com</span>
                    <span className="text-[#00a884]">company123</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@demo.com');
                    setPassword('admin123');
                  }}
                  className="text-xs text-[#00a884] hover:underline"
                >
                  Use admin demo account
                </button>
              </div>

              <Button 
                type="submit"
                disabled={busy || !email || !password} 
                size="lg"
                className="w-full h-11 text-base font-semibold"
              >
                {busy ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-[#2f3b43]">
              <button 
                onClick={() => signOut()} 
                className="w-full text-center text-xs text-[#8696a0] hover:text-[#e9edef] transition-colors"
              >
                Sign out
              </button>
            </div>
          </CardContent>
        </Card>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
          <p className="text-[#8696a0] text-xs">
            🔒 Secured by Supabase Authentication
          </p>
        </div>
      </div>
    );
  }

  return children;
}
