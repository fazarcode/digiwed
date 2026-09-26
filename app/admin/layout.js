import { requireAdmin } from '@/lib/rbac';
import AdminSidebar from '@/components/admin/sidebar';
import AdminHeader from '@/components/admin/header';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }) {
  const session = await requireAdmin();
  return (
    <div className="flex min-h-screen bg-[#F8F5F0]">
      <AdminSidebar />
      <div className="flex-1 flex flex-col md:ml-64">
        <AdminHeader user={session.user} />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
