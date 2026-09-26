import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import TVClient from '@/components/tv/tv-client';

export const dynamic = 'force-dynamic';

export default async function TVPage({ params }) {
  const p = await params;
  const inv = await prisma.invitation.findUnique({
    where: { id: p.id },
    select: {
      id: true, brideName: true, groomName: true, weddingDate: true, venue: true,
      tvEnabled: true, tvBackground: true, tvCouplePhoto: true, tvLogo: true,
      tvDuration: true, tvSoundEnabled: true, tvAnimationEnabled: true,
      tvFontSize: true, tvFullscreen: true,
    },
  });
  if (!inv) notFound();
  return <TVClient settings={JSON.parse(JSON.stringify({ ...inv, weddingDate: inv.weddingDate?.toISOString() || null }))} />;
}
