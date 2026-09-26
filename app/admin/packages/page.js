import prisma from '@/lib/prisma';
import PackagesManager from '@/components/admin/packages-manager';

export const dynamic = 'force-dynamic';

export default async function AdminPackagesPage() {
  const packages = await prisma.package.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { invitations: true } } },
  });
  const data = packages.map(p => ({
    id: p.id, name: p.name, description: p.description,
    status: p.status, sortOrder: p.sortOrder,
    features: p.features || {},
    usageCount: p._count.invitations,
    createdAt: p.createdAt.toISOString(),
  }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Packages</h1>
        <p className="text-muted-foreground mt-1">Curate feature packages that users can select for each of their invitations.</p>
      </div>
      <PackagesManager initial={data} />
    </div>
  );
}
