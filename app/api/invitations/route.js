import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { makeUniqueSlug } from '@/lib/slug';

const createSchema = z.object({
  brideName: z.string().min(1),
  groomName: z.string().min(1),
});

export async function POST(request) {
  const session = await auth();
  if (!session || session.user.role !== 'USER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  // Req 3 — template is admin-assigned per user; client cannot pick it. Fall back to any enabled template.
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { templateId: true } });
  let template = null;
  if (user?.templateId) {
    template = await prisma.template.findFirst({ where: { id: user.templateId, enabled: true }, select: { id: true } });
  }
  if (!template) {
    template = await prisma.template.findFirst({ where: { enabled: true }, orderBy: { createdAt: 'asc' }, select: { id: true } });
  }
  if (!template) return NextResponse.json({ error: 'No template assigned to your account. Please contact your administrator.' }, { status: 400 });
  const slug = makeUniqueSlug(`${parsed.data.brideName}-${parsed.data.groomName}`);
  const invitation = await prisma.invitation.create({
    data: {
      userId: session.user.id,
      templateId: template.id,
      slug,
      brideName: parsed.data.brideName,
      groomName: parsed.data.groomName,
    },
  });
  return NextResponse.json({ invitation: { id: invitation.id, slug: invitation.slug } });
}
