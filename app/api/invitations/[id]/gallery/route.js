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
  const items = await prisma.galleryImage.findMany({ where: { invitationId: p.id }, orderBy: { order: 'asc' } });
  return NextResponse.json({ items });
}

export async function POST(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await guard(p.id, s.user.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { url, caption } = await request.json();
  const max = await prisma.galleryImage.aggregate({ _max: { order: true }, where: { invitationId: p.id } });
  const item = await prisma.galleryImage.create({ data: { invitationId: p.id, url, caption, order: (max._max.order || 0) + 1 } });
  return NextResponse.json({ item });
}
