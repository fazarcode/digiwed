import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function DELETE(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  const v = await prisma.video.findFirst({ where: { id: p.videoId, invitation: { userId: s.user.id, id: p.id } } });
  if (!v) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.video.delete({ where: { id: p.videoId } });
  return NextResponse.json({ ok: true });
}
