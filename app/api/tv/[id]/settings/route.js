import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function GET(request, { params }) {
  const p = await params;
  // Public endpoint (TV page loads it) but only returns non-sensitive settings
  const inv = await prisma.invitation.findUnique({
    where: { id: p.id },
    select: {
      id: true, brideName: true, groomName: true, weddingDate: true, venue: true,
      tvEnabled: true, tvBackground: true, tvCouplePhoto: true, tvLogo: true,
      tvDuration: true, tvSoundEnabled: true, tvAnimationEnabled: true,
      tvFontSize: true, tvFullscreen: true,
    },
  });
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ settings: inv });
}

export async function PATCH(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  const inv = await prisma.invitation.findFirst({ where: { id: p.id, userId: s.user.id } });
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await request.json();
  const data = {};
  const fields = ['tvEnabled', 'tvBackground', 'tvCouplePhoto', 'tvLogo', 'tvDuration', 'tvSoundEnabled', 'tvAnimationEnabled', 'tvFontSize', 'tvFullscreen'];
  for (const f of fields) if (body[f] !== undefined) data[f] = body[f];
  if (data.tvDuration) data.tvDuration = Math.max(3, Math.min(60, parseInt(data.tvDuration, 10) || 7));
  const updated = await prisma.invitation.update({ where: { id: p.id }, data });
  return NextResponse.json({ settings: updated });
}
