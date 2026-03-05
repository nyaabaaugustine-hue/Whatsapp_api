interface User {
  email: string;
  password: string;
  role: 'admin' | 'company' | 'user';
}

const DEMO_USERS: User[] = [
  {
    email: 'admin@demo.com',
    password: 'admin123',
    role: 'admin'
  },
  {
    email: 'company@demo.com',
    password: 'company123',
    role: 'company'
  },
  {
    email: 'user@demo.com',
    password: 'user123',
    role: 'user'
  }
];

const SESSION_KEY = '__fallback_session__';
const SESSION_DURATION = 8 * 60 * 60 * 1000;

interface Session {
  email: string;
  role: 'admin' | 'company' | 'user';
  expiresAt: number;
}

class FallbackAuthService {
  async signIn(email: string, password: string): Promise<{ email: string; role: string }> {
    const user = DEMO_USERS.find(u => u.email === email && u.password === password);
    
    if (!user) {
      throw new Error('Invalid login credentials');
    }

    const session: Session = {
      email: user.email,
      role: user.role,
      expiresAt: Date.now() + SESSION_DURATION
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    
    return { email: user.email, role: user.role };
  }

  getSession(): Session | null {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (!stored) return null;

      const session: Session = JSON.parse(stored);
      
      if (Date.now() > session.expiresAt) {
        this.signOut();
        return null;
      }

      return session;
    } catch {
      return null;
    }
  }

  getCurrentRole(): 'admin' | 'company' | 'user' | null {
    const session = this.getSession();
    return session?.role || null;
  }

  signOut() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  isAuthenticated(): boolean {
    return this.getSession() !== null;
  }
}

export const fallbackAuth = new FallbackAuthService();