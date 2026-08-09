'use client';

import React, { useState } from 'react';
import { useAuth, ADMIN_EMAIL } from '@/lib/auth-context';
import { X, ShieldCheck, UserCheck, AlertCircle, Sparkles, ExternalLink, Loader2 } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, loginWithEmail, loginAsAdmin, loginWithGoogle, user, logout } = useAuth();
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (!showAuthModal) return null;

  const handleGoogleOAuth = async () => {
    try {
      setIsSigningInGoogle(true);
      setAuthError(null);
      await loginWithGoogle();
    } catch (err: any) {
      setAuthError(err.message || 'Failed to initialize Google Sign In');
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleCustomLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) return;
    loginWithEmail(emailInput, nameInput);
    setShowAuthModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 p-6 text-white relative">
          <button
            onClick={() => setShowAuthModal(false)}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Supabase Google OAuth & Admin Access
          </div>
          <h2 className="text-xl font-bold tracking-tight">Sign in with Google</h2>
          <p className="text-xs text-orange-100 mt-1">
            Authenticate via Supabase to manage food stores database or order food.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Admin Email Highlight Banner */}
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <p className="font-bold text-slate-900">Admin Permission Policy</p>
              <p className="leading-relaxed">
                Only <span className="font-mono font-semibold text-orange-700 bg-amber-100/80 px-1.5 py-0.5 rounded">{ADMIN_EMAIL}</span> is assigned administrator permissions to manage store and menu databases.
              </p>
            </div>
          </div>

          {authError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Real Supabase Google OAuth Button */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
              1-Click Supabase Google OAuth
            </label>
            <button
              onClick={handleGoogleOAuth}
              disabled={isSigningInGoogle}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl bg-white border-2 border-slate-200 hover:border-orange-500 hover:bg-orange-50/30 text-slate-900 font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isSigningInGoogle ? (
                <Loader2 className="w-5 h-5 animate-spin text-orange-600" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              )}
              <span>Redirect to Google via Supabase OAuth</span>
            </button>
          </div>

          {/* Direct Admin Login Button */}
          <div className="space-y-2">
            <button
              onClick={loginAsAdmin}
              className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-orange-200 bg-orange-50/60 hover:bg-orange-100 transition-all text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                  A
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    Quick Admin Session
                    <span className="bg-orange-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase">Admin</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono">
                    {ADMIN_EMAIL}
                  </div>
                </div>
              </div>
              <UserCheck className="w-4 h-4 text-orange-600 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-wider font-semibold">
              <span className="bg-white px-2.5 text-slate-400">or sign in with custom Google email</span>
            </div>
          </div>

          {/* Custom Google Email Form */}
          <form onSubmit={handleCustomLogin} className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">
                Google Email Address
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="your.email@gmail.com"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-medium"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              Sign In with Email
            </button>
          </form>

          {/* Current Status Footer */}
          {user && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Signed in as <strong className="text-slate-800 font-mono">{user.email}</strong>
              </span>
              <button
                type="button"
                onClick={() => logout()}
                className="text-red-600 hover:text-red-700 font-semibold text-xs cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

