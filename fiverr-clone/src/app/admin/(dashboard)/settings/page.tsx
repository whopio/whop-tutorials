export default function AdminSettingsPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--black)' }}>
          Admin Settings
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--gray-500)' }}>
          Configuration is managed via environment variables
        </p>
      </div>

      <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--white)' }}>
        <h2 className="mb-4 font-semibold" style={{ color: 'var(--black)' }}>
          Environment
        </h2>
        <ul className="space-y-2 text-sm" style={{ color: 'var(--gray-600)' }}>
          <li>
            <span className="font-mono">NEXT_PUBLIC_APP_URL</span> – Base URL for the app
          </li>
          <li>
            <span className="font-mono">WHOP_API_KEY</span> – Whop API key for payments, disputes, KYC
          </li>
          <li>
            <span className="font-mono">WHOP_PLATFORM_COMPANY_ID</span> – Platform parent company for seller onboarding
          </li>
          <li>
            <span className="font-mono">SUPABASE_*</span> – Supabase URL, anon key, service role
          </li>
        </ul>
        <p className="mt-4 text-xs" style={{ color: 'var(--gray-500)' }}>
          No secrets are displayed here. Update your .env file and restart the server to apply changes.
        </p>
      </div>
    </>
  );
}
