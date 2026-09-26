import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

async function ownedEntry(userId, invitationId, entryId) {
  return prisma.giftEntry.findFirst({ where: { id: entryId, invitationId, invitation: { userId } }, select: { id: true } });
}

const patchSchema = z.object({
  kind: z.enum(['MONEY', 'GOODS']).optional(),
  amount: z.union([z.number(), z.string()]).optional().nullable(),
  itemName: z.string().max(200).optional().nullable(),
  giverName: z.string().max(200).optional().nullable(),
  guestId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function PATCH(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await ownedEntry(s.user.id, p.id, p.entryId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  const d = parsed.data;
  const data = {};
  if (d.kind !== undefined) data.kind = d.kind;
  if (d.amount !== undefined) data.amount = d.amount === null || d.amount === '' ? null : String(d.amount);
  if (d.itemName !== undefined) data.itemName = d.itemName || null;
  if (d.giverName !== undefined) data.giverName = d.giverName || null;
  if (d.notes !== undefined) data.notes = d.notes || null;
  if (d.guestId !== undefined) {
    if (d.guestId) {
      const g = await prisma.guest.findFirst({ where: { id: d.guestId, invitationId: p.id }, select: { id: true } });
      if (!g) return NextResponse.json({ error: 'Guest does not belong to this invitation' }, { status: 400 });
      data.guestId = g.id;
    } else data.guestId = null;
  }
  const item = await prisma.giftEntry.update({ where: { id: p.entryId }, data, include: { guest: { select: { name: true } } } });
  return NextResponse.json({
    item: {
      id: item.id, kind: item.kind, amount: item.amount != null ? Number(item.amount) : null,
      itemName: item.itemName, giverName: item.giverName, guestId: item.guestId,
      guestName: item.guest?.name || null, notes: item.notes, createdAt: item.createdAt.toISOString(),
    },
  });
}

export async function DELETE(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await ownedEntry(s.user.id, p.id, p.entryId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.giftEntry.delete({ where: { id: p.entryId } });
  return NextResponse.json({ ok: true });
}
