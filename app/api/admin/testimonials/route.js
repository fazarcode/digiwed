import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

// Phase 6 — Testimonials (admin-managed, shown on public landing).
async function requireAdmin() { const s = await auth(); if (!s || s.user.role !== 'ADMIN') return null; return s; }

const schema = z.object({
  name: z.string().min(1).max(200),
  text: z.string().min(1).max(2000),
  rating: z.union([z.number(), z.string()]).optional(),
  avatar: z.string().max(2000).optional().nullable(),
  active: z.boolean().optional(),
  order: z.union([z.number(), z.string()]).optional(),
});

export async function GET() {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const items = await prisma.testimonial.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
  return NextResponse.json({ items });
}

export async function POST(request) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  const d = parsed.data;
  const rating = Math.min(5, Math.max(1, parseInt(d.rating, 10) || 5));
  const order = parseInt(d.order, 10) || 0;
  const item = await prisma.testimonial.create({ data: { name: d.name.trim(), text: d.text.trim(), rating, avatar: d.avatar || null, active: d.active !== false, order } });
  return NextResponse.json({ item });
}
