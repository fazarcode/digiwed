import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

// Phase 3 — PRIVATE gift-proof serving. Owner (invitation owner) or ADMIN only.
// Reads from PRIVATE_STORAGE_ROOT (outside the public STORAGE_ROOT served by /storage-file).
const PRIVATE_ROOT = process.env.PRIVATE_STORAGE_ROOT || '/app/private_storage';
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.pdf': 'application/pdf' };

export async function GET(request, { params }) {
  const s = await auth();
  if (!s) return new NextResponse('Unauthorized', { status: 401 });
  const p = await params;
  const entry = await prisma.giftEntry.findFirst({
    where: { id: p.entryId, invitationId: p.id },
    select: { proofUrl: true, invitation: { select: { userId: true } } },
  });
  if (!entry || !entry.proofUrl) return new NextResponse('Not found', { status: 404 });
  // Authorization: only the invitation owner or an ADMIN may view the proof.
  if (entry.invitation.userId !== s.user.id && s.user.role !== 'ADMIN') return new NextResponse('Forbidden', { status: 403 });
  const clean = String(entry.proofUrl).replace(/\.\./g, '');
  const resolved = path.resolve(path.join(PRIVATE_ROOT, clean));
  if (!resolved.startsWith(path.resolve(PRIVATE_ROOT))) return new NextResponse('Forbidden', { status: 403 });
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return new NextResponse('Not found', { status: 404 });
  const ext = path.extname(resolved).toLowerCase();
  const buf = fs.readFileSync(resolved);
  return new NextResponse(buf, { status: 200, headers: { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'private, no-store' } });
}
