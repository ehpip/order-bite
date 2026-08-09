'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

export const ADMIN_EMAIL = 'muhammad.afif5069@gmail.com';

export interface AuthUser {
  id?: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  hostIdentifier: string;
  isAdmin: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginAsAdmin: () => void;
  loginWithEmail: (email: string, name?: string) => void;
  logout: () => Promise<void>;
  isHostOwner: (session: { host_id?: string } | null | undefined) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  hostIdentifier: '',
  isAdmin: false,
  isLoading: true,
  loginWithGoogle: async () => {},
  loginAsAdmin: () => {},
  loginWithEmail: () => {},
  logout: async () => {},
  isHostOwner: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [deviceHostId, setDeviceHostId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = Boolean(user && user.email.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim());

  useEffect(() => {
    async function initAuth() {
      // Initialize persistent device host ID for browser/device context
      if (typeof window !== 'undefined') {
        let storedDeviceId = localStorage.getItem('orderbite_device_host_id');
        if (!storedDeviceId) {
          storedDeviceId = `device-host-${Math.random().toString(36).substring(2, 10)}-${Date.now()}`;
          localStorage.setItem('orderbite_device_host_id', storedDeviceId);
        }
        setDeviceHostId(storedDeviceId);
      }

      // 1. Check local storage
      const storedEmail = typeof window !== 'undefined' ? localStorage.getItem('orderbite_user_email') : null;
      const storedName = typeof window !== 'undefined' ? localStorage.getItem('orderbite_user_name') : null;
      const storedAvatar = typeof window !== 'undefined' ? localStorage.getItem('orderbite_user_avatar') : null;

      if (storedEmail) {
        setUser({
          email: storedEmail,
          name: storedName || storedEmail.split('@')[0],
          avatarUrl: storedAvatar || undefined,
        });
      }

      // 2. Check Supabase session if configured
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.email) {
            const sbUser: AuthUser = {
              email: session.user.email,
              name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
              avatarUrl: session.user.user_metadata?.avatar_url,
            };
            setUser(sbUser);
            if (typeof window !== 'undefined') {
              localStorage.setItem('orderbite_user_email', sbUser.email);
              if (sbUser.name) localStorage.setItem('orderbite_user_name', sbUser.name);
              if (sbUser.avatarUrl) localStorage.setItem('orderbite_user_avatar', sbUser.avatarUrl);
            }
          }

          const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user?.email) {
              const sbUser: AuthUser = {
                email: session.user.email,
                name: session.user.user_metadata?.full_name || session.user.email.split('@')[0],
                avatarUrl: session.user.user_metadata?.avatar_url,
              };
              setUser(sbUser);
              if (typeof window !== 'undefined') {
                localStorage.setItem('orderbite_user_email', sbUser.email);
                if (sbUser.name) localStorage.setItem('orderbite_user_name', sbUser.name);
                if (sbUser.avatarUrl) localStorage.setItem('orderbite_user_avatar', sbUser.avatarUrl);
              }
            } else if (_event === 'SIGNED_OUT') {
              setUser(null);
              if (typeof window !== 'undefined') {
                localStorage.removeItem('orderbite_user_email');
                localStorage.removeItem('orderbite_user_name');
                localStorage.removeItem('orderbite_user_avatar');
              }
            }
          });

          return () => subscription.unsubscribe();
        } catch (e) {
          console.warn('Supabase auth session check warning:', e);
        }
      }

      setIsLoading(false);
    }

    initAuth().finally(() => setIsLoading(false));
  }, []);

  const loginWithGoogle = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${origin}/dashboard`,
          },
        });
        if (error) {
          console.error('Supabase Google OAuth error:', error.message);
          // Fallback to local admin login if OAuth error occurs
          loginWithEmail(ADMIN_EMAIL, 'Muhammad Afif (Admin)');
        }
        return;
      } catch (err) {
        console.error('Supabase auth error:', err);
      }
    }
    // If Supabase OAuth client is not configured, sign in as Google Admin directly
    loginWithEmail(ADMIN_EMAIL, 'Muhammad Afif (Admin)');
  };

  const loginAsAdmin = () => {
    loginWithEmail(ADMIN_EMAIL, 'Muhammad Afif (Admin)');
  };

  const loginWithEmail = (email: string, name?: string) => {
    const trimmed = email.trim();
    if (!trimmed) return;
    const authUser: AuthUser = {
      email: trimmed,
      name: name || trimmed.split('@')[0],
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(trimmed)}`,
    };
    setUser(authUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('orderbite_user_email', authUser.email);
      if (authUser.name) localStorage.setItem('orderbite_user_name', authUser.name);
      if (authUser.avatarUrl) localStorage.setItem('orderbite_user_avatar', authUser.avatarUrl);
    }
  };

  const logout = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Sign out error:', e);
      }
    }
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('orderbite_user_email');
      localStorage.removeItem('orderbite_user_name');
      localStorage.removeItem('orderbite_user_avatar');
    }
  };

  const hostIdentifier = user?.email || user?.id || deviceHostId;

  const isHostOwner = (session: { host_id?: string } | null | undefined): boolean => {
    if (!session || !session.host_id || !hostIdentifier) return false;
    return session.host_id === hostIdentifier;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        hostIdentifier,
        isAdmin,
        isLoading,
        loginWithGoogle,
        loginAsAdmin,
        loginWithEmail,
        logout,
        isHostOwner,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
