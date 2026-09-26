import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  const inv = await prisma.invitation.findFirst({ where: { id: p.id, userId: s.user.id }, select: { id: true } });
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const rsvps = await prisma.rsvp.findMany({ where: { invitationId: p.id }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ rsvps });
}
