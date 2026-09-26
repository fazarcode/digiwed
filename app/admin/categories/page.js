import prisma from '@/lib/prisma';
import CategoriesManager from '@/components/admin/categories-manager';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const items = await prisma.guestCategory.findMany({
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { guests: true } } },
  });
  const list = items.map(c => ({
    id: c.id, name: c.name, order: c.order, enabled: c.enabled, guestCount: c._count.guests,
  }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Guest Categories</h1>
        <p className="text-muted-foreground mt-1">Create, sort, enable/disable, and remove global guest categories. Users can only select from these categories when adding guests.</p>
      </div>
      <CategoriesManager initial={list} />
    </div>
  );
}
