import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function DELETE(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  const img = await prisma.galleryImage.findFirst({ where: { id: p.galleryId, invitation: { userId: s.user.id, id: p.id } } });
  if (!img) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.galleryImage.delete({ where: { id: p.galleryId } });
  return NextResponse.json({ ok: true });
}
