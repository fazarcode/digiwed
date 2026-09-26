import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

const schema = z.object({ name: z.string().min(1).max(80), notes: z.string().optional() });

export async function GET() {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const items = await prisma.device.findMany({
    where: { userId: s.user.id },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { checkIns: true } } },
  });
  return NextResponse.json({ items: items.map(d => ({ ...d, checkInCount: d._count.checkIns })) });
}

export async function POST(request) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  const item = await prisma.device.create({ data: { userId: s.user.id, name: parsed.data.name, notes: parsed.data.notes || null } });
  return NextResponse.json({ item });
}
