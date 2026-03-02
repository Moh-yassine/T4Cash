import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types/database';

/** Parse le hash URL pour extraire les tokens de récupération (type=recovery) */
function parseRecoveryHash(): { access_token?: string; refresh_token?: string } | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const hash = window.location.hash?.replace(/^#/, '');
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  if (params.get('type') !== 'recovery') return null;
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isRecoverySession: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, username?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string, redirectTo?: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecoverySession, setIsRecoverySession] = useState(false);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    async function initAuth() {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const recovery = parseRecoveryHash();
        if (recovery) {
          try {
            const { data, error } = await supabase.auth.setSession({
              access_token: recovery.access_token!,
              refresh_token: recovery.refresh_token!,
            });
            if (!error && data.session) {
              setIsRecoverySession(true);
              setSession(data.session);
              setUser(data.session.user);
              fetchProfile(data.session.user.id);
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
          } catch {
            // ignore
          }
          setLoading(false);
          return;
        }
      }

      supabase.auth
        .getSession()
        .then(({ data: { session: s } }) => {
          setSession(s);
          setUser(s?.user ?? null);
          if (s?.user) fetchProfile(s.user.id);
          setLoading(false);
        })
        .catch(async (err) => {
          const msg = err?.message ?? String(err);
          if (msg.includes('Refresh Token') || msg.includes('refresh_token')) {
            await supabase.auth.signOut();
          }
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
        });
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoverySession(true);
      }
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchProfile(s.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, username?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    return { error: error ?? null };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsRecoverySession(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string, redirectTo?: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectTo ?? undefined,
    });
    return { error: error ?? null };
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) setIsRecoverySession(false);
    return { error: error ?? null };
  }, []);

  const refreshProfile = useCallback(() => {
    if (user) return fetchProfile(user.id);
    return Promise.resolve();
  }, [user, fetchProfile]);

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, isRecoverySession, signIn, signUp, signOut, refreshProfile, resetPassword, updatePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
