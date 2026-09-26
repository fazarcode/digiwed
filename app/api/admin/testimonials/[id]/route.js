import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

async function requireAdmin() { const s = await auth(); if (!s || s.user.role !== 'ADMIN') return null; return s; }

const schema = z.object({
  name: z.string().min(1).max(200).optional(),
  text: z.string().min(1).max(2000).optional(),
  rating: z.union([z.number(), z.string()]).optional(),
  avatar: z.string().max(2000).optional().nullable(),
  active: z.boolean().optional(),
  order: z.union([z.number(), z.string()]).optional(),
});

export async function PATCH(request, { params }) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const p = await params;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  const d = parsed.data;
  const data = {};
  if (d.name !== undefined) data.name = d.name.trim();
  if (d.text !== undefined) data.text = d.text.trim();
  if (d.rating !== undefined) data.rating = Math.min(5, Math.max(1, parseInt(d.rating, 10) || 5));
  if (d.avatar !== undefined) data.avatar = d.avatar || null;
  if (d.active !== undefined) data.active = !!d.active;
  if (d.order !== undefined) data.order = parseInt(d.order, 10) || 0;
  try {
    const item = await prisma.testimonial.update({ where: { id: p.id }, data });
    return NextResponse.json({ item });
  } catch { return NextResponse.json({ error: 'Not found' }, { status: 404 }); }
}

export async function DELETE(request, { params }) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const p = await params;
  try { await prisma.testimonial.delete({ where: { id: p.id } }); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: 'Not found' }, { status: 404 }); }
}
