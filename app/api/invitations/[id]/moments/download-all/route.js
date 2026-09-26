import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

const STORAGE_ROOT = process.env.STORAGE_ROOT || '/app/digital-invitation-platform/storage';

export async function GET(request, { params }) {
  const s = await auth();
  if (!s) return new Response('Unauthorized', { status: 401 });
  const p = await params;
  const inv = await prisma.invitation.findFirst({
    where: { id: p.id, userId: s.user.id },
    select: { id: true, slug: true },
  });
  if (!inv) return new Response('Not found', { status: 404 });

  const moments = await prisma.eventMoment.findMany({
    where: { invitationId: inv.id },
    orderBy: { createdAt: 'asc' },
  });
  if (!moments.length) return new Response('No moments to download', { status: 404 });

  const zip = new AdmZip();
  moments.forEach((m, idx) => {
    if (!m.url?.startsWith('/storage-file/')) return;
    const rel = m.url.replace(/^\/storage-file\//, '');
    const abs = path.join(STORAGE_ROOT, rel);
    if (!fs.existsSync(abs)) return;
    const ext = path.extname(abs);
    const senderPart = m.senderName ? `-${String(m.senderName).replace(/[^a-z0-9]+/gi, '_')}` : '';
    const name = `moment-${String(idx + 1).padStart(3, '0')}${senderPart}${ext}`;
    zip.addLocalFile(abs, '', name);
  });

  const buffer = zip.toBuffer();
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="moments-${inv.slug}.zip"`,
      'Content-Length': String(buffer.length),
    },
  });
}
