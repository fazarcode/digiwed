import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

async function guard(id, userId) {
  return prisma.invitation.findFirst({ where: { id, userId }, select: { id: true } });
}

export async function GET(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await guard(p.id, s.user.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const items = await prisma.eventMoment.findMany({
    where: { invitationId: p.id },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ items });
}
