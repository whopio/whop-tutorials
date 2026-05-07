'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { VerificationModal } from './VerificationModal';

interface VerificationButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export function VerificationButton({ children, className = '', ...props }: VerificationButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleComplete = async () => {
    await fetch('/api/sell/kyc/sync', { method: 'POST' });
    router.refresh();
    router.push('/sell/gigs');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className={className}
        {...props}
      >
        {children}
      </button>
      <VerificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onComplete={handleComplete}
      />
    </>
  );
}
