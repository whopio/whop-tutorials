'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera } from 'lucide-react';
import { C } from '@/lib/design-tokens';

interface ProfileAvatarUploadProps {
  currentAvatarUrl: string | null;
  displayName: string | null;
}

export function ProfileAvatarUpload({ currentAvatarUrl, displayName }: ProfileAvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set('avatar', file);
      const res = await fetch('/api/profile/avatar', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      router.refresh();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const initials = displayName?.slice(0, 2).toUpperCase() || '?';

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={uploading}
      className="relative group rounded-full overflow-hidden focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
      style={{
        width: 96,
        height: 96,
        border: `4px solid ${C.white}`,
      }}
    >
      {currentAvatarUrl ? (
        <img src={currentAvatarUrl} alt={displayName || 'Avatar'} className="w-full h-full object-cover" />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center font-bold text-2xl"
          style={{ backgroundColor: C.brandMuted, color: C.brand }}
        >
          {initials}
        </div>
      )}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        <Camera size={24} className="text-white" />
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleChange}
      />
    </button>
  );
}
