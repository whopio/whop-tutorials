"use client";

interface DemoModalProps {
  open: boolean;
  onClose: () => void;
}

export function DemoModal({ open, onClose }: DemoModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center">
            <svg
              className="w-7 h-7 text-yellow-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-100">
            Demo Mode
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            This is a demo application. Transactions are disabled to prevent
            real money from being processed. Browse the marketplace, view
            products, and explore the interface freely.
          </p>
          <button
            onClick={onClose}
            className="btn-primary w-full mt-2"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
