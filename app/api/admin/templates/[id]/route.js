import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

const STORAGE_ROOT = process.env.STORAGE_ROOT || '/app/digital-invitation-platform/storage';

async function guard() {
  const s = await auth();
  if (!s || s.user.role !== 'ADMIN') return null;
  return s;
}

export async function PATCH(request, { params }) {
  if (!(await guard())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const p = await params;
  const body = await request.json();
  const data = {};
  if (typeof body.enabled === 'boolean') data.enabled = body.enabled;
  if (typeof body.featured === 'boolean') data.featured = body.featured;
  if (typeof body.name === 'string') data.name = body.name;
  if (typeof body.description === 'string') data.description = body.description;
  const template = await prisma.template.update({ where: { id: p.id }, data });
  return NextResponse.json({ template });
}

export async function DELETE(request, { params }) {
  if (!(await guard())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const p = await params;
  const tpl = await prisma.template.findUnique({ where: { id: p.id }, include: { _count: { select: { invitations: true } } } });
  if (!tpl) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (tpl._count.invitations > 0) return NextResponse.json({ error: 'Template is in use' }, { status: 400 });
  const dir = path.join(STORAGE_ROOT, tpl.folderPath);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  await prisma.template.delete({ where: { id: p.id } });
  return NextResponse.json({ ok: true });
}
