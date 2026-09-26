import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import prisma from '@/lib/prisma';

const STORAGE_ROOT = process.env.STORAGE_ROOT || '/app/digital-invitation-platform/storage';

// Public GET — returns basic invitation info; ?gallery=1 returns the public photo gallery.
export async function GET(request, { params }) {
  const p = await params;
  const url = new URL(request.url);
  const inv = await prisma.invitation.findUnique({
    where: { slug: p.slug },
    select: { id: true, slug: true, brideName: true, groomName: true, coverImage: true, events: true, momentsTitle: true, momentsMessage: true, status: true },
  });
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (url.searchParams.get('gallery')) {
    // Req 9C — public gallery. Return ONLY safe fields (no userId/tokens/internal IDs).
    const moments = await prisma.eventMoment.findMany({
      where: { invitationId: inv.id },
      orderBy: { createdAt: 'desc' },
      select: { url: true, senderName: true, message: true, createdAt: true },
    });
    return NextResponse.json({
      items: moments.map((m) => ({ url: m.url, senderName: m.senderName, message: m.message, createdAt: m.createdAt.toISOString() })),
    });
  }

  const ev = Array.isArray(inv.events) ? inv.events[0] : null;
  const { events, ...rest } = inv;
  return NextResponse.json({ invitation: { ...rest, venue: ev?.venue || ev?.address || null } });
}

// Public POST — anonymous guests can upload one or more photos with optional name/message.
// No login required. Rate-limits by keeping uploads under a per-invitation subdirectory.
export async function POST(request, { params }) {
  const p = await params;
  const inv = await prisma.invitation.findUnique({ where: { slug: p.slug }, select: { id: true, userId: true } });
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const form = await request.formData();
  const files = form.getAll('files');
  const senderName = (form.get('senderName') || '').toString().slice(0, 120) || null;
  const message = (form.get('message') || '').toString().slice(0, 500) || null;

  if (!files.length) return NextResponse.json({ error: 'No files' }, { status: 400 });

  const relDir = `uploads/${inv.userId}/moments/${inv.id}`;
  const dir = path.join(STORAGE_ROOT, relDir);
  fs.mkdirSync(dir, { recursive: true });

  const created = [];
  for (const file of files) {
    if (!file || typeof file === 'string') continue;
    if (!file.type?.startsWith?.('image/')) continue;
    const ext = path.extname(file.name || '').toLowerCase() || '.jpg';
    const filename = `${Date.now()}-${nanoid(8)}${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(dir, filename), buf);
    const url = `/storage-file/${relDir}/${filename}`;
    const moment = await prisma.eventMoment.create({
      data: { invitationId: inv.id, url, senderName, message },
    });
    created.push({ id: moment.id, url: moment.url });
  }

  if (!created.length) return NextResponse.json({ error: 'Only image files are accepted.' }, { status: 400 });
  return NextResponse.json({ ok: true, count: created.length, items: created });
}
