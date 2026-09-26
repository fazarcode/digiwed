import prisma from '@/lib/prisma';
import UsersTable from '@/components/admin/users-table';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const [users, packages, templates] = await Promise.all([
    prisma.user.findMany({
      include: { role: true, _count: { select: { invitations: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.package.findMany({ where: { status: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
    prisma.template.findMany({ where: { enabled: true }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ]);
  const serialized = users.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role.name,
    status: u.status,
    packageId: u.packageId || '',
    templateId: u.templateId || '',
    invitationCount: u._count.invitations,
    createdAt: u.createdAt.toISOString(),
  }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground mt-1">Manage all platform users</p>
      </div>
      <UsersTable initialUsers={serialized} packages={packages} templates={templates} />
    </div>
  );
}
