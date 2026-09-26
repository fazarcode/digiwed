import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

const schema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
});

export async function PATCH(request) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  const data = {};
  if (parsed.data.name) data.name = parsed.data.name;
  if (parsed.data.email) data.email = parsed.data.email;
  if (parsed.data.newPassword) {
    if (!parsed.data.currentPassword) return NextResponse.json({ error: 'Current password required' }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { id: s.user.id } });
    const ok = await bcrypt.compare(parsed.data.currentPassword, user.password);
    if (!ok) return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    data.password = await bcrypt.hash(parsed.data.newPassword, 10);
  }
  await prisma.user.update({ where: { id: s.user.id }, data });
  return NextResponse.json({ ok: true });
}
