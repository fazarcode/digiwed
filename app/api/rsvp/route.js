import { NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';

const schema = z.object({
  invitationId: z.string(),
  guestId: z.string().optional().nullable(),
  guestToken: z.string().optional().nullable(),
  name: z.string().min(1),
  attendance: z.enum(['ATTENDING', 'NOT_ATTENDING', 'MAYBE']).optional(),
  rsvpType: z.enum(['INDIVIDUAL', 'GROUP']).optional(),
  guestCount: z.number().int().min(1).max(50).optional(),
  message: z.string().optional().nullable(),
  messageOnly: z.boolean().optional(),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid data' }, { status: 400 });
    const d = parsed.data;

    const inv = await prisma.invitation.findUnique({ where: { id: d.invitationId }, select: { id: true, status: true, rsvpEnabled: true, messageEnabled: true } });
    if (!inv) return NextResponse.json({ ok: false, error: 'Invitation not found' }, { status: 404 });
    if (inv.status !== 'PUBLISHED') return NextResponse.json({ ok: false, error: 'Invitation is not accepting responses' }, { status: 400 });

    let guest = null;
    if (d.guestId) guest = await prisma.guest.findFirst({ where: { id: d.guestId, invitationId: d.invitationId } });
    else if (d.guestToken) guest = await prisma.guest.findFirst({ where: { token: d.guestToken, invitationId: d.invitationId } });

    // Phase 2 — MESSAGE-ONLY submission (independent from RSVP). Stored in the same Rsvp
    // table but flagged isMessageOnly so it never counts toward RSVP stats.
    if (d.messageOnly) {
      if (inv.messageEnabled === false) return NextResponse.json({ ok: false, error: 'Messages are turned off for this invitation' }, { status: 400 });
      const body2 = String(d.message || '').trim();
      if (!body2) return NextResponse.json({ ok: false, error: 'Message cannot be empty' }, { status: 400 });
      await prisma.rsvp.create({
        data: {
          invitationId: d.invitationId,
          guestId: guest ? guest.id : null,
          name: d.name,
          attendance: 'ATTENDING',
          rsvpType: 'INDIVIDUAL',
          guestCount: 1,
          message: body2,
          isMessageOnly: true,
        },
      });
      return NextResponse.json({ ok: true, messageOnly: true });
    }

    if (inv.rsvpEnabled === false) return NextResponse.json({ ok: false, error: 'RSVP is turned off for this invitation' }, { status: 400 });
    // Apply RSVP defaults (fields are optional in the schema now).
    d.attendance = d.attendance || 'ATTENDING';
    d.rsvpType = d.rsvpType || 'INDIVIDUAL';
    d.guestCount = d.guestCount || 1;

    // Feature H — collect + validate owner-configured custom fields (names prefixed cf_<key>).
    const fields = await prisma.rsvpField.findMany({ where: { invitationId: d.invitationId, enabled: true } });
    const customData = {};
    for (const f of fields) {
      const raw = body['cf_' + f.fieldKey];
      const val = raw == null ? '' : String(raw).trim();
      if (f.required && !val) {
        return NextResponse.json({ ok: false, error: `Please fill in: ${f.label}` }, { status: 400 });
      }
      if (val) customData[f.fieldKey] = val;
    }

    if (guest) {
      // Force rsvpType to match guest, cap count to quota
      if (guest.guestType === 'INDIVIDUAL') {
        d.rsvpType = 'INDIVIDUAL';
        const quota = guest.quota || 1;
        d.guestCount = Math.max(1, Math.min(d.guestCount || 1, quota));
        const existing = await prisma.rsvp.findFirst({ where: { guestId: guest.id, invitationId: d.invitationId, isMessageOnly: false } });
        if (existing) return NextResponse.json({ ok: false, error: 'You have already submitted an RSVP for this invitation.' }, { status: 400 });
      } else if (guest.guestType === 'GROUP') {
        d.rsvpType = 'GROUP';
        d.guestCount = Math.max(1, Math.min(d.guestCount || 1, (guest.quota || 50)));
      }
    } else {
      if (d.rsvpType === 'INDIVIDUAL') d.guestCount = Math.max(1, Math.min(d.guestCount || 1, 20));
    }

    await prisma.rsvp.create({
      data: {
        invitationId: d.invitationId,
        guestId: guest ? guest.id : null,
        name: d.name,
        attendance: d.attendance,
        rsvpType: d.rsvpType,
        guestCount: d.guestCount,
        message: d.message || null,
        customData: Object.keys(customData).length ? customData : undefined,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('RSVP submit error:', e);
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
