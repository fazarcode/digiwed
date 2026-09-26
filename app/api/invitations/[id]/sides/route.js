import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

// Req 5 — DB-driven Guest Sides (invitation-scoped, independent of GuestCategory).
async function ownerCheck(userId, invitationId) {
  return prisma.invitation.findFirst({ where: { id: invitationId, userId }, select: { id: true } });
}

const schema = z.object({
  name: z.string().min(1).max(80),
  order: z.number().int().optional(),
  enabled: z.boolean().optional(),
});

export async function GET(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await ownerCheck(s.user.id, p.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const items = await prisma.guestSideOption.findMany({
    where: { invitationId: p.id },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { guests: true } } },
  });
  return NextResponse.json({
    items: items.map((x) => ({ id: x.id, name: x.name, order: x.order, enabled: x.enabled, guestCount: x._count.guests })),
  });
}

export async function POST(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await ownerCheck(s.user.id, p.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  try {
    const max = await prisma.guestSideOption.aggregate({ where: { invitationId: p.id }, _max: { order: true } });
    const item = await prisma.guestSideOption.create({
      data: {
        invitationId: p.id,
        name: parsed.data.name,
        order: parsed.data.order ?? ((max._max.order || 0) + 10),
        enabled: parsed.data.enabled ?? true,
      },
    });
    return NextResponse.json({ item });
  } catch (e) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'A side with this name already exists for this invitation.' }, { status: 400 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
