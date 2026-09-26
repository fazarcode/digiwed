import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

// Phase 2 — Souvenir CRUD (Couple -> Guest). Invitation-scoped, owner-authorized.
async function ownerCheck(userId, invitationId) {
  return prisma.invitation.findFirst({ where: { id: invitationId, userId }, select: { id: true } });
}

const schema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  image: z.string().max(2000).optional().nullable(),
  quota: z.union([z.number(), z.string()]).optional(),
  active: z.boolean().optional(),
});

export async function GET(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await ownerCheck(s.user.id, p.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const items = await prisma.souvenir.findMany({
    where: { invitationId: p.id },
    orderBy: { createdAt: 'asc' },
    include: { distributions: { select: { quantity: true } } },
  });
  const mapped = items.map((x) => {
    const distributed = x.distributions.reduce((sum, d) => sum + (d.quantity || 0), 0);
    return { id: x.id, name: x.name, description: x.description, image: x.image, quota: x.quota, active: x.active, distributed, remaining: Math.max(0, x.quota - distributed), createdAt: x.createdAt.toISOString(), updatedAt: x.updatedAt.toISOString() };
  });
  return NextResponse.json({ items: mapped });
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
  const quota = Math.max(0, parseInt(d.quota, 10) || 0);
  const item = await prisma.souvenir.create({
    data: { invitationId: p.id, name: d.name.trim(), description: d.description || null, image: d.image || null, quota, active: d.active !== false },
  });
  return NextResponse.json({ item: { id: item.id, name: item.name, description: item.description, image: item.image, quota: item.quota, active: item.active, distributed: 0, remaining: item.quota } });
}
