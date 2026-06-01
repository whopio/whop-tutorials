import { KycReturnClient } from "./KycReturnClient";

export default function KycReturnPage() {
  return (
    <div className="min-h-[calc(100dvh-57px)] flex items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-[36px] text-text-primary">Finalizing your account…</h1>
        <p className="mt-3 text-text-secondary">
          Confirming your verification with Whop. This usually takes a second.
        </p>
        <KycReturnClient />
      </div>
    </div>
  );
}
