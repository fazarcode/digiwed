import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

// Owner-only QR image for the public moments upload URL of an invitation.
export async function GET(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  const inv = await prisma.invitation.findFirst({
    where: { id: p.id, userId: s.user.id },
    select: { slug: true },
  });
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const origin = new URL(request.url).origin;
  const target = `${origin}/moments/${inv.slug}`;
  const png = await QRCode.toBuffer(target, { type: 'png', width: 600, margin: 2, color: { dark: '#2a1f14', light: '#ffffff' } });
  return new NextResponse(png, {
    status: 200,
    headers: { 'Content-Type': 'image/png', 'Content-Disposition': `attachment; filename="moments-${inv.slug}.png"` },
  });
}
