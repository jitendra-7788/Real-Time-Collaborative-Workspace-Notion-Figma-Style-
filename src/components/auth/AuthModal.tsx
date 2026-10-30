import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Shield, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { user, login, register, switchDemoUser, demoUsers, logout } = useAuth();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        onClose();
      } else if (mode === 'register') {
        await register(name, email, password, roleTitle);
        onClose();
      } else {
        // Forgot password
        setSuccessMsg(`Password reset instructions have been dispatched to ${email}`);
      }
    } catch (err: any) {
      setError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoSwitch = async (demoId: string) => {
    try {
      await switchDemoUser(demoId);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to switch demo user');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Account Authentication"
    >
      <div
        className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm tracking-tight">
              K
            </div>
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">
                {mode === 'login' ? 'Sign in to Kortex' : mode === 'register' ? 'Create an Account' : 'Reset Password'}
              </h2>
              <p className="text-[11px] text-neutral-400">Real-time collaborative workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 p-1 rounded-md"
            aria-label="Close authentication modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current status if already logged in */}
        {user && (
          <div className="bg-neutral-800/60 px-6 py-3 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full object-cover" />
              <div className="truncate">
                <div className="text-xs font-medium text-neutral-200 truncate">{user.name}</div>
                <div className="text-[10px] text-neutral-400 truncate">{user.email}</div>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20"
            >
              Sign out
            </button>
          </div>
        )}

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Quick Demo Switcher */}
          <div>
            <div className="text-xs font-semibold text-neutral-400 mb-2 flex items-center justify-between">
              <span>Instant Test Personas (One-Click)</span>
              <span className="text-[10px] text-blue-400 font-normal">Real live accounts</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {demoUsers.map((u) => {
                const isActive = user?.id === u.id;
                return (
                  <button
                    key={u.id}
                    onClick={() => handleDemoSwitch(u.id)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-all ${
                      isActive
                        ? 'bg-blue-600/15 border-blue-500/40 text-blue-300'
                        : 'bg-neutral-800/50 hover:bg-neutral-800 border-neutral-700/60 text-neutral-300'
                    }`}
                  >
                    <img src={u.avatarUrl} alt={u.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate flex items-center justify-between">
                        {u.name.split(' ')[0]}
                        {isActive && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate">{u.roleTitle.split(' ')[0]}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-neutral-800 w-full"></div>
            <span className="bg-neutral-900 px-3 text-[11px] text-neutral-500 shrink-0">or use custom credentials</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                {successMsg}
              </div>
            )}

            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1">Role / Job Title</label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={(e) => setRoleTitle(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-blue-500"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-neutral-300">Password</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] text-blue-400 hover:text-blue-300"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-sm text-neutral-100 placeholder-neutral-500 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 mt-2 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                'Processing...'
              ) : mode === 'login' ? (
                <>Sign In <ArrowRight className="w-4 h-4" /></>
              ) : mode === 'register' ? (
                <>Create Account <ArrowRight className="w-4 h-4" /></>
              ) : (
                'Send Reset Instructions'
              )}
            </button>
          </form>

          {/* Switch mode links */}
          <div className="text-center pt-2 text-xs text-neutral-400">
            {mode === 'login' ? (
              <p>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Create one
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
