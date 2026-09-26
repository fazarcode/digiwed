import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { FEATURE_KEYS } from '@/lib/features';

async function requireAdmin() {
  const s = await auth();
  if (!s || s.user.role !== 'ADMIN') return null;
  return s;
}

function sanitizeFeatures(input) {
  const out = {};
  if (input && typeof input === 'object') {
    for (const k of Object.keys(FEATURE_KEYS)) out[k] = !!input[k];
  } else {
    for (const k of Object.keys(FEATURE_KEYS)) out[k] = false;
  }
  return out;
}

export async function GET(request, { params }) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const p = await params;
  const pkg = await prisma.package.findUnique({ where: { id: p.id } });
  if (!pkg) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ package: pkg });
}

export async function PUT(request, { params }) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const p = await params;
  const body = await request.json();
  const data = {};
  if (typeof body.name === 'string' && body.name.trim()) data.name = body.name.trim();
  if (body.description !== undefined) data.description = body.description || null;
  if (body.status !== undefined) data.status = !!body.status;
  if (Number.isFinite(body.sortOrder)) data.sortOrder = body.sortOrder;
  if (body.price !== undefined) data.price = body.price ? String(body.price) : null;
  if (body.features !== undefined) data.features = sanitizeFeatures(body.features);
  const pkg = await prisma.package.update({ where: { id: p.id }, data });
  return NextResponse.json({ package: pkg });
}

export async function DELETE(request, { params }) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const p = await params;
  await prisma.package.delete({ where: { id: p.id } });
  return NextResponse.json({ ok: true });
}
