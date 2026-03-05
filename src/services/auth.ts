import { supabase, isSupabaseConfigured } from './supabase';
import { fallbackAuth } from './fallbackAuth';

export type Role = 'admin' | 'company' | 'user' | null;

export async function getSession() {
  if (!isSupabaseConfigured()) {
    const session = fallbackAuth.getSession();
    return session ? { user: { email: session.email } } : null;
  }
  
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  
  const fallbackSession = fallbackAuth.getSession();
  if (fallbackSession) {
    return { user: { email: fallbackSession.email, id: fallbackSession.email } };
  }
  
  return null;
}

export async function signInWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured()) {
    const result = await fallbackAuth.signIn(email, password);
    return { email: result.email };
  }
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.log('Supabase login failed:', error.message);
      console.log('Trying fallback demo accounts...');
      const fallbackResult = await fallbackAuth.signIn(email, password);
      return { email: fallbackResult.email };
    }
    console.log('✅ Supabase login successful');
    return data.user;
  } catch (err: any) {
    console.log('Supabase error:', err.message);
    console.log('Trying fallback demo accounts...');
    const fallbackResult = await fallbackAuth.signIn(email, password);
    return { email: fallbackResult.email };
  }
}

export async function signOut() {
  fallbackAuth.signOut();
  if (isSupabaseConfigured()) {
    await supabase.auth.signOut();
  }
}

export async function getCurrentUserRole(): Promise<Role> {
  if (!isSupabaseConfigured()) {
    return fallbackAuth.getCurrentRole();
  }
  
  const session = await getSession();
  if (!session) {
    const fallbackSession = fallbackAuth.getSession();
    if (fallbackSession) {
      console.log('Using fallback session role:', fallbackSession.role);
      return fallbackSession.role;
    }
    return null;
  }
  
  if (!session.user?.id) {
    const fallbackSession = fallbackAuth.getSession();
    if (fallbackSession) {
      console.log('Using fallback session role:', fallbackSession.role);
      return fallbackSession.role;
    }
    return null;
  }
  
  console.log('✅ Using Supabase session for user:', session.user.email);
  
  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  if (session.user?.email === adminEmail) {
    console.log('User is admin by email match');
    return 'admin';
  }
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle();
    
    if (error) {
      console.warn('Profiles table query error, defaulting to admin role');
      return 'admin';
    }
    
    const role = (data?.role as Role) ?? 'admin';
    console.log('User role from profiles table:', role);
    return role;
  } catch (err) {
    console.warn('Error fetching role, defaulting to admin:', err);
    return 'admin';
  }
}
