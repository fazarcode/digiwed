import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PublicMomentsUpload from '@/components/moments/public-upload';

export const dynamic = 'force-dynamic';

export default async function PublicMomentsPage({ params }) {
  const p = await params;
  const inv = await prisma.invitation.findUnique({
    where: { slug: p.slug },
    select: { id: true, slug: true, brideName: true, groomName: true, coverImage: true, events: true, momentsTitle: true, momentsMessage: true },
  });
  if (!inv) notFound();
  const ev = Array.isArray(inv.events) ? inv.events[0] : null;
  return (
    <PublicMomentsUpload
      invitation={{
        slug: inv.slug,
        brideName: inv.brideName,
        groomName: inv.groomName,
        coverImage: inv.coverImage,
        venue: ev?.venue || ev?.address || null,
        momentsTitle: inv.momentsTitle,
        momentsMessage: inv.momentsMessage,
      }}
    />
  );
}
