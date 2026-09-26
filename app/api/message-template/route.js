import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { DEFAULT_WHATSAPP_TEMPLATE } from '@/lib/whatsapp';

export async function GET() {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = await prisma.user.findUnique({
    where: { id: s.user.id },
    select: { whatsappTemplate: true },
  });
  return NextResponse.json({
    template: user?.whatsappTemplate || DEFAULT_WHATSAPP_TEMPLATE,
    defaultTemplate: DEFAULT_WHATSAPP_TEMPLATE,
    isCustom: !!user?.whatsappTemplate,
  });
}

export async function PUT(request) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const template = typeof body.template === 'string' ? body.template : null;
  await prisma.user.update({
    where: { id: s.user.id },
    data: { whatsappTemplate: template && template.trim() ? template : null },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  // Reset to default (null in DB means "use default")
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await prisma.user.update({ where: { id: s.user.id }, data: { whatsappTemplate: null } });
  return NextResponse.json({ ok: true, template: DEFAULT_WHATSAPP_TEMPLATE });
}
