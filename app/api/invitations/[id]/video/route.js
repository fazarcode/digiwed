import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

async function guard(id, userId) { return prisma.invitation.findFirst({ where: { id, userId }, select: { id: true } }); }

export async function GET(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await guard(p.id, s.user.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const items = await prisma.video.findMany({ where: { invitationId: p.id } });
  return NextResponse.json({ items });
}
export async function POST(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await guard(p.id, s.user.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { url, type = 'MP4', title } = await request.json();
  const item = await prisma.video.create({ data: { invitationId: p.id, url, type, title } });
  return NextResponse.json({ item });
}
