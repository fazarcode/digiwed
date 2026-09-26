import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

async function guard(id, userId) { return prisma.invitation.findFirst({ where: { id, userId }, select: { id: true } }); }

export async function POST(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await guard(p.id, s.user.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { url, title, autoplay = true } = await request.json();
  const music = await prisma.music.upsert({
    where: { invitationId: p.id },
    update: { url, title, autoplay },
    create: { invitationId: p.id, url, title, autoplay },
  });
  return NextResponse.json({ music });
}
export async function DELETE(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  await prisma.music.deleteMany({ where: { invitationId: p.id, invitation: { userId: s.user.id } } });
  return NextResponse.json({ ok: true });
}
