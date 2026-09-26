import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';

async function requireAdmin() {
  const s = await auth();
  if (!s || s.user.role !== 'ADMIN') return null;
  return s;
}

export async function PATCH(request, { params }) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const p = await params;
  const body = await request.json();
  const { action } = body;
  try {
    if (action === 'suspend') {
      const u = await prisma.user.update({ where: { id: p.id }, data: { status: 'SUSPENDED' } });
      return NextResponse.json({ user: { status: u.status } });
    }
    if (action === 'activate') {
      const u = await prisma.user.update({ where: { id: p.id }, data: { status: 'ACTIVE' } });
      return NextResponse.json({ user: { status: u.status } });
    }
    if (action === 'edit') {
      const schema = z.object({ name: z.string().min(1), email: z.string().email(), role: z.enum(['USER', 'ADMIN']) });
      const parsed = schema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
      const role = await prisma.role.findUnique({ where: { name: parsed.data.role } });
      const u = await prisma.user.update({ where: { id: p.id }, data: { name: parsed.data.name, email: parsed.data.email, roleId: role.id } });
      return NextResponse.json({ user: { name: u.name, email: u.email } });
    }
    if (action === 'assignTemplate') {
      let templateId = body.templateId || null;
      if (templateId) {
        const tpl = await prisma.template.findUnique({ where: { id: templateId }, select: { id: true, enabled: true } });
        if (!tpl || !tpl.enabled) return NextResponse.json({ error: 'Selected template is not available' }, { status: 400 });
      }
      const u = await prisma.user.update({ where: { id: p.id }, data: { templateId } });
      return NextResponse.json({ user: { templateId: u.templateId } });
    }
    if (action === 'assignPackage') {
      let packageId = body.packageId || null;
      if (packageId) {
        const pkg = await prisma.package.findUnique({ where: { id: packageId }, select: { id: true, status: true } });
        if (!pkg || !pkg.status) return NextResponse.json({ error: 'Selected package is not available' }, { status: 400 });
      }
      const u = await prisma.user.update({ where: { id: p.id }, data: { packageId } });
      return NextResponse.json({ user: { packageId: u.packageId } });
    }
    if (action === 'reset') {
      if (!body.password || body.password.length < 6) return NextResponse.json({ error: 'Password too short' }, { status: 400 });
      const hash = await bcrypt.hash(body.password, 10);
      await prisma.user.update({ where: { id: p.id }, data: { password: hash } });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const p = await params;
  if (p.id === s.user.id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
  await prisma.user.delete({ where: { id: p.id } });
  return NextResponse.json({ ok: true });
}
