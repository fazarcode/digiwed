import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

async function guardGuest(guestId, invitationId, userId) {
  return prisma.guest.findFirst({ where: { id: guestId, invitationId, invitation: { userId } } });
}

export async function DELETE(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  const g = await guardGuest(p.guestId, p.id, s.user.id);
  if (!g) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.guest.delete({ where: { id: p.guestId } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  const g = await guardGuest(p.guestId, p.id, s.user.id);
  if (!g) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await request.json();
  const data = {};
  if ('name' in body) data.name = body.name;
  if ('phone' in body) data.phone = body.phone;
  if ('guestType' in body && ['INDIVIDUAL', 'GROUP'].includes(body.guestType)) data.guestType = body.guestType;
  if ('gender' in body) data.gender = body.gender || null;
  if ('guestSide' in body) data.guestSide = body.guestSide || null;
  if ('sideId' in body) {
    if (body.sideId) {
      const side = await prisma.guestSideOption.findFirst({ where: { id: body.sideId, invitationId: p.id }, select: { id: true } });
      data.sideId = side ? side.id : null;
    } else data.sideId = null;
  }
  if ('quota' in body) { const q = parseInt(body.quota, 10); if (Number.isFinite(q) && q >= 1 && q <= 100) data.quota = q; }
  if ('priorityOverride' in body) {
    if (body.priorityOverride === null || body.priorityOverride === '') data.priorityOverride = null;
    else { const pr = parseInt(body.priorityOverride, 10); if (Number.isFinite(pr) && pr >= 1 && pr <= 999) data.priorityOverride = pr; }
  }
  if ('categoryId' in body) {
    if (body.categoryId) {
      const cat = await prisma.guestCategory.findUnique({ where: { id: body.categoryId } });
      data.categoryId = cat ? cat.id : null; data.categoryText = null;
    } else data.categoryId = null;
  }
  const updated = await prisma.guest.update({ where: { id: p.guestId }, data });
  return NextResponse.json({ item: updated });
}
