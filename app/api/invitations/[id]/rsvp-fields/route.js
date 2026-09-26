import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

async function ownerCheck(userId, invitationId) {
  return prisma.invitation.findFirst({ where: { id: invitationId, userId }, select: { id: true } });
}

const FIELD_TYPES = ['text', 'textarea', 'email', 'phone', 'number', 'select', 'radio', 'checkbox'];
const schema = z.object({
  fieldKey: z.string().min(1).max(60).optional(),
  label: z.string().min(1).max(120),
  type: z.enum(FIELD_TYPES),
  placeholder: z.string().max(200).optional().nullable(),
  required: z.boolean().optional(),
  enabled: z.boolean().optional(),
  order: z.number().int().optional(),
  options: z.array(z.string()).optional().nullable(),
});

function keyify(s) {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60) || `field_${Date.now()}`;
}

// GET -> RSVP field definitions for an owned invitation.
export async function GET(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await ownerCheck(s.user.id, p.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const items = await prisma.rsvpField.findMany({ where: { invitationId: p.id }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
  return NextResponse.json({ items });
}

// POST -> create a new RSVP field.
export async function POST(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await ownerCheck(s.user.id, p.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  const d = parsed.data;
  const max = await prisma.rsvpField.aggregate({ where: { invitationId: p.id }, _max: { order: true } });
  const item = await prisma.rsvpField.create({
    data: {
      invitationId: p.id,
      fieldKey: keyify(d.fieldKey || d.label),
      label: d.label,
      type: d.type,
      placeholder: d.placeholder || null,
      required: d.required ?? false,
      enabled: d.enabled ?? true,
      order: d.order ?? ((max._max.order || 0) + 10),
      options: (['select', 'radio', 'checkbox'].includes(d.type) && d.options) ? d.options : null,
    },
  });
  return NextResponse.json({ item });
}
