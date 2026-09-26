import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function POST(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  const body = await request.json();
  const target = body.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
  const inv = await prisma.invitation.findFirst({ where: { id: p.id, userId: s.user.id } });
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.invitation.update({ where: { id: p.id }, data: { status: target } });
  return NextResponse.json({ ok: true, status: target });
}
