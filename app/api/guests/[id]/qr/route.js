import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  const guest = await prisma.guest.findFirst({ where: { id: p.id, invitation: { userId: s.user.id } }, include: { invitation: { select: { slug: true } } } });
  if (!guest) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const url = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/invite/${guest.invitation.slug}?guest=${guest.token}`;
  const png = await QRCode.toBuffer(url, { type: 'png', width: 600, margin: 2, color: { dark: '#2a1f14', light: '#ffffff' } });
  return new NextResponse(png, { status: 200, headers: { 'Content-Type': 'image/png', 'Content-Disposition': `attachment; filename="guest-${guest.token}.png"` } });
}
