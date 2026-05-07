'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@/components/ui';

interface ProfileSettingsFormProps {
  displayName: string;
  username: string;
  bio: string;
  skills: string[];
}

export function ProfileSettingsForm({ displayName, username, bio, skills }: ProfileSettingsFormProps) {
  const router = useRouter();
  const [display_name, setDisplayName] = useState(displayName);
  const [usernameVal, setUsername] = useState(username);
  const [bioVal, setBio] = useState(bio);
  const [skillsVal, setSkills] = useState(skills.join(', '));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: display_name.trim() || null,
          username: usernameVal.trim().toLowerCase() || null,
          bio: bioVal.trim() || null,
          skills: skillsVal
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to save');
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError('Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Display Name"
        value={display_name}
        onChange={(e) => setDisplayName(e.target.value)}
        placeholder="Your name"
      />
      <div>
        <Input
          label="Username"
          value={usernameVal}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
        />
        <p className="mt-1 text-xs" style={{ color: 'var(--gray-500)' }}>
          Your profile URL: /s/{usernameVal.trim() || 'username'}
        </p>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium text-[var(--gray-600)]">About me</label>
        <textarea
          value={bioVal}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Describe your expertise and experience for clients..."
          rows={5}
          className="w-full rounded-xl border border-[var(--gray-200)] bg-white px-4 py-3 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
          maxLength={2000}
        />
        <p className="mt-1 text-xs" style={{ color: 'var(--gray-500)' }}>
          {bioVal.length}/2000 characters
        </p>
      </div>
      <div>
        <Input
          label="Skills"
          value={skillsVal}
          onChange={(e) => setSkills(e.target.value)}
          placeholder="e.g. SEO, Content Writing, Digital Marketing"
        />
        <p className="mt-1 text-xs" style={{ color: 'var(--gray-500)' }}>
          Comma-separated (max 20)
        </p>
      </div>
      {error && (
        <p className="text-sm text-[var(--error)]">{error}</p>
      )}
      {success && (
        <p className="text-sm" style={{ color: 'var(--success, #22c55e)' }}>Changes saved.</p>
      )}
      <Button variant="primary" size="sm" type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}
