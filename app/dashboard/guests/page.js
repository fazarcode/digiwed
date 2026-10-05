import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import GuestsPageClient from "@/components/dashboard/guests-page";
import { DEFAULT_WHATSAPP_TEMPLATE } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export default async function GuestsPage() {
  const s = await auth();
  const [invitations, user] = await Promise.all([
    prisma.invitation.findMany({
      where: { userId: s.user.id },
      include: {
        guests: {
          orderBy: { createdAt: "desc" },
          include: {
            category: { select: { name: true } },
            side: { select: { name: true } },
          },
        },
        // Kategori milik undangan ini saja
        guestCategories: {
          where: { enabled: true },
          orderBy: [{ order: "asc" }, { createdAt: "asc" }],
          select: { id: true, name: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: s.user.id },
      select: { whatsappTemplate: true },
    }),
  ]);

  const data = invitations.map((i) => ({
    id: i.id,
    slug: i.slug,
    brideName: i.brideName,
    groomName: i.groomName,
    status: i.status,
    customDomain: i.customDomain,
    subdomain: i.subdomain,
    weddingDate: i.weddingDate?.toISOString() || null,
    weddingTime: i.weddingTime,
    venue: i.venue,
    address: i.address,
    categories: i.guestCategories.map((c) => ({ id: c.id, name: c.name })),
    guests: i.guests.map((g) => ({
      id: g.id,
      name: g.name,
      phone: g.phone,
      token: g.token,
      trackingCode: g.trackingCode,
      nameSlug: g.nameSlug,
      guestType: g.guestType,
      gender: g.gender,
      quota: g.quota,
      sideId: g.sideId,
      sideName: g.side?.name || null,
      categoryId: g.categoryId,
      category: g.category?.name || g.categoryText || null,
      checkedInAt: g.checkedInAt?.toISOString() || null,
      checkedInCount: g.checkedInCount,
    })),
  }));

  const messageTemplate = user?.whatsappTemplate || DEFAULT_WHATSAPP_TEMPLATE;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Tamu</h1>
        <p className="text-muted-foreground mt-1">
          Kelola tamu di semua undangan Anda
        </p>
      </div>
      <GuestsPageClient invitations={data} messageTemplate={messageTemplate} />
    </div>
  );
}
