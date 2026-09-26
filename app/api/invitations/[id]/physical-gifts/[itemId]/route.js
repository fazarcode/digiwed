import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

async function owned(userId, invitationId, itemId) {
  return prisma.physicalGiftItem.findFirst({ where: { id: itemId, invitationId, invitation: { userId } }, select: { id: true } });
}

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  image: z.string().max(2000).optional().nullable(),
  quota: z.union([z.number(), z.string()]).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await owned(s.user.id, p.id, p.itemId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  const d = parsed.data;
  const data = {};
  if (d.name !== undefined) data.name = d.name.trim();
  if (d.description !== undefined) data.description = d.description || null;
  if (d.image !== undefined) data.image = d.image || null;
  if (d.active !== undefined) data.active = !!d.active;
  if (d.quota !== undefined) {
    const newQuota = Math.max(0, parseInt(d.quota, 10) || 0);
    const agg = await prisma.giftEntry.aggregate({ where: { physicalItemId: p.itemId }, _sum: { quantity: true } });
    const claimed = agg._sum.quantity || 0;
    if (newQuota < claimed) return NextResponse.json({ error: `Quota cannot be less than already claimed (${claimed}).` }, { status: 400 });
    data.quota = newQuota;
  }
  const item = await prisma.physicalGiftItem.update({ where: { id: p.itemId }, data });
  return NextResponse.json({ item: { id: item.id, name: item.name, description: item.description, image: item.image, quota: item.quota, active: item.active } });
}

export async function DELETE(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await owned(s.user.id, p.id, p.itemId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.physicalGiftItem.delete({ where: { id: p.itemId } });
  return NextResponse.json({ ok: true });
}
