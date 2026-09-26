import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import prisma from '@/lib/prisma';

// Phase 3 — PUBLIC gift endpoint (guest -> couple). No login. Slug-scoped (public-safe).
// Proofs are written OUTSIDE the public STORAGE_ROOT so they are never served by /storage-file.
const PRIVATE_ROOT = process.env.PRIVATE_STORAGE_ROOT || '/app/private_storage';
const MAX_PROOF_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_PROOF = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];

export async function GET(request, { params }) {
  const p = await params;
  const inv = await prisma.invitation.findUnique({
    where: { slug: p.slug },
    select: { id: true, slug: true, brideName: true, groomName: true, status: true, gifts: { where: { enabled: true }, orderBy: { order: 'asc' }, select: { id: true, kind: true, provider: true, accountName: true, accountNumber: true, instructions: true, itemName: true, description: true } } },
  });
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const items = await prisma.physicalGiftItem.findMany({ where: { invitationId: inv.id, active: true }, orderBy: { createdAt: 'asc' }, include: { giftEntries: { select: { quantity: true } } } });
  const physical = items.map((x) => {
    const claimed = x.giftEntries.reduce((s, g) => s + (g.quantity || 0), 0);
    const remaining = Math.max(0, x.quota - claimed);
    return { id: x.id, name: x.name, description: x.description, image: x.image, quota: x.quota, remaining, available: remaining > 0 };
  });
  // Public-safe only: no userId, tokens, internal ids beyond what's needed.
  return NextResponse.json({ invitation: { brideName: inv.brideName, groomName: inv.groomName, slug: inv.slug }, angpau: inv.gifts, physical });
}

export async function POST(request, { params }) {
  const p = await params;
  const inv = await prisma.invitation.findUnique({ where: { slug: p.slug }, select: { id: true, userId: true, status: true } });
  if (!inv) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (inv.status !== 'PUBLISHED') return NextResponse.json({ error: 'Invitation is not accepting gifts yet' }, { status: 400 });

  const form = await request.formData();
  const action = String(form.get('action') || 'money');
  const giverName = (form.get('giverName') || '').toString().slice(0, 200) || null;
  const note = (form.get('note') || '').toString().slice(0, 2000) || null;

  if (action === 'physical') {
    const itemId = String(form.get('itemId') || '');
    const qty = Math.max(1, parseInt(form.get('quantity'), 10) || 1);
    if (!itemId) return NextResponse.json({ error: 'Select a gift item' }, { status: 400 });
    try {
      const result = await prisma.$transaction(async (tx) => {
        const item = await tx.physicalGiftItem.findFirst({ where: { id: itemId, invitationId: inv.id, active: true } });
        if (!item) throw new Error('ITEM_NOT_FOUND');
        const agg = await tx.giftEntry.aggregate({ where: { physicalItemId: item.id }, _sum: { quantity: true } });
        const claimed = agg._sum.quantity || 0;
        const remaining = Math.max(0, item.quota - claimed);
        if (qty > remaining) throw new Error('OVER_QUOTA:' + remaining);
        await tx.giftEntry.create({ data: { invitationId: inv.id, kind: 'GOODS', itemName: item.name, giverName, notes: note, physicalItemId: item.id, quantity: qty } });
        return { remaining: remaining - qty };
      });
      return NextResponse.json({ ok: true, remaining: result.remaining });
    } catch (e) {
      const msg = String(e.message || '');
      if (msg.startsWith('OVER_QUOTA:')) return NextResponse.json({ error: `Only ${msg.split(':')[1]} left — fully claimed.` }, { status: 400 });
      if (msg === 'ITEM_NOT_FOUND') return NextResponse.json({ error: 'Gift item unavailable' }, { status: 404 });
      console.error('physical claim error', e);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
  }

  // MONEY / Angpau (immediate save; optional private proof).
  const amountRaw = form.get('amount');
  const amount = amountRaw != null && String(amountRaw).trim() !== '' ? String(amountRaw) : null;
  let proofUrl = null;
  const file = form.get('proof');
  if (file && typeof file !== 'string') {
    if (!ALLOWED_PROOF.includes(file.type)) return NextResponse.json({ error: 'Proof must be an image or PDF' }, { status: 400 });
    const buf = Buffer.from(await file.arrayBuffer());
    if (buf.byteLength > MAX_PROOF_BYTES) return NextResponse.json({ error: 'Proof file too large (max 8MB)' }, { status: 400 });
    const ext = (path.extname(file.name || '') || '.bin').toLowerCase();
    const relDir = path.join('gift-proofs', inv.userId, inv.id);
    const absDir = path.join(PRIVATE_ROOT, relDir);
    fs.mkdirSync(absDir, { recursive: true });
    const filename = `${Date.now()}-${nanoid(8)}${ext}`;
    fs.writeFileSync(path.join(absDir, filename), buf);
    proofUrl = path.join(relDir, filename); // private relative path (never a /storage-file URL)
  }
  await prisma.giftEntry.create({ data: { invitationId: inv.id, kind: 'MONEY', amount, giverName, notes: note, proofUrl } });
  return NextResponse.json({ ok: true });
}
