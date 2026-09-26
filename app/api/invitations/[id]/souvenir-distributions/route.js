import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

// Phase 2 — Souvenir distribution history + transactional distribute/adjust.
async function ownerCheck(userId, invitationId) {
  return prisma.invitation.findFirst({ where: { id: invitationId, userId }, select: { id: true } });
}

export async function GET(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await ownerCheck(s.user.id, p.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const rows = await prisma.souvenirDistribution.findMany({
    where: { invitationId: p.id },
    orderBy: { updatedAt: 'desc' },
    include: { souvenir: { select: { name: true } }, guest: { select: { name: true } } },
  });
  return NextResponse.json({ items: rows.map((r) => ({ id: r.id, souvenirId: r.souvenirId, souvenirName: r.souvenir?.name || null, guestId: r.guestId, guestName: r.guest?.name || null, quantity: r.quantity, operatorName: r.operatorName, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })) });
}

const schema = z.object({
  souvenirId: z.string().min(1),
  guestId: z.string().optional().nullable(),
  quantity: z.union([z.number(), z.string()]),
  operatorName: z.string().max(120).optional().nullable(),
  checkInId: z.string().optional().nullable(),
});

// POST sets the ABSOLUTE distributed quantity for a (souvenir, guest) pair. Repeated scans do NOT
// auto-increase: they upsert to the exact `quantity` requested. Stock delta is applied atomically.
export async function POST(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await ownerCheck(s.user.id, p.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  const d = parsed.data;
  const newQty = Math.max(0, parseInt(d.quantity, 10) || 0);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const souvenir = await tx.souvenir.findFirst({ where: { id: d.souvenirId, invitationId: p.id } });
      if (!souvenir) throw new Error('SOUVENIR_NOT_FOUND');
      if (d.guestId) {
        const g = await tx.guest.findFirst({ where: { id: d.guestId, invitationId: p.id }, select: { id: true } });
        if (!g) throw new Error('GUEST_NOT_FOUND');
      }
      // Current total distributed across ALL guests for this souvenir.
      const agg = await tx.souvenirDistribution.aggregate({ where: { souvenirId: souvenir.id }, _sum: { quantity: true } });
      const totalNow = agg._sum.quantity || 0;
      // Existing record for this guest (null guest => always a new anonymous row).
      let existing = null;
      if (d.guestId) existing = await tx.souvenirDistribution.findFirst({ where: { souvenirId: souvenir.id, guestId: d.guestId } });
      const prevQty = existing ? existing.quantity : 0;
      const delta = newQty - prevQty; // may be negative (restores stock)
      const projectedTotal = totalNow + delta;
      if (projectedTotal > souvenir.quota) {
        const remaining = Math.max(0, souvenir.quota - (totalNow - prevQty));
        throw new Error('OVER_QUOTA:' + remaining);
      }
      let row;
      if (newQty === 0 && existing) {
        await tx.souvenirDistribution.delete({ where: { id: existing.id } });
        row = null;
      } else if (existing) {
        row = await tx.souvenirDistribution.update({ where: { id: existing.id }, data: { quantity: newQty, operatorName: d.operatorName || existing.operatorName, checkInId: d.checkInId || existing.checkInId } });
      } else if (newQty > 0) {
        row = await tx.souvenirDistribution.create({ data: { invitationId: p.id, souvenirId: souvenir.id, guestId: d.guestId || null, quantity: newQty, operatorName: d.operatorName || null, checkInId: d.checkInId || null } });
      }
      const newTotal = totalNow + (row ? newQty - prevQty : -prevQty);
      return { row, remaining: Math.max(0, souvenir.quota - newTotal), distributed: newTotal, quota: souvenir.quota };
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const msg = String(e.message || '');
    if (msg.startsWith('OVER_QUOTA:')) return NextResponse.json({ error: `Not enough stock. Only ${msg.split(':')[1]} left.` }, { status: 400 });
    if (msg === 'SOUVENIR_NOT_FOUND') return NextResponse.json({ error: 'Souvenir not found' }, { status: 404 });
    if (msg === 'GUEST_NOT_FOUND') return NextResponse.json({ error: 'Guest not in this invitation' }, { status: 400 });
    console.error('souvenir distribute error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
