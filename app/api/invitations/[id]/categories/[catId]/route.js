import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

// A category is editable/deletable by the user only if it is invitation-specific AND owned.
async function ownedCategory(userId, invitationId, catId) {
  return prisma.guestCategory.findFirst({
    where: { id: catId, invitationId, invitation: { userId } },
    include: { _count: { select: { guests: true } } },
  });
}

const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  order: z.number().int().optional(),
  enabled: z.boolean().optional(),
  priority: z.number().int().optional(),
});

export async function PATCH(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  const cat = await ownedCategory(s.user.id, p.id, p.catId);
  if (!cat) return NextResponse.json({ error: 'Not found or not editable (global categories are admin-managed).' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  try {
    const item = await prisma.guestCategory.update({ where: { id: p.catId }, data: parsed.data });
    return NextResponse.json({ item });
  } catch (e) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'A category with this name already exists for this invitation.' }, { status: 400 });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE -> blocked if guests still use it (unless ?reassignTo=<catId|null> provided).
export async function DELETE(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  const cat = await ownedCategory(s.user.id, p.id, p.catId);
  if (!cat) return NextResponse.json({ error: 'Not found or not deletable (global categories are admin-managed).' }, { status: 404 });

  const reassignTo = new URL(request.url).searchParams.get('reassignTo');
  if (cat._count.guests > 0) {
    if (reassignTo === null) {
      return NextResponse.json({ error: 'Category is in use', guestCount: cat._count.guests, needsReassign: true }, { status: 409 });
    }
    // reassignTo === 'null' means unassign; otherwise validate the target belongs to same scope.
    let newCatId = null;
    if (reassignTo && reassignTo !== 'null') {
      const target = await prisma.guestCategory.findFirst({
        where: { id: reassignTo, OR: [{ invitationId: null }, { invitationId: p.id }] }, select: { id: true },
      });
      if (!target) return NextResponse.json({ error: 'Invalid reassignment target' }, { status: 400 });
      newCatId = target.id;
    }
    await prisma.guest.updateMany({ where: { invitationId: p.id, categoryId: p.catId }, data: { categoryId: newCatId } });
  }
  await prisma.guestCategory.delete({ where: { id: p.catId } });
  return NextResponse.json({ ok: true });
}
