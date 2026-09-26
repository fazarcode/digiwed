import { requireAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import TestimonialsManager from '@/components/admin/testimonials-manager';

export const dynamic = 'force-dynamic';

export default async function AdminTestimonialsPage() {
  await requireAdmin();
  const items = await prisma.testimonial.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
  const data = items.map((t) => ({ id: t.id, name: t.name, text: t.text, rating: t.rating, avatar: t.avatar, active: t.active, order: t.order }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Testimonials</h1>
        <p className="text-muted-foreground mt-1">Manage client testimonials shown on the public landing page.</p>
      </div>
      <TestimonialsManager initial={data} />
    </div>
  );
}
