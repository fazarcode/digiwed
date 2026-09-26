import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

// Req 7 — received-gift LEDGER (distinct from angpau account config in the Gift model).
async function ownerCheck(userId, invitationId) {
  return prisma.invitation.findFirst({ where: { id: invitationId, userId }, select: { id: true } });
}

const schema = z.object({
  kind: z.enum(['MONEY', 'GOODS']).optional(),
  amount: z.union([z.number(), z.string()]).optional().nullable(),
  itemName: z.string().max(200).optional().nullable(),
  giverName: z.string().max(200).optional().nullable(),
  guestId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  checkInId: z.string().optional().nullable(),
});

function serialize(e) {
  return {
    id: e.id,
    kind: e.kind,
    amount: e.amount != null ? Number(e.amount) : null,
    itemName: e.itemName,
    giverName: e.giverName,
    guestId: e.guestId,
    guestName: e.guest?.name || null,
    notes: e.notes,
    quantity: e.quantity ?? null,
    physicalItemId: e.physicalItemId ?? null,
    hasProof: !!e.proofUrl,
    createdAt: e.createdAt.toISOString(),
  };
}

export async function GET(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await ownerCheck(s.user.id, p.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const items = await prisma.giftEntry.findMany({
    where: { invitationId: p.id },
    orderBy: { createdAt: 'desc' },
    include: { guest: { select: { name: true } } },
  });
  const totalMoney = items.filter((x) => x.kind === 'MONEY').reduce((sum, x) => sum + (x.amount != null ? Number(x.amount) : 0), 0);
  const goodsCount = items.filter((x) => x.kind === 'GOODS').length;
  return NextResponse.json({ items: items.map(serialize), totalMoney, goodsCount, count: items.length });
}

export async function POST(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await ownerCheck(s.user.id, p.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  const d = parsed.data;
  let guestId = null;
  if (d.guestId) {
    const g = await prisma.guest.findFirst({ where: { id: d.guestId, invitationId: p.id }, select: { id: true } });
    if (!g) return NextResponse.json({ error: 'Guest does not belong to this invitation' }, { status: 400 });
    guestId = g.id;
  }
  const kind = d.kind || 'MONEY';
  const amount = kind === 'MONEY' && d.amount != null && d.amount !== '' ? String(d.amount) : null;
  // Dedupe: if this check-in already recorded a gift, UPDATE it instead of inserting a duplicate.
  if (d.checkInId) {
    const existing = await prisma.giftEntry.findFirst({ where: { invitationId: p.id, checkInId: d.checkInId } });
    if (existing) {
      const upd = await prisma.giftEntry.update({
        where: { id: existing.id },
        data: { kind, amount, itemName: d.itemName || null, giverName: d.giverName || null, guestId, notes: d.notes || null },
        include: { guest: { select: { name: true } } },
      });
      return NextResponse.json({ item: serialize(upd), deduped: true });
    }
  }
  const item = await prisma.giftEntry.create({
    data: {
      invitationId: p.id,
      kind,
      amount,
      itemName: d.itemName || null,
      giverName: d.giverName || null,
      guestId,
      notes: d.notes || null,
      checkInId: d.checkInId || null,
    },
    include: { guest: { select: { name: true } } },
  });
  return NextResponse.json({ item: serialize(item) });
}
