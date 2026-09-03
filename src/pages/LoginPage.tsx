import { useState, useEffect, type FormEvent } from 'react';
import { Building2, Lock, Mail, Loader2, TrendingUp, Users, Wallet, ShieldCheck, Eye, EyeOff, ArrowLeft, CheckCircle2, KeyRound, UserCog, User, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type View = 'signin' | 'signup' | 'forgot' | 'reset';
type SignupRole = 'admin' | 'agent';

export function LoginPage() {
  const { signIn, signUp, resetPassword, updatePassword, passwordRecovery } = useAuth();
  const [view, setView] = useState<View>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Signup fields
  const [signupRole, setSignupRole] = useState<SignupRole>('agent');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [zone, setZone] = useState('');
  const [adminSlotsAvailable, setAdminSlotsAvailable] = useState<number | null>(null);

  useEffect(() => {
    if (passwordRecovery) setView('reset');
  }, [passwordRecovery]);

  useEffect(() => {
    if (view === 'signup' && signupRole === 'admin') {
      supabase.rpc('get_admin_count').then(({ data }) => {
        if (data !== null && data !== undefined) {
          setAdminSlotsAvailable(Math.max(0, 3 - data));
        }
      });
    }
  }, [view, signupRole]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    if (view === 'forgot') {
      setLoading(true);
      const { error } = await resetPassword(email);
      setLoading(false);
      if (error) {
        setError(error);
      } else {
        setInfo('A password reset link has been sent to your email. Click the link in the email to set a new password.');
      }
      return;
    }

    if (view === 'reset') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      setLoading(true);
      const { error } = await updatePassword(password);
      setLoading(false);
      if (error) {
        setError('Could not update your password. Please try again.');
      } else {
        setInfo('Your password has been updated successfully. You can now sign in.');
        setView('signin');
        setPassword('');
        setConfirmPassword('');
      }
      return;
    }

    if (view === 'signup') {
      if (!fullName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (signupRole === 'agent' && !phone.trim()) {
        setError('Phone number is required for field agents.');
        return;
      }
      setLoading(true);
      const { error } = await signUp(email, password, {
        role: signupRole,
        full_name: fullName,
        phone: phone || '',
        zone: zone || '',
      });
      setLoading(false);
      if (error) {
        if (error.includes('Maximum number of administrators')) {
          setError('All 3 administrator slots are filled. Please sign up as a field agent instead.');
        } else if (error.includes('already registered') || error.includes('already been registered')) {
          setError('An account with this email already exists. Please sign in instead.');
        } else {
          setError('Could not create your account. Please check your details and try again.');
        }
      } else {
        setInfo('Account created successfully. You can now sign in.');
        setView('signin');
        setPassword('');
        setConfirmPassword('');
        setFullName('');
        setPhone('');
        setZone('');
      }
      return;
    }

    // signin
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError('Invalid email or password. Please check your credentials and try again.');
    }
  };

  const switchView = (v: View) => {
    setView(v);
    setError(null);
    setInfo(null);
  };

  const adminDisabled = view === 'signup' && signupRole === 'admin' && adminSlotsAvailable === 0;

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-700 via-primary-800 to-primary-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-primary-400 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold">Fab Arena Ventures</h1>
              <p className="text-xs text-primary-200">Microfinance Management</p>
            </div>
          </div>

          <div>
            <h2 className="text-4xl font-bold leading-tight mb-4">
              Manage your customers,<br />loans, and repayments<br />all in one place.
            </h2>
            <p className="text-primary-200 text-lg max-w-md">
              A complete financial tracking platform built for modern microfinance operations.
            </p>

            <div className="mt-10 space-y-4">
              {[
                { icon: Users, text: 'Track customer profiles and histories' },
                { icon: Wallet, text: 'Manage loans with automatic calculations' },
                { icon: TrendingUp, text: 'Monitor repayments and portfolio health' },
                { icon: ShieldCheck, text: 'Bank-grade security for your data' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-3 text-primary-100">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                    <f.icon size={18} />
                  </div>
                  <span className="text-sm">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-primary-300">© 2026 Fab Arena Ventures. All rights reserved.</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-sm my-8">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
              <Building2 size={20} />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-800">Fab Arena Ventures</h1>
              <p className="text-xs text-slate-500">Microfinance Management</p>
            </div>
          </div>

          {/* Back button for sub-views */}
          {(view === 'forgot' || view === 'reset') && (
            <button
              onClick={() => switchView('signin')}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6 transition"
            >
              <ArrowLeft size={16} />
              Back to sign in
            </button>
          )}

          <h2 className="text-2xl font-bold text-slate-800">
            {view === 'signin' && 'Welcome back'}
            {view === 'signup' && 'Create your account'}
            {view === 'forgot' && 'Reset your password'}
            {view === 'reset' && 'Set a new password'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {view === 'signin' && 'Sign in to access your dashboard'}
            {view === 'signup' && 'Choose your account type to get started'}
            {view === 'forgot' && 'Enter your email and we will send you a reset link'}
            {view === 'reset' && 'Choose a new password for your account'}
          </p>

          {info && (
            <div className="mt-6 rounded-lg bg-accent-50 border border-accent-200 px-4 py-3 text-sm text-accent-700 flex items-start gap-2">
              <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" />
              <span>{info}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {view === 'signup' && (
              <>
                {/* Role selector */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setSignupRole('agent'); setError(null); }}
                    className={`flex flex-col items-center gap-2 px-4 py-4 rounded-lg border-2 transition ${signupRole === 'agent' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    <UserCog size={22} />
                    <span className="font-medium text-sm">Field Agent</span>
                    <span className="text-[10px] text-center text-slate-400">Collect susu payments</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSignupRole('admin'); setError(null); }}
                    disabled={adminSlotsAvailable === 0}
                    className={`flex flex-col items-center gap-2 px-4 py-4 rounded-lg border-2 transition ${signupRole === 'admin' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'} ${adminSlotsAvailable === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <User size={22} />
                    <span className="font-medium text-sm">Administrator</span>
                    <span className="text-[10px] text-center text-slate-400">Full system access</span>
                  </button>
                </div>

                {signupRole === 'admin' && adminSlotsAvailable !== null && (
                  <p className={`text-xs text-center flex items-center justify-center gap-1.5 ${adminSlotsAvailable > 0 ? 'text-slate-500' : 'text-error-600'}`}>
                    {adminSlotsAvailable > 0 ? (
                      <><ShieldCheck size={12} /> {adminSlotsAvailable} admin slot{adminSlotsAvailable === 1 ? '' : 's'} remaining (max 3)</>
                    ) : (
                      <><AlertCircle size={12} /> All 3 admin slots are filled. Please sign up as a field agent.</>
                    )}
                  </p>
                )}

                <div>
                  <label className="input-label">Full Name</label>
                  <div className="relative">
                    <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="input pl-10"
                      placeholder="Your full name"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="input-label">Email address</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="admin@fabarena.com"
                  disabled={view === 'reset'}
                />
              </div>
            </div>

            {view !== 'forgot' && (
              <div>
                <label className="input-label">
                  {view === 'reset' ? 'New password' : 'Password'}
                </label>
                <div className="relative">
                  {view === 'reset' ? (
                    <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  ) : (
                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  )}
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-10 pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {/* Confirm password for signup and reset */}
            {(view === 'signup' || view === 'reset') && (
              <div>
                <label className="input-label">Confirm password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input pl-10"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {/* Agent-specific fields on signup */}
            {view === 'signup' && signupRole === 'agent' && (
              <>
                <div>
                  <label className="input-label">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input"
                    placeholder="024 000 0000"
                  />
                </div>
                <div>
                  <label className="input-label">Assigned Zone / Area</label>
                  <input
                    type="text"
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    className="input"
                    placeholder="e.g. East Legon, Madina..."
                  />
                </div>
              </>
            )}

            {error && (
              <div className="rounded-lg bg-error-50 border border-error-200 px-4 py-2.5 text-sm text-error-700 flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || adminDisabled}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 active:bg-primary-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {view === 'signin' && 'Sign in'}
              {view === 'signup' && 'Create account'}
              {view === 'forgot' && 'Send reset link'}
              {view === 'reset' && 'Update password'}
            </button>
          </form>

          {view === 'signin' && (
            <div className="mt-4 text-right">
              <button
                onClick={() => switchView('forgot')}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Forgot your password?
              </button>
            </div>
          )}

          {(view === 'signin' || view === 'signup') && (
            <p className="mt-6 text-center text-sm text-slate-500">
              {view === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => switchView(view === 'signin' ? 'signup' : 'signin')}
                className="font-medium text-primary-600 hover:text-primary-700"
              >
                {view === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
