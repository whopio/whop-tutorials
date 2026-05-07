import { redirect } from 'next/navigation';
import { NavAdmin } from '@/components/layout/NavAdmin';
import { createClient } from '@/lib/supabase/server';

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return (
      <div className="flex min-h-screen items-center justify-center p-8" style={{ backgroundColor: 'var(--gray-100)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--black)' }}>
            Access denied
          </h1>
          <p className="mt-4 text-sm" style={{ color: 'var(--gray-600)' }}>
            You do not have permission to access the admin area.
          </p>
          <a
            href="/"
            className="mt-6 inline-block rounded-lg px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: 'var(--primary)', color: 'var(--white)' }}
          >
            Go to homepage
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--gray-100)' }}>
      <NavAdmin />
      <main className="ml-0 md:ml-64 flex-1 p-4 md:p-8 pt-14 md:pt-8">{children}</main>
    </div>
  );
}
