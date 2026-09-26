import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

// POST body: { orderedIds: [id1, id2, ...] }
export async function POST(request) {
  const s = await auth(); if (!s || s.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { orderedIds } = await request.json();
  if (!Array.isArray(orderedIds)) return NextResponse.json({ error: 'orderedIds must be an array' }, { status: 400 });
  await prisma.$transaction(orderedIds.map((id, idx) =>
    prisma.guestCategory.update({ where: { id }, data: { order: (idx + 1) * 10 } })
  ));
  return NextResponse.json({ ok: true });
}
