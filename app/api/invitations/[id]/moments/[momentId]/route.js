import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

const STORAGE_ROOT = process.env.STORAGE_ROOT || '/app/digital-invitation-platform/storage';

export async function DELETE(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  const inv = await prisma.invitation.findFirst({ where: { id: p.id, userId: s.user.id }, select: { id: true } });
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const moment = await prisma.eventMoment.findFirst({ where: { id: p.momentId, invitationId: p.id } });
  if (!moment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Best effort delete the file
  try {
    if (moment.url?.startsWith('/storage-file/')) {
      const rel = moment.url.replace(/^\/storage-file\//, '');
      const abs = path.join(STORAGE_ROOT, rel);
      if (fs.existsSync(abs)) fs.unlinkSync(abs);
    }
  } catch {}
  await prisma.eventMoment.delete({ where: { id: moment.id } });
  return NextResponse.json({ ok: true });
}
