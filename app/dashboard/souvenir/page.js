import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import SouvenirClient from '@/components/dashboard/souvenir-client';

export const dynamic = 'force-dynamic';

export default async function SouvenirPage() {
  const s = await auth();
  const invitations = await prisma.invitation.findMany({
    where: { userId: s.user.id }, orderBy: { updatedAt: 'desc' },
    select: { id: true, brideName: true, groomName: true },
  });
  const data = invitations.map((i) => ({ id: i.id, name: [i.brideName, i.groomName].filter(Boolean).join(' & ') || 'Untitled' }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Souvenir</h1>
        <p className="text-muted-foreground mt-1">Manage souvenirs you give to guests (Couple &rarr; Guest). Track quota, distributed and remaining stock.</p>
      </div>
      <SouvenirClient invitations={data} />
    </div>
  );
}
