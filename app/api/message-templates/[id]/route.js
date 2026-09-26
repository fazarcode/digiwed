import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

async function owned(userId, id) {
  return prisma.messageTemplate.findFirst({ where: { id, userId }, select: { id: true } });
}

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  body: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await owned(s.user.id, p.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  const item = await prisma.messageTemplate.update({ where: { id: p.id }, data: parsed.data });
  return NextResponse.json({ item });
}

export async function DELETE(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await owned(s.user.id, p.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.messageTemplate.delete({ where: { id: p.id } });
  return NextResponse.json({ ok: true });
}
