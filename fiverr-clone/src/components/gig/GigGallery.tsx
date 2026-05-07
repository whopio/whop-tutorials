'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Play } from 'lucide-react';

interface GalleryItem {
  url: string;
  type: 'image' | 'video';
}

interface GigGalleryProps {
  gallery: GalleryItem[];
}

export function GigGallery({ gallery }: GigGalleryProps) {
  const [selected, setSelected] = useState(0);
  const items = gallery.length > 0 ? gallery : null;
  const current = items ? items[selected] : null;

  if (!items || items.length === 0) {
    return (
      <div
        className="mb-8 aspect-video overflow-hidden rounded-2xl"
        style={{ backgroundColor: 'var(--gray-100)' }}
      >
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-100 to-amber-50">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/80 transition-transform hover:scale-105">
            <Play size={32} style={{ color: 'var(--primary)' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div
        className="aspect-video overflow-hidden rounded-2xl"
        style={{ backgroundColor: 'var(--gray-100)' }}
      >
        {current?.type === 'image' ? (
          <div className="relative h-full w-full">
            <Image
              src={current.url}
              alt=""
              fill
              className="object-cover"
              unoptimized={current.url.includes('supabase')}
            />
          </div>
        ) : (
          <div className="relative h-full w-full">
            <video
              src={current?.url}
              className="h-full w-full object-cover"
              controls
              poster={items.find((x) => x.type === 'image')?.url}
            />
          </div>
        )}
      </div>
      {items.length > 1 && (
        <div className="mt-3 flex gap-3">
          {items.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg transition-opacity hover:opacity-80 ${
                selected === i ? 'ring-2 ring-[var(--primary)] ring-offset-2' : ''
              }`}
              style={{ backgroundColor: 'var(--gray-200)' }}
            >
              {item.type === 'image' ? (
                <Image
                  src={item.url}
                  alt=""
                  width={80}
                  height={56}
                  className="h-full w-full object-cover"
                  unoptimized={item.url.includes('supabase')}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Play size={20} style={{ color: 'var(--gray-600)' }} />
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
