import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

async function ownedField(userId, invitationId, fieldId) {
  return prisma.rsvpField.findFirst({ where: { id: fieldId, invitationId, invitation: { userId } }, select: { id: true } });
}

const FIELD_TYPES = ['text', 'textarea', 'email', 'phone', 'number', 'select', 'radio', 'checkbox'];
const patchSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  type: z.enum(FIELD_TYPES).optional(),
  placeholder: z.string().max(200).optional().nullable(),
  required: z.boolean().optional(),
  enabled: z.boolean().optional(),
  order: z.number().int().optional(),
  options: z.array(z.string()).optional().nullable(),
});

export async function PATCH(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await ownedField(s.user.id, p.id, p.fieldId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  const item = await prisma.rsvpField.update({ where: { id: p.fieldId }, data: parsed.data });
  return NextResponse.json({ item });
}

export async function DELETE(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await ownedField(s.user.id, p.id, p.fieldId))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await prisma.rsvpField.delete({ where: { id: p.fieldId } });
  return NextResponse.json({ ok: true });
}
