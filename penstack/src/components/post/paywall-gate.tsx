import { Lock } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

export interface PaywallGateProps {
  writerName: string;
  writerHandle: string;
  price?: number | null; // in cents
}

export function PaywallGate({
  writerName,
  writerHandle,
  price,
}: PaywallGateProps) {
  return (
    <div className="relative mt-8">
      {/* Fade overlay */}
      <div className="pointer-events-none absolute -top-24 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />

      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <Lock className="h-6 w-6 text-amber-700" />
        </div>
        <h3 className="font-serif text-xl font-bold text-gray-900">
          This content is for paid subscribers
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Subscribe to {writerName}
          {price ? ` for ${formatPrice(price)}/month` : ""} to unlock this
          post and all premium content.
        </p>
        <Link href={`/${writerHandle}`} className="btn-primary mt-6 inline-flex">
          Subscribe to read
        </Link>
      </div>
    </div>
  );
}
