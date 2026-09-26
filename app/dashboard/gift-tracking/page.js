import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import GiftTrackingClient from '@/components/dashboard/gift-tracking-client';

export const dynamic = 'force-dynamic';

export default async function GiftTrackingPage() {
  const s = await auth();
  const invitations = await prisma.invitation.findMany({
    where: { userId: s.user.id }, orderBy: { updatedAt: 'desc' },
    select: { id: true, brideName: true, groomName: true },
  });
  const data = invitations.map((i) => ({ id: i.id, name: [i.brideName, i.groomName].filter(Boolean).join(' & ') || 'Untitled' }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Gift Tracking</h1>
        <p className="text-muted-foreground mt-1">Gifts received from guests (Guest &rarr; Couple): money/angpau and physical goods. Saved immediately — no approval workflow.</p>
      </div>
      <GiftTrackingClient invitations={data} />
    </div>
  );
}
