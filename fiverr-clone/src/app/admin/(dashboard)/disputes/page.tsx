import { AdminDisputesClient } from './AdminDisputesClient';

export default function AdminDisputesPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--black)' }}>
          Disputes
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--gray-500)' }}>
          Payment disputes from Whop, grouped by seller
        </p>
      </div>

      <AdminDisputesClient />
    </>
  );
}
