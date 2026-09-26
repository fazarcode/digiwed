import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function POST(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  const body = await request.json().catch(() => ({}));
  // Find guest either by ID or token (for QR scanner)
  let guest = null;
  if (body.token) {
    guest = await prisma.guest.findFirst({ where: { token: body.token, invitation: { userId: s.user.id } }, include: { invitation: { select: { brideName: true, groomName: true } } } });
  } else {
    guest = await prisma.guest.findFirst({ where: { id: p.id, invitation: { userId: s.user.id } }, include: { invitation: { select: { brideName: true, groomName: true } } } });
  }
  if (!guest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
  if (guest.checkedInAt) return NextResponse.json({ error: 'Already checked in', guest, alreadyCheckedIn: true }, { status: 400 });
  const updated = await prisma.guest.update({ where: { id: guest.id }, data: { checkedInAt: new Date() } });
  return NextResponse.json({ ok: true, guest: { ...guest, checkedInAt: updated.checkedInAt } });
}

export async function GET(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const guest = token
    ? await prisma.guest.findFirst({ where: { token, invitation: { userId: s.user.id } }, include: { invitation: { select: { brideName: true, groomName: true, slug: true } } } })
    : await prisma.guest.findFirst({ where: { id: p.id, invitation: { userId: s.user.id } }, include: { invitation: { select: { brideName: true, groomName: true, slug: true } } } });
  if (!guest) return NextResponse.json({ error: 'Guest not found' }, { status: 404 });
  return NextResponse.json({ guest });
}
