import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import GreetingTVSettings from '@/components/dashboard/greeting-tv-settings';

export const dynamic = 'force-dynamic';

export default async function GreetingTVPage() {
  const s = await auth();
  const invitations = await prisma.invitation.findMany({
    where: { userId: s.user.id },
    select: {
      id: true, brideName: true, groomName: true, slug: true, status: true,
      tvEnabled: true, tvBackground: true, tvCouplePhoto: true, tvLogo: true,
      tvDuration: true, tvSoundEnabled: true, tvAnimationEnabled: true,
      tvFontSize: true, tvFullscreen: true,
    },
    orderBy: { createdAt: 'desc' },
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Greeting TV</h1>
        <p className="text-muted-foreground mt-1">Configure the venue TV/Monitor greeting screen. It displays each guest as they check in.</p>
      </div>
      <GreetingTVSettings invitations={invitations} />
    </div>
  );
}
