'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera } from 'lucide-react';
import { Avatar } from '@/components/ui';

interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  displayName: string | null;
  onUploaded?: (avatarUrl: string) => void;
}

export function AvatarUpload({ currentAvatarUrl, displayName, onUploaded }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploading(true);

    try {
      const formData = new FormData();
      formData.set('avatar', file);

      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Upload failed');
        return;
      }

      onUploaded?.(data.avatar_url);
      router.refresh();
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="relative group rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
      >
        <Avatar src={currentAvatarUrl} displayName={displayName} size="lg" />
        <div
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <Camera size={28} className="text-white" />
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleChange}
      />
      <p className="text-xs" style={{ color: 'var(--gray-500)' }}>
        {uploading ? 'Uploading...' : 'Click to change photo (max 2MB)'}
      </p>
      {error && (
        <p className="text-sm" style={{ color: '#DC2626' }}>
          {error}
        </p>
      )}
    </div>
  );
}
