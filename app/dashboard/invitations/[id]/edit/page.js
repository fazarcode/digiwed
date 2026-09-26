import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import InvitationEditor from '@/components/editor/invitation-editor';

export const dynamic = 'force-dynamic';

export default async function EditorPage({ params }) {
  const p = await params;
  const session = await auth();
  const invitation = await prisma.invitation.findFirst({
    where: { id: p.id, userId: session.user.id },
    include: { gallery: { orderBy: { order: 'asc' } }, videos: true, music: true, template: true },
  });
  if (!invitation) notFound();

  const templates = await prisma.template.findMany({ where: { enabled: true }, select: { id: true, name: true, slug: true } });

  // Serialize for client
  const data = JSON.parse(JSON.stringify({
    ...invitation,
    weddingDate: invitation.weddingDate ? invitation.weddingDate.toISOString() : null,
    createdAt: invitation.createdAt.toISOString(),
    updatedAt: invitation.updatedAt.toISOString(),
  }));
  return <InvitationEditor invitation={data} templates={templates} />;
}
