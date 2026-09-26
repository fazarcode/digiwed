import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { DEFAULT_WHATSAPP_TEMPLATE } from '@/lib/whatsapp';

const schema = z.object({
  name: z.string().min(1).max(120),
  body: z.string().min(1),
  active: z.boolean().optional(),
});

// GET -> list current user's message templates. Lazily migrates the legacy single
// User.whatsappTemplate into a MessageTemplate row on first access.
export async function GET() {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let items = await prisma.messageTemplate.findMany({ where: { userId: s.user.id }, orderBy: { createdAt: 'asc' } });
  if (items.length === 0) {
    const user = await prisma.user.findUnique({ where: { id: s.user.id }, select: { whatsappTemplate: true } });
    const body = (user?.whatsappTemplate && user.whatsappTemplate.trim()) ? user.whatsappTemplate : DEFAULT_WHATSAPP_TEMPLATE;
    const created = await prisma.messageTemplate.create({ data: { userId: s.user.id, name: 'WhatsApp Default', body, active: true } });
    items = [created];
  }
  return NextResponse.json({ items });
}

// POST -> create a template for the current user.
export async function POST(request) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  const item = await prisma.messageTemplate.create({
    data: { userId: s.user.id, name: parsed.data.name, body: parsed.data.body, active: parsed.data.active ?? true },
  });
  return NextResponse.json({ item });
}
