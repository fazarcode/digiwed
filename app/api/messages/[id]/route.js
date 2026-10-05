import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

// Phase 2 — delete a guest "message/wish" from the owner's management area.
// Reuses the existing Rsvp table (message column). Ownership enforced via invitation.userId.
// - message-only row  -> delete the row (never touches guest / real RSVPs)
// - combined RSVP row -> only clears the message text, keeping the RSVP record intact
async function ownedRsvp(userId, id) {
  return prisma.rsvp.findFirst({
    where: { id, invitation: { userId } },
    select: { id: true, isMessageOnly: true, guestId: true },
  });
}

export async function DELETE(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  const row = await ownedRsvp(s.user.id, p.id);
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (row.isMessageOnly) {
    await prisma.rsvp.delete({ where: { id: p.id } });
  } else {
    await prisma.rsvp.update({ where: { id: p.id }, data: { message: null } });
  }
  return NextResponse.json({ ok: true });
}
