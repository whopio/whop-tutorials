'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Logo, Button, Input } from '@/components/ui';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setAccessDenied(false);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      const res = await fetch('/api/auth/verify-admin');
      const data = await res.json().catch(() => ({}));

      if (data.isAdmin) {
        window.location.href = '/admin';
        return;
      }

      await supabase.auth.signOut();
      setAccessDenied(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (accessDenied) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8" style={{ backgroundColor: 'var(--white)' }}>
        <div className="w-full max-w-md text-center">
          <Logo />
          <h1 className="mt-12 text-2xl font-bold" style={{ color: 'var(--black)' }}>
            Access denied
          </h1>
          <p className="mt-4 text-sm" style={{ color: 'var(--gray-600)' }}>
            You do not have admin access. Please use the main login for buyers and sellers.
          </p>
          <Link href="/login" className="mt-6 inline-block">
            <Button variant="primary" size="sm">
              Go to main login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8" style={{ backgroundColor: 'var(--white)' }}>
      <div className="w-full max-w-md">
        <Logo />
        <h1 className="mt-12 text-2xl font-bold" style={{ color: 'var(--black)' }}>
          Admin sign in
        </h1>
        <p className="mb-8 text-sm" style={{ color: 'var(--gray-600)' }}>
          Sign in with your admin account
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-[#FEE2E2] p-3 text-sm text-[#DC2626]">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="admin@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="primary" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: 'var(--gray-600)' }}>
          <Link href="/login" className="font-medium" style={{ color: 'var(--primary)' }}>
            Back to main site
          </Link>
        </p>
      </div>
    </div>
  );
}
