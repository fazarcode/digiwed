// Phase 2 one-time backfill: give existing guests a trackingCode (GST-XX-0001)
// and a URL-safe nameSlug, scoped/unique per invitation. Idempotent — only fills
// rows where the value is still NULL. Run AFTER applying the migration:
//   node prisma/backfill_phase2.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function slugify(str) {
  return String(str || '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
function coupleInitials(b, g) {
  const a = String(b || '').trim().replace(/[^A-Za-z]/g, '').charAt(0);
  const c = String(g || '').trim().replace(/[^A-Za-z]/g, '').charAt(0);
  return (`${a}${c}`.toUpperCase()) || 'XX';
}

async function main() {
  const invitations = await prisma.invitation.findMany({ select: { id: true, brideName: true, groomName: true } });
  let filled = 0;
  for (const inv of invitations) {
    const initials = coupleInitials(inv.brideName, inv.groomName);
    const guests = await prisma.guest.findMany({
      where: { invitationId: inv.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, trackingCode: true, nameSlug: true },
    });
    // Seed max sequence + used slugs from already-populated rows.
    let seq = 0;
    const usedSlugs = new Set();
    for (const g of guests) {
      if (g.trackingCode) { const m = g.trackingCode.match(/-(\d+)$/); if (m) seq = Math.max(seq, parseInt(m[1], 10)); }
      if (g.nameSlug) usedSlugs.add(g.nameSlug);
    }
    for (const g of guests) {
      const data = {};
      if (!g.trackingCode) { seq += 1; data.trackingCode = `GST-${initials}-${String(seq).padStart(4, '0')}`; }
      if (!g.nameSlug) {
        const base = slugify(g.name) || 'guest';
        let cand = base, i = 1;
        while (usedSlugs.has(cand)) { i += 1; cand = `${base}-${i}`; }
        usedSlugs.add(cand);
        data.nameSlug = cand;
      }
      if (Object.keys(data).length) { await prisma.guest.update({ where: { id: g.id }, data }); filled += 1; }
    }
  }
  console.log(`Backfill complete. Updated ${filled} guest(s).`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
