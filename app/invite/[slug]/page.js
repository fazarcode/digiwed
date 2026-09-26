import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { renderInvitationAsync } from '@/lib/template-engine';

export const dynamic = 'force-dynamic';

export default async function PublicInvitationPage({ params, searchParams }) {
  const p = await params;
  const sp = await searchParams;
  const slug = p.slug;
  const guestToken = sp?.guest;

  const invitation = await prisma.invitation.findUnique({
    where: { slug },
    include: {
      template: true,
      gallery: { orderBy: { order: 'asc' } },
      videos: true,
      music: true,
      guests: { orderBy: { createdAt: 'asc' } },
      rsvps: { orderBy: { createdAt: 'asc' } },
      moments: { orderBy: { createdAt: 'asc' } },
      gifts: { orderBy: { order: 'asc' } },
      rsvpFields: { where: { enabled: true }, orderBy: { order: 'asc' } },
    },
  });

  if (!invitation) notFound();
  if (invitation.status !== 'PUBLISHED' && sp?.preview !== '1') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'serif', color: '#8b6f47', background: '#faf7f2', textAlign: 'center', padding: 40 }}>
        <div>
          <h1 style={{ fontSize: 40, marginBottom: 12 }}>Invitation Not Published</h1>
          <p>This invitation is still being prepared. Please check back later.</p>
        </div>
      </div>
    );
  }

  if (!invitation.template) {
    const fallback = await prisma.template.findUnique({ where: { slug: 'elegant-brown' } });
    if (fallback) invitation.template = fallback;
    else notFound();
  }

  let guest = null;
  let guestHasRsvp = false;
  if (guestToken) {
    guest = await prisma.guest.findFirst({ where: { token: guestToken, invitationId: invitation.id } });
    if (guest) {
      const existing = await prisma.rsvp.findFirst({ where: { guestId: guest.id, invitationId: invitation.id }, select: { id: true } });
      guestHasRsvp = !!existing;
    }
  }

  const html = await renderInvitationAsync({ template: invitation.template, invitation, guest, guestHasRsvp });
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
