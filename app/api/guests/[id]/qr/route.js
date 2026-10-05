import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { buildInvitationUrl } from '@/lib/whatsapp';

export async function GET(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  const guest = await prisma.guest.findFirst({ where: { id: p.id, invitation: { userId: s.user.id } }, include: { invitation: { select: { slug: true, customDomain: true, subdomain: true } } } });
  if (!guest) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Phase 2 — QR keeps the token (check-in scan credential; unchanged flow), but now honors custom domain.
  const url = buildInvitationUrl(process.env.NEXT_PUBLIC_BASE_URL || '', guest.invitation, guest.token);
  const png = await QRCode.toBuffer(url, { type: 'png', width: 600, margin: 2, color: { dark: '#2a1f14', light: '#ffffff' } });
  return new NextResponse(png, { status: 200, headers: { 'Content-Type': 'image/png', 'Content-Disposition': `attachment; filename="guest-${guest.trackingCode || guest.id}.png"` } });
}
