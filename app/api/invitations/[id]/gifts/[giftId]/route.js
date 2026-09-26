import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

// Verify the gift belongs to an invitation owned by the current user.
async function ownedGift(userId, invitationId, giftId) {
  return prisma.gift.findFirstOrThrow({
    where: { id: giftId, invitationId, invitation: { userId } },
  }).catch(() => null);
}

const patchSchema = z.object({
  kind: z.enum(['MONEY', 'GOODS']).optional(),
  provider: z.string().max(120).optional().nullable(),
  accountName: z.string().max(120).optional().nullable(),
  accountNumber: z.string().max(120).optional().nullable(),
  instructions: z.string().max(2000).optional().nullable(),
  itemName: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  link: z.string().max(500).optional().nullable(),
  recipientName: z.string().max(200).optional().nullable(),
  enabled: z.boolean().optional(),
  order: z.number().int().optional(),
});

export async function PATCH(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await ownedGift(s.user.id, p.id, p.giftId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  const item = await prisma.gift.update({ where: { id: p.giftId }, data: parsed.data });
  return NextResponse.json({ item });
}

export async function DELETE(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await ownedGift(s.user.id, p.id, p.giftId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.gift.delete({ where: { id: p.giftId } });
  return NextResponse.json({ ok: true });
}
