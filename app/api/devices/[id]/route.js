import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function PATCH(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  const dev = await prisma.device.findFirst({ where: { id: p.id, userId: s.user.id } });
  if (!dev) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await request.json();
  const data = {};
  if (typeof body.name === 'string') data.name = body.name;
  if (typeof body.notes === 'string') data.notes = body.notes;
  if (typeof body.active === 'boolean') data.active = body.active;
  const item = await prisma.device.update({ where: { id: p.id }, data });
  return NextResponse.json({ item });
}

export async function DELETE(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  const dev = await prisma.device.findFirst({ where: { id: p.id, userId: s.user.id } });
  if (!dev) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.device.delete({ where: { id: p.id } });
  return NextResponse.json({ ok: true });
}
