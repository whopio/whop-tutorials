'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Zap, Check, ArrowRight } from 'lucide-react';
import { C, Logo, GFButton, GFInput, GFBadge, GFAvatar, StarRating } from '@/components/gigflow/design-system';

const WHOP_ERROR_MESSAGES: Record<string, string> = {
  no_email: "Your Whop account didn't provide an email. Try signing in with email and password.",
  token_exchange: 'Sign-in with Whop failed. Try again or use email.',
  userinfo: 'Sign-in with Whop failed. Try again or use email.',
  create_user: 'Could not create account. Try again or use email.',
  link: 'Sign-in with Whop failed. Try again or use email.',
  config: 'Whop sign-in is not configured. Use email to sign in.',
  invalid_state: 'Sign-in expired or invalid. Try again.',
  invalid_callback: 'Sign-in was cancelled or invalid. Try again.',
  whop_email_mismatch: "This Whop account's email doesn't match. Use the same email or sign in with password.",
};

function LoginForm() {
  const searchParams = useSearchParams();
  const isSignUp = searchParams.get('signup') === '1';
  const errorFromUrl = searchParams.get('error');
  const whopError = errorFromUrl ? (WHOP_ERROR_MESSAGES[errorFromUrl] ?? 'Sign-in with Whop failed. Try again or use email.') : '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [signupRole, setSignupRole] = useState<'buyer' | 'seller'>('buyer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: name, signup_role: signupRole } },
        });
        if (error) throw error;
        if (data.session) {
          window.location.href = signupRole === 'seller' ? '/sell/onboarding' : '/account';
        } else {
          setSuccess('Check your email for a confirmation link to complete sign-up.');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = '/account';
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: C.white }}>
      <div className="flex flex-1 flex-col items-center justify-center px-4 sm:px-8 py-8 sm:py-12">
        <div className="w-full max-w-[420px]">
          <Link href="/" className="mb-12 block">
            <Logo />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ color: C.ink }}>
            {isSignUp ? 'Create account' : 'Welcome back'}
          </h1>
          <p className="text-sm mb-8" style={{ color: C.muted }}>
            {isSignUp ? 'Join 50,000+ professionals on gigflow' : 'Sign in to access your account'}
          </p>

          {(error || whopError) && (
            <div className="mb-4 rounded-xl p-3 text-sm" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>{error || whopError}</div>
          )}
          {success && (
            <div className="mb-4 rounded-xl p-3 text-sm" style={{ backgroundColor: '#D1FAE5', color: '#059669' }}>{success}</div>
          )}

          {!isSignUp && (
            <>
              <a
                href="/api/auth/whop/authorize"
                className="flex items-center justify-center gap-3 w-full py-3.5 px-4 rounded-2xl text-sm font-semibold transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  backgroundColor: '#FA4616',
                  color: '#fff',
                  boxShadow: '0 2px 8px rgba(250, 70, 22, 0.25)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#e83d0c';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(250, 70, 22, 0.35)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#FA4616';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(250, 70, 22, 0.25)';
                }}
              >
                <img
                  src="/whop_logo_brandmark_white.svg"
                  alt=""
                  className="h-[22px] w-auto object-contain"
                  aria-hidden
                />
                <span>Continue with Whop</span>
              </a>
              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px" style={{ backgroundColor: C.border }} />
                <span className="text-xs" style={{ color: C.muted }}>or</span>
                <div className="flex-1 h-px" style={{ backgroundColor: C.border }} />
              </div>
            </>
          )}

          {isSignUp && (
            <div className="mb-6">
              <p className="text-sm font-medium mb-2" style={{ color: C.ink }}>I want to...</p>
              <div className="flex flex-col gap-3">
                {[
                  { id: 'buyer' as const, label: 'Hire talent', desc: 'Find and work with top freelancers' },
                  { id: 'seller' as const, label: 'Offer services', desc: 'Earn money with your skills' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSignupRole(opt.id)}
                    className="flex items-start gap-4 p-4 rounded-2xl border text-left transition-all hover:border-orange-300"
                    style={{ borderColor: signupRole === opt.id ? C.brand : C.border, backgroundColor: C.white }}
                  >
                    <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ backgroundColor: C.brandMuted }}>
                      {opt.id === 'buyer' ? <Check size={18} style={{ color: C.brand }} /> : <Zap size={18} style={{ color: C.brand }} />}
                    </div>
                    <div>
                      <div className="font-semibold text-sm" style={{ color: C.ink }}>{opt.label}</div>
                      <div className="text-xs mt-0.5" style={{ color: C.muted }}>{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4 mt-2">
            {isSignUp && (
              <GFInput label="Full name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
            )}
            <GFInput label="Email address" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <GFInput
              label="Password"
              type={showPass ? 'text' : 'password'}
              placeholder={isSignUp ? 'Min. 8 characters' : '••••••••'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              suffix={
                <button type="button" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff size={16} style={{ color: C.muted }} /> : <Eye size={16} style={{ color: C.muted }} />}
                </button>
              }
              required
            />
            {!isSignUp && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer" style={{ color: C.muted }}>
                  <input type="checkbox" className="w-4 h-4 rounded accent-orange-500" />
                  Remember me
                </label>
                <Link href="/forgot-password" className="font-medium hover:opacity-70 transition" style={{ color: C.brand }}>
                  Forgot password?
                </Link>
              </div>
            )}
            {isSignUp && (
              <label className="flex items-start gap-2 text-xs cursor-pointer" style={{ color: C.muted }}>
                <input type="checkbox" className="w-4 h-4 mt-0.5 accent-orange-500" required />
                I agree to the Terms of Service and Privacy Policy
              </label>
            )}
            <GFButton type="submit" variant="brand" size="lg" className="w-full mt-2" icon={loading ? undefined : <ArrowRight size={16} />} disabled={loading} loading={loading}>
              {loading ? (isSignUp ? 'Creating account…' : 'Signing in…') : isSignUp ? 'Create Account' : 'Sign In'}
            </GFButton>
          </form>

          <p className="text-center mt-6 text-sm" style={{ color: C.muted }}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Link href={isSignUp ? '/login' : '/login?signup=1'} className="font-semibold hover:opacity-70 transition" style={{ color: C.brand }}>
              {isSignUp ? 'Sign in' : 'Sign up'}
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:flex w-[480px] flex-col justify-center p-12 relative overflow-hidden" style={{ backgroundColor: C.ink }}>
        <div className="absolute inset-0">
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${C.ink}F0, ${C.ink}D0)` }} />
        </div>
        <div className="relative z-10">
          <div className="rounded-2xl p-5 mb-8 border" style={{ backgroundColor: 'rgba(255,255,255,0.07)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-4 mb-5">
              <GFAvatar name="Sarah Chen" size="lg" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">Sarah Chen</span>
                  <GFBadge variant="brand">Pro Seller</GFBadge>
                </div>
                <div className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Brand Designer</div>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <StarRating rating={4.9} count={521} size={13} />
              <span className="text-sm flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                <Check size={13} /> 312 orders
              </span>
            </div>
            <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              {['$24K', '99%', '2d'].map((v, i) => (
                <div key={i} className="text-center">
                  <div className="text-lg font-bold text-white">{v}</div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{['Earned', 'On time', 'Avg. delivery'][i]}</div>
                </div>
              ))}
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-5 text-white leading-snug">
            Join 50,000+ freelancers earning on gigflow
          </h3>
          <ul className="flex flex-col gap-3">
            {['Secure escrow payments', 'No upfront fees', 'Global client base', '24/7 support'].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: C.brand }}>
                  <Check size={11} color="white" />
                </div>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
