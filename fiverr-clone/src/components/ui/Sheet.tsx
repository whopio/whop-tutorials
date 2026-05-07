'use client';

import React, { useEffect, useCallback, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  side?: 'left' | 'right';
  className?: string;
  /** Optional: do not render close button (e.g. if content has its own) */
  showCloseButton?: boolean;
}

export function Sheet({
  open,
  onOpenChange,
  children,
  side = 'right',
  className,
  showCloseButton = true,
}: SheetProps) {
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      const t = requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return () => cancelAnimationFrame(t);
    }
    setVisible(false);
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      const onEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') close();
      };
      document.addEventListener('keydown', onEscape);
      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', onEscape);
      };
    }
    document.body.style.overflow = '';
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      {/* Overlay */}
      <button
        type="button"
        className={cn(
          'absolute inset-0 bg-black/50 transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={close}
        aria-label="Close menu"
      />
      {/* Panel */}
      <div
        className={cn(
          'absolute top-0 h-full w-full sm:w-[min(100vw-2rem,20rem)] sm:max-w-sm flex flex-col bg-white shadow-xl transition-transform duration-300 ease-out',
          side === 'right' && 'right-0 border-l',
          side === 'left' && 'left-0 border-r',
          side === 'right' && (visible ? 'translate-x-0' : 'translate-x-full'),
          side === 'left' && (visible ? 'translate-x-0' : '-translate-x-full'),
          className
        )}
        style={{
          borderColor: 'var(--border, #e5e5e5)',
        }}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={close}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-black/5 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        )}
        <div className="flex-1 overflow-y-auto pt-4">{children}</div>
      </div>
    </div>
  );
}
