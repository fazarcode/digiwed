import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

async function guard() {
  const s = await auth();
  if (!s || s.user.role !== 'ADMIN') return null;
  return s;
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
  order: z.number().int().optional(),
  enabled: z.boolean().optional(),
});

export async function GET() {
  if (!(await guard())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const items = await prisma.guestCategory.findMany({ orderBy: [{ order: 'asc' }, { name: 'asc' }] });
  return NextResponse.json({ items });
}

export async function POST(request) {
  if (!(await guard())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  try {
    const existing = await prisma.guestCategory.findUnique({ where: { name: parsed.data.name } });
    if (existing) return NextResponse.json({ error: 'Category with this name already exists' }, { status: 400 });
    const max = await prisma.guestCategory.aggregate({ _max: { order: true } });
    const item = await prisma.guestCategory.create({
      data: {
        name: parsed.data.name,
        order: parsed.data.order ?? ((max._max.order || 0) + 10),
        enabled: parsed.data.enabled ?? true,
      },
    });
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
