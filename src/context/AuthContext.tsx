import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { Profile, UserRole } from '@/lib/types';

const INACTIVITY_LIMIT_MS = 6 * 60 * 60 * 1000;
const LAST_ACTIVE_KEY = 'last_active_at';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  profileLoaded: boolean;
  passwordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, metadata: Record<string, string>) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const fetchProfile = async (uid: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (error) {
      console.error('Failed to load user profile', error);
    }
    setProfile(data as Profile | null);
    setProfileLoaded(true);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        fetchProfile(data.session.user.id).finally(() => setLoading(false));
      } else {
        setProfileLoaded(true);
        setLoading(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      (async () => {
        if (event === 'PASSWORD_RECOVERY') {
          setPasswordRecovery(true);
          setSession(newSession);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setProfile(null);
          setProfileLoaded(false);
        } else {
          setSession(newSession);
          if (newSession?.user) {
            setProfileLoaded(false);
            await fetchProfile(newSession.user.id);
          } else {
            setProfile(null);
            setProfileLoaded(true);
          }
        }
      })();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Auto-logout after 6 hours of inactivity
  useEffect(() => {
    if (!session) return;

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];

    const updateLastActive = () => {
      localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
    };

    const checkInactivity = () => {
      const last = Number(localStorage.getItem(LAST_ACTIVE_KEY) ?? Date.now());
      if (Date.now() - last > INACTIVITY_LIMIT_MS) {
        signOut();
      }
    };

    // Check on mount and every minute
    checkInactivity();
    const interval = setInterval(checkInactivity, 60_000);

    // Track user activity
    activityEvents.forEach((evt) => window.addEventListener(evt, updateLastActive, { passive: true }));
    updateLastActive();

    return () => {
      clearInterval(interval);
      activityEvents.forEach((evt) => window.removeEventListener(evt, updateLastActive));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Network error' };
    }
  };

  const signUp = async (email: string, password: string, metadata: Record<string, string>) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: metadata } });
      return { error: error?.message ?? null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Network error' };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      return { error: error?.message ?? null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Network error' };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { error: error.message };
      setPasswordRecovery(false);
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Network error' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setProfileLoaded(false);
    setPasswordRecovery(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        profile,
        role: profile?.role ?? null,
        loading,
        profileLoaded,
        passwordRecovery,
        signIn,
        signUp,
        resetPassword,
        updatePassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
