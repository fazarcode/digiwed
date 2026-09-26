import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

async function ownedSide(userId, invitationId, sideId) {
  return prisma.guestSideOption.findFirst({
    where: { id: sideId, invitationId, invitation: { userId } },
    include: { _count: { select: { guests: true } } },
  });
}

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  order: z.number().int().optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  const side = await ownedSide(s.user.id, p.id, p.sideId);
  if (!side) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  try {
    const item = await prisma.guestSideOption.update({ where: { id: p.sideId }, data: parsed.data });
    return NextResponse.json({ item });
  } catch (e) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'A side with this name already exists for this invitation.' }, { status: 400 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Deleting a side does NOT delete guests (schema uses SetNull). Optional ?reassignTo=<sideId|null>.
export async function DELETE(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  const side = await ownedSide(s.user.id, p.id, p.sideId);
  if (!side) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const reassignTo = new URL(request.url).searchParams.get('reassignTo');
  if (side._count.guests > 0 && reassignTo && reassignTo !== 'null') {
    const target = await prisma.guestSideOption.findFirst({ where: { id: reassignTo, invitationId: p.id }, select: { id: true } });
    if (!target) return NextResponse.json({ error: 'Invalid reassignment target' }, { status: 400 });
    await prisma.guest.updateMany({ where: { invitationId: p.id, sideId: p.sideId }, data: { sideId: target.id } });
  }
  // Remaining guests are set to null automatically via onDelete: SetNull.
  await prisma.guestSideOption.delete({ where: { id: p.sideId } });
  return NextResponse.json({ ok: true });
}
