import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

async function ownerCheck(userId, invitationId) {
  return prisma.invitation.findFirst({ where: { id: invitationId, userId }, select: { id: true } });
}

const giftSchema = z.object({
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

// GET -> list gifts for an owned invitation
export async function GET(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await ownerCheck(s.user.id, p.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const items = await prisma.gift.findMany({
    where: { invitationId: p.id },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  });
  return NextResponse.json({ items });
}

// POST -> create a gift on an owned invitation
export async function POST(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await ownerCheck(s.user.id, p.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const parsed = giftSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  const max = await prisma.gift.aggregate({ where: { invitationId: p.id }, _max: { order: true } });
  const item = await prisma.gift.create({
    data: {
      invitationId: p.id,
      kind: parsed.data.kind || 'MONEY',
      provider: parsed.data.provider || null,
      accountName: parsed.data.accountName || null,
      accountNumber: parsed.data.accountNumber || null,
      instructions: parsed.data.instructions || null,
      itemName: parsed.data.itemName || null,
      description: parsed.data.description || null,
      link: parsed.data.link || null,
      recipientName: parsed.data.recipientName || null,
      enabled: parsed.data.enabled ?? true,
      order: parsed.data.order ?? ((max._max.order || 0) + 10),
    },
  });
  return NextResponse.json({ item });
}
