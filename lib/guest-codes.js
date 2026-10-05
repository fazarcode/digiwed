// Phase 2 — guest tracking code (GST-XX-0001) + URL-safe name slug generation.
// These are SEPARATE from Guest.id and Guest.token and never replace them.
import { slugify } from '@/lib/slug';

// Initials from the couple/invitation names, e.g. "Ani" + "Malik" -> "AM".
export function coupleInitials(brideName, groomName) {
  const a = String(brideName || '').trim().replace(/[^A-Za-z]/g, '').charAt(0);
  const b = String(groomName || '').trim().replace(/[^A-Za-z]/g, '').charAt(0);
  const ini = `${a}${b}`.toUpperCase();
  return ini || 'XX';
}

export function formatTrackingCode(initials, n) {
  return `GST-${initials}-${String(n).padStart(4, '0')}`;
}

// Highest existing tracking-code sequence for an invitation (0 when none).
async function maxTrackingSeq(client, invitationId) {
  const rows = await client.guest.findMany({
    where: { invitationId, trackingCode: { not: null } },
    select: { trackingCode: true },
  });
  let max = 0;
  for (const r of rows) {
    const m = String(r.trackingCode || '').match(/-(\d+)$/);
    if (m) { const n = parseInt(m[1], 10); if (n > max) max = n; }
  }
  return max;
}

// Unique name slug within an invitation; collisions get -2, -3, ... suffixes.
export async function uniqueNameSlug(client, invitationId, name, excludeId = null) {
  const base = slugify(name) || 'guest';
  let candidate = base;
  let i = 1;
  // Bounded loop; wedding guest lists are small.
  while (i < 1000) {
    const existing = await client.guest.findFirst({
      where: {
        invitationId,
        nameSlug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    i += 1;
    candidate = `${base}-${i}`;
  }
  // Extremely unlikely fallback.
  return `${base}-${Date.now()}`;
}

// Compute both codes for a NEW guest. `bump` lets a caller retry on a unique
// constraint race by advancing the tracking-code sequence.
export async function assignGuestCodes(client, invitationId, name, brideName, groomName, bump = 0) {
  const initials = coupleInitials(brideName, groomName);
  const max = await maxTrackingSeq(client, invitationId);
  const trackingCode = formatTrackingCode(initials, max + 1 + bump);
  const nameSlug = await uniqueNameSlug(client, invitationId, name);
  return { trackingCode, nameSlug };
}
