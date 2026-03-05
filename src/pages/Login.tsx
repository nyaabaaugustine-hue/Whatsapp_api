import { useEffect, useState } from 'react';
import { isConfigured } from '../services/supabase';
import { signInWithEmail, getCurrentUserRole, Role, signOut } from '../services/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Shield, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Car, LayoutDashboard, Package, LogOut, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [busy, setBusy] = useState(false);
  const configured = isConfigured();

  useEffect(() => {
    setRole(null);
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

  const goAdmin = () => { window.location.hash = '#admin'; };
  const goInventory = () => { window.location.hash = '#inventory'; };
  const goHome = () => { window.location.hash = ''; };

  if (!configured) {
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
              Supabase is not configured. Please set the following environment variables:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-[#0b141a] border border-[#2f3b43] rounded-lg p-3 font-mono text-xs text-[#aebac1]">
              <div>VITE_SUPABASE_URL</div>
              <div>VITE_SUPABASE_ANON_KEY</div>
            </div>
            <Button onClick={goHome} variant="outline" className="w-full">
              <ArrowRight className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (role) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0b141a] via-[#0f172a] to-[#1a1f2e] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-[url('https://res.cloudinary.com/dwsl2ktt2/image/upload/v1772594297/y10n_fpni_211014_d9esey.jpg')] opacity-5 bg-cover bg-center" />
        <Card className="w-full max-w-md relative z-10 border-[#2f3b43] bg-[#111b21]/95 backdrop-blur-xl shadow-2xl">
          <CardHeader className="text-center space-y-3 pb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00a884]/20 to-[#25D366]/20 border-2 border-[#00a884]/50 flex items-center justify-center mx-auto animate-pulse">
              <CheckCircle2 className="w-8 h-8 text-[#00a884]" />
            </div>
            <CardTitle className="text-2xl text-[#e9edef]">Welcome Back!</CardTitle>
            <CardDescription className="text-[#8696a0]">
              Signed in as <span className="text-[#00a884] font-semibold">{role}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3">
              {role === 'admin' && (
                <Button onClick={goAdmin} size="lg" className="w-full justify-start h-14 text-base">
                  <LayoutDashboard className="w-5 h-5 mr-3" />
                  <div className="flex-1 text-left">
                    <div className="font-semibold">Admin Dashboard</div>
                    <div className="text-xs opacity-80">Manage system settings</div>
                  </div>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              {(role === 'admin' || role === 'company') && (
                <Button onClick={goInventory} variant="secondary" size="lg" className="w-full justify-start h-14 text-base">
                  <Package className="w-5 h-5 mr-3" />
                  <div className="flex-1 text-left">
                    <div className="font-semibold">Inventory</div>
                    <div className="text-xs opacity-80">Manage car listings</div>
                  </div>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              <Button onClick={goHome} variant="outline" size="lg" className="w-full justify-start h-14 text-base">
                <Car className="w-5 h-5 mr-3" />
                <div className="flex-1 text-left">
                  <div className="font-semibold">Browse Cars</div>
                  <div className="text-xs opacity-80">View available inventory</div>
                </div>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <div className="pt-4 border-t border-[#2f3b43]">
              <button 
                onClick={() => { signOut(); setRole(null); }} 
                className="w-full flex items-center justify-center gap-2 text-[#8696a0] hover:text-[#e9edef] text-sm py-2 rounded-lg hover:bg-[#2a3942] transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
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
            <CardTitle className="text-2xl text-[#e9edef] mb-2">Welcome Back</CardTitle>
            <CardDescription className="text-[#8696a0]">
              Sign in to access your dashboard
            </CardDescription>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#003d32] text-[#25D366] border border-[#05846e] text-xs font-semibold">
            <div className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse" />
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
            <p className="text-center text-xs text-[#8696a0]">
              Accounts are provisioned manually. Contact your administrator for access.
            </p>
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
