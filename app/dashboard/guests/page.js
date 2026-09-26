import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import GuestsPageClient from '@/components/dashboard/guests-page';
import { DEFAULT_WHATSAPP_TEMPLATE } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export default async function GuestsPage() {
  const s = await auth();
  const [invitations, categories, user] = await Promise.all([
    prisma.invitation.findMany({
      where: { userId: s.user.id },
      include: { guests: { orderBy: { createdAt: 'desc' }, include: { category: { select: { name: true } } } } },
      orderBy: { updatedAt: 'desc' },
    }),
    prisma.guestCategory.findMany({ where: { enabled: true }, orderBy: [{ order: 'asc' }, { name: 'asc' }] }),
    prisma.user.findUnique({ where: { id: s.user.id }, select: { whatsappTemplate: true } }),
  ]);
  const data = invitations.map(i => ({
    id: i.id, slug: i.slug, brideName: i.brideName, groomName: i.groomName, status: i.status,
    customDomain: i.customDomain, subdomain: i.subdomain,
    weddingDate: i.weddingDate?.toISOString() || null, weddingTime: i.weddingTime,
    venue: i.venue, address: i.address,
    guests: i.guests.map(g => ({
      id: g.id, name: g.name, phone: g.phone, token: g.token,
      guestType: g.guestType, gender: g.gender, guestSide: g.guestSide, quota: g.quota,
      categoryId: g.categoryId, category: g.category?.name || g.categoryText || null,
      checkedInAt: g.checkedInAt?.toISOString() || null, checkedInCount: g.checkedInCount,
    })),
  }));
  const cats = categories.map(c => ({ id: c.id, name: c.name }));
  const messageTemplate = user?.whatsappTemplate || DEFAULT_WHATSAPP_TEMPLATE;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Guests</h1>
        <p className="text-muted-foreground mt-1">Manage guests across all your invitations</p>
      </div>
      <GuestsPageClient invitations={data} categories={cats} messageTemplate={messageTemplate} />
    </div>
  );
}
