/**
 * Map raw KYC/verification status from DB or Whop to user-facing labels for production.
 */
export function getFriendlyKycStatus(raw: string | null | undefined): string {
  if (!raw) return 'Pending';
  const s = raw.toLowerCase();
  if (s === 'verified' || s === 'approved') return 'Verified';
  if (s === 'pending' || s === 'in_review' || s === 'in_progress') return 'Pending';
  if (s === 'unstarted' || s === 'not_started' || s === 'no_account') return 'Pending';
  if (s === 'failed' || s === 'rejected') return 'Needs attention';
  return 'Pending';
}
