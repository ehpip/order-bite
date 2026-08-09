'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Utensils, Store, PlusCircle, LayoutDashboard, ListOrdered, Menu, X, ShieldCheck, LogOut, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAdmin, loginWithGoogle, logout } = useAuth();

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/orders', label: 'Group Orders', icon: ListOrdered },
    { href: '/dashboard/stores', label: 'Food Stores', icon: Store },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-xs group-hover:bg-orange-700 transition-colors">
              <Utensils className="w-5.5 h-5.5" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight leading-none block">
                OrderBite
              </span>
              <span className="text-[10px] text-orange-600 font-semibold tracking-wider uppercase block">
                Group Food Order
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-orange-50 text-orange-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-orange-600' : 'text-slate-400'}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Actions & User Account */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/dashboard/orders/new"
              className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Create Group Order
            </Link>

            {user ? (
              <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name || user.email} className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">
                      {user.email[0].toUpperCase()}
                    </div>
                  )}
                  <div className="text-left">
                    <div className="text-xs font-bold text-slate-800 leading-none flex items-center gap-1">
                      {user.name || user.email.split('@')[0]}
                      {isAdmin && (
                        <span className="bg-orange-600 text-white text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider inline-flex items-center gap-0.5">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                      {user.email}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => logout()}
                  title="Sign Out"
                  className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => loginWithGoogle()}
                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-xs cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                Sign in with Google
              </button>
            )}
          </div>

          {/* Mobile hamburger toggle */}
          <div className="flex items-center gap-2 md:hidden">
            {!user && (
              <button
                onClick={() => loginWithGoogle()}
                className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1.5 rounded-lg cursor-pointer"
              >
                Login
              </button>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
          {user && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-3 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1">
                  {user.name || user.email}
                  {isAdmin && (
                    <span className="bg-orange-600 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase">
                      Admin
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">{user.email}</div>
              </div>
              <button
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
                className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded"
              >
                Sign Out
              </button>
            </div>
          )}

          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium ${
                  active ? 'bg-orange-50 text-orange-700' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-orange-600' : 'text-slate-400'}`} />
                {link.label}
              </Link>
            );
          })}

          <div className="pt-2 space-y-2">
            <Link
              href="/dashboard/orders/new"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 rounded-lg shadow-xs"
            >
              <PlusCircle className="w-5 h-5" />
              Create Group Order
            </Link>

            {!user && (
              <button
                onClick={() => {
                  loginWithGoogle();
                  setMobileOpen(false);
                }}
                className="flex items-center justify-center gap-2 w-full bg-slate-900 text-white font-medium py-2.5 rounded-lg shadow-xs cursor-pointer"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

