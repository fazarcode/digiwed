import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { makeGuestToken } from '@/lib/slug';
import { assignGuestCodes } from '@/lib/guest-codes';

async function guard(id, userId) { return prisma.invitation.findFirst({ where: { id, userId }, select: { id: true } }); }

export async function GET(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await guard(p.id, s.user.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const items = await prisma.guest.findMany({
    where: { invitationId: p.id },
    orderBy: { createdAt: 'desc' },
    include: { category: { select: { id: true, name: true } }, side: { select: { id: true, name: true } }, _count: { select: { checkIns: true, rsvps: true } } },
  });
  const mapped = items.map(g => ({
    id: g.id, name: g.name, phone: g.phone, token: g.token,
    trackingCode: g.trackingCode, nameSlug: g.nameSlug,
    guestType: g.guestType, gender: g.gender, guestSide: g.guestSide,
    categoryId: g.categoryId, category: g.category?.name || g.categoryText || null,
    sideId: g.sideId, sideName: g.side?.name || null,
    checkedInAt: g.checkedInAt, checkedInCount: g.checkedInCount,
    checkInCount: g._count.checkIns, rsvpCount: g._count.rsvps,
    createdAt: g.createdAt,
  }));
  return NextResponse.json({ items: mapped });
}

export async function POST(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await guard(p.id, s.user.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await request.json();
  const { name, phone, category, categoryId, guestType = 'INDIVIDUAL', gender, guestSide, sideId, quota, priorityOverride } = body;
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
  if (!['INDIVIDUAL', 'GROUP'].includes(guestType)) return NextResponse.json({ error: 'Invalid guestType' }, { status: 400 });
  if (gender && !['MALE', 'FEMALE', 'OTHER'].includes(gender)) return NextResponse.json({ error: 'Invalid gender' }, { status: 400 });
  if (guestSide && !['GROOM', 'BRIDE', 'BOTH', 'PARENTS'].includes(guestSide)) return NextResponse.json({ error: 'Invalid guestSide' }, { status: 400 });

  const parsedQuota = parseInt(quota, 10);
  const finalQuota = Number.isFinite(parsedQuota) && parsedQuota >= 1 && parsedQuota <= 100 ? parsedQuota : (guestType === 'GROUP' ? 2 : 1);
  const pr = parseInt(priorityOverride, 10);
  const finalPriority = Number.isFinite(pr) && pr >= 1 && pr <= 999 ? pr : null;

  // Resolve categoryId: accept explicit categoryId, else look up by name, else store legacy free text
  let resolvedCategoryId = null;
  let legacyText = null;
  if (categoryId) {
    const cat = await prisma.guestCategory.findUnique({ where: { id: categoryId } });
    if (cat) resolvedCategoryId = cat.id;
  } else if (category) {
    const cat = await prisma.guestCategory.findUnique({ where: { name: category } });
    if (cat) resolvedCategoryId = cat.id;
    else legacyText = category;
  }

  // Req 5 — DB-driven guest side (validated to belong to this invitation)
  let resolvedSideId = null;
  if (sideId) {
    const side = await prisma.guestSideOption.findFirst({ where: { id: sideId, invitationId: p.id }, select: { id: true } });
    if (side) resolvedSideId = side.id;
  }

  const invMeta = await prisma.invitation.findUnique({ where: { id: p.id }, select: { brideName: true, groomName: true } });

  let guest = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const { trackingCode, nameSlug } = await assignGuestCodes(prisma, p.id, name, invMeta?.brideName, invMeta?.groomName, attempt);
    try {
      guest = await prisma.guest.create({
        data: {
          invitationId: p.id,
          name, phone: phone || null,
          guestType, gender: gender || null, guestSide: guestSide || null,
          sideId: resolvedSideId,
          quota: finalQuota, priorityOverride: finalPriority,
          categoryId: resolvedCategoryId, categoryText: legacyText,
          token: makeGuestToken(),
          trackingCode, nameSlug,
        },
      });
      break;
    } catch (e) {
      if (e.code === 'P2002' && attempt < 5) continue; // unique race on trackingCode/nameSlug -> retry
      throw e;
    }
  }
  return NextResponse.json({ item: guest });
}
