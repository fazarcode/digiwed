import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

// GET query params: invitationId, status (all|CHECKED_IN|NOT_CHECKED_IN), q, deviceId, categoryId
// Returns UNION of checked-in guests (as check-in records) + not-yet-checked-in guests (as pseudo rows).
export async function GET(request) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const url = new URL(request.url);
  const invitationId = url.searchParams.get('invitationId');
  const status = url.searchParams.get('status') || 'all';
  const q = (url.searchParams.get('q') || '').trim();
  const deviceId = url.searchParams.get('deviceId');
  const categoryId = url.searchParams.get('categoryId');

  // Query all guests owned by this user (with optional filters), including their check-ins
  const guestWhere = { invitation: { userId: s.user.id } };
  if (invitationId) guestWhere.invitationId = invitationId;
  if (q) guestWhere.name = { contains: q };
  if (categoryId) guestWhere.categoryId = categoryId;

  const guests = await prisma.guest.findMany({
    where: guestWhere,
    include: {
      category: { select: { name: true } },
      invitation: { select: { brideName: true, groomName: true } },
      checkIns: {
        where: deviceId ? { deviceId } : undefined,
        include: { device: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const items = [];
  for (const g of guests) {
    if (g.checkIns.length > 0) {
      // Emit one row per check-in (most recent first)
      for (const ci of g.checkIns) {
        items.push({
          id: `ci-${ci.id}`,
          guestId: g.id,
          guestToken: g.token,
          guestName: g.name,
          guestType: g.guestType,
          category: g.category?.name || g.categoryText || null,
          categoryId: g.categoryId,
          attendees: ci.count || 1,
          status: 'CHECKED_IN',
          checkedInAt: ci.createdAt.toISOString(),
          operatorName: ci.operatorName || null,
          deviceName: ci.device?.name || null,
          selfieUrl: ci.selfieUrl || null,
          invitation: g.invitation,
        });
      }
    } else {
      // No check-in yet
      items.push({
        id: `g-${g.id}`,
        guestId: g.id,
        guestToken: g.token,
        guestName: g.name,
        guestType: g.guestType,
        category: g.category?.name || g.categoryText || null,
        categoryId: g.categoryId,
        attendees: 0,
        status: 'NOT_CHECKED_IN',
        checkedInAt: null,
        operatorName: null,
        deviceName: null,
        selfieUrl: null,
        invitation: g.invitation,
      });
    }
  }

  // Status filter
  const filtered = items.filter(x => status === 'all' || x.status === status);
  // Sort by latest check-in (CHECKED_IN first sorted by time desc, then NOT_CHECKED_IN)
  filtered.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'CHECKED_IN' ? -1 : 1;
    if (a.status === 'CHECKED_IN') return new Date(b.checkedInAt) - new Date(a.checkedInAt);
    return 0;
  });

  const totalAttendees = filtered.filter(x => x.status === 'CHECKED_IN').reduce((s, x) => s + (x.attendees || 1), 0);
  const totalCheckedIn = filtered.filter(x => x.status === 'CHECKED_IN').length;
  const totalNotCheckedIn = filtered.filter(x => x.status === 'NOT_CHECKED_IN').length;

  return NextResponse.json({ items: filtered, totalAttendees, totalCheckedIn, totalNotCheckedIn, count: filtered.length });
}
