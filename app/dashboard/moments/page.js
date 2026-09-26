import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import MomentsClient from '@/components/dashboard/moments-client';

export const dynamic = 'force-dynamic';

export default async function MomentsPage() {
  const s = await auth();
  const invitations = await prisma.invitation.findMany({
    where: { userId: s.user.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      moments: { orderBy: { createdAt: 'desc' } },
    },
  });
  const data = invitations.map(i => ({
    id: i.id, slug: i.slug, brideName: i.brideName, groomName: i.groomName,
    coverImage: i.coverImage, momentsTitle: i.momentsTitle, momentsMessage: i.momentsMessage,
    moments: i.moments.map(m => ({ id: m.id, url: m.url, senderName: m.senderName, message: m.message, createdAt: m.createdAt.toISOString() })),
  }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Event Moments</h1>
        <p className="text-muted-foreground mt-1">Photos captured by your guests during the event. Share the QR code at your venue.</p>
      </div>
      <MomentsClient invitations={data} />
    </div>
  );
}
