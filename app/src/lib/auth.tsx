import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

// Only these roles (read from the shared user_roles table) may use the
// Registrar System. Everyone else is signed out at the login screen.
const REGISTRAR_ROLES = ['registrar', 'admin'];

interface AuthValue {
  session: Session | null;
  loading: boolean;          // initial session check
  role: string | null;
  roleLoading: boolean;      // role lookup in flight
  allowed: boolean;          // signed in AND role is registrar/admin
  email: string | null;
  ready: boolean;            // Supabase configured
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [roleResolvedFor, setRoleResolvedFor] = useState<string | null | undefined>(undefined);

  const email = session?.user?.email ?? null;
  const roleLoading = roleResolvedFor !== email;

  // Track the Supabase session.
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Resolve the signed-in user's role whenever the email changes.
  useEffect(() => {
    if (!supabase || !email) {
      setRole(null);
      setRoleResolvedFor(email);
      return;
    }
    let cancelled = false;
    supabase
      .from('user_roles')
      .select('role')
      .eq('user_email', email)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setRole((data?.role as string | undefined) ?? null);
        setRoleResolvedFor(email);
      });
    return () => {
      cancelled = true;
    };
  }, [email]);

  const signIn = async (em: string, password: string) => {
    if (!supabase) return { error: 'Supabase is not configured.' };
    const { error } = await supabase.auth.signInWithPassword({ email: em, password });
    return error ? { error: error.message } : {};
  };

  const signOut = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
    }
    setSession(null);
    setRole(null);
  };

  const value: AuthValue = {
    session,
    loading,
    role,
    roleLoading,
    allowed: !!role && REGISTRAR_ROLES.includes(role),
    email,
    ready: !!supabase,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

function FullPageSpinner() {
  return (
    <div className="min-h-screen grid place-items-center bg-app">
      <div className="w-9 h-9 border-2 border-border border-t-nps-red rounded-full animate-spin" />
    </div>
  );
}

// Gate the app behind a signed-in registrar/admin. Anyone else is bounced to
// /login (which shows an "access denied" state for a wrong-role session).
export function RequireRegistrar() {
  const { session, loading, allowed, roleLoading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!session) return <Navigate to="/login" replace />;
  if (roleLoading) return <FullPageSpinner />;
  if (!allowed) return <Navigate to="/login" replace />;
  return <Outlet />;
}
