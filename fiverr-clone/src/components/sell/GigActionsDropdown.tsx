'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

interface GigActionsDropdownProps {
  gigId: string;
  slug: string;
  status: string;
}

export function GigActionsDropdown({ gigId, slug, status }: GigActionsDropdownProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePause = async () => {
    setOpen(false);
    const res = await fetch(`/api/sell/gigs/${gigId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paused' }),
    });
    if (res.ok) router.refresh();
  };

  const handleSubmitForReview = async () => {
    setOpen(false);
    const res = await fetch(`/api/sell/gigs/${gigId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'review' }),
    });
    if (res.ok) router.refresh();
  };

  const handleActivate = async () => {
    setOpen(false);
    const res = await fetch(`/api/sell/gigs/${gigId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published' }),
    });
    if (res.ok) router.refresh();
  };

  const handleResubmit = async () => {
    setOpen(false);
    const res = await fetch(`/api/sell/gigs/${gigId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'review' }),
    });
    if (res.ok) router.refresh();
  };

  const canPause = status === 'published';
  const canActivate = status === 'paused'; // Reactivate previously approved gig
  const canSubmitForReview = status === 'draft'; // Submit draft for moderation
  const canResubmit = status === 'requires_modification';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border transition-colors hover:bg-[var(--gray-100)]"
        style={{ borderColor: 'var(--gray-200)' }}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <ChevronDown size={18} style={{ color: 'var(--gray-600)' }} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-10 mt-1 min-w-[140px] rounded-xl border py-1 shadow-lg"
          style={{ backgroundColor: 'var(--white)', borderColor: 'var(--gray-200)' }}
        >
          <Link
            href={`/g/${slug}`}
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-left text-sm font-medium hover:bg-[var(--gray-100)]"
            style={{ color: 'var(--black)' }}
          >
            View
          </Link>
          <Link
            href={`/sell/gigs/${gigId}/edit`}
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-left text-sm font-medium hover:bg-[var(--gray-100)]"
            style={{ color: 'var(--black)' }}
          >
            Edit
          </Link>
          {canPause && (
            <button
              type="button"
              onClick={handlePause}
              className="block w-full px-4 py-2 text-left text-sm font-medium hover:bg-[var(--gray-100)]"
              style={{ color: 'var(--black)' }}
            >
              Pause
            </button>
          )}
          {canSubmitForReview && (
            <button
              type="button"
              onClick={handleSubmitForReview}
              className="block w-full px-4 py-2 text-left text-sm font-medium"
              style={{ color: 'var(--primary)' }}
            >
              Submit for review
            </button>
          )}
          {canActivate && (
            <button
              type="button"
              onClick={handleActivate}
              className="block w-full px-4 py-2 text-left text-sm font-medium"
              style={{ color: 'var(--primary)' }}
            >
              Activate
            </button>
          )}
          {canResubmit && (
            <button
              type="button"
              onClick={handleResubmit}
              className="block w-full px-4 py-2 text-left text-sm font-medium hover:bg-[var(--gray-100)]"
              style={{ color: 'var(--primary)' }}
            >
              Resubmit for review
            </button>
          )}
        </div>
      )}
    </div>
  );
}
