import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

async function guard() { const s = await auth(); if (!s || s.user.role !== 'ADMIN') return null; return s; }

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  order: z.number().int().optional(),
  enabled: z.boolean().optional(),
  priority: z.number().int().min(1).max(999).optional(),
});

export async function PATCH(request, { params }) {
  if (!(await guard())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const p = await params;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  try {
    const item = await prisma.guestCategory.update({ where: { id: p.id }, data: parsed.data });
    return NextResponse.json({ item });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  if (!(await guard())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const p = await params;
  await prisma.guestCategory.delete({ where: { id: p.id } });
  return NextResponse.json({ ok: true });
}
