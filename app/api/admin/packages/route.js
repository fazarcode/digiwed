import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { FEATURE_KEYS } from '@/lib/features';

async function requireAdmin() {
  const s = await auth();
  if (!s) return null;
  if (s.user.role !== 'ADMIN') return null;
  return s;
}

function sanitizeFeatures(input) {
  const out = {};
  if (input && typeof input === 'object') {
    for (const k of Object.keys(FEATURE_KEYS)) {
      out[k] = !!input[k];
    }
  } else {
    for (const k of Object.keys(FEATURE_KEYS)) out[k] = false;
  }
  return out;
}

export async function GET() {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const packages = await prisma.package.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { _count: { select: { invitations: true } } },
  });
  return NextResponse.json({ packages });
}

export async function POST(request) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  const pkg = await prisma.package.create({
    data: {
      name: body.name.trim(),
      description: body.description || null,
      status: body.status !== false,
      sortOrder: Number.isFinite(body.sortOrder) ? body.sortOrder : 0,
      price: body.price ? String(body.price) : null,
      features: sanitizeFeatures(body.features),
    },
  });
  return NextResponse.json({ package: pkg });
}
