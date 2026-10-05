// lib/quota.js
// Validasi kuota kehadiran. Hanya aktif jika invitation.quotaMode === "STRICT".
// Mengembalikan string pesan error, atau null jika lolos.
export async function checkQuota(
  prisma,
  { guest, invitation, newCount, excludeCheckInId },
) {
  if (!invitation || invitation.quotaMode !== "STRICT") return null;

  const agg = await prisma.checkIn.aggregate({
    _sum: { count: true },
    where: {
      guestId: guest.id,
      ...(excludeCheckInId ? { id: { not: excludeCheckInId } } : {}),
    },
  });
  const used = agg._sum.count || 0;
  const remaining = (guest.quota || 1) - used;

  if (remaining <= 0)
    return `Kuota ${guest.name} sudah penuh (${used}/${guest.quota})`;
  if (newCount > remaining) return `Melebihi kuota. Sisa kuota: ${remaining}`;
  return null;
}

/* ============================================================
   CONTOH PEMASANGAN DI ROUTE (sesuaikan nama variabel)
   ============================================================

   // 1) POST /api/guests/lookup/checkin
   //    (setelah guest ditemukan, sebelum membuat CheckIn)
   //    Pastikan guest di-include: invitation { select: { id, quotaMode, selfieVerification } }
   const err = await checkQuota(prisma, {
     guest,
     invitation: guest.invitation,
     newCount: count,
   });
   if (err) return NextResponse.json({ error: err, guest }, { status: 409 });

   // 2) PATCH /api/attendance/[id]
   //    Ambil checkIn dengan include: { guest: { include: { invitation: true } } }
   const err = await checkQuota(prisma, {
     guest: checkIn.guest,
     invitation: checkIn.guest.invitation,
     newCount: count,
     excludeCheckInId: checkIn.id,
   });
   if (err) return NextResponse.json({ error: err }, { status: 409 });

   // 3) GET /api/guests/lookup/checkin?token=...
   //    Kembalikan guest.invitation.quotaMode dan guest.checkedInCount.

   // 4) Route update undangan: izinkan field "quotaMode" ("STRICT" | "FLEXIBLE").

   // 5) DELETE tamu (single & bulk) — hapus eksplisit dalam satu transaksi:
   await prisma.$transaction([
     prisma.rsvp.deleteMany({ where: { guestId: { in: ids } } }),
     prisma.giftEntry.deleteMany({ where: { guestId: { in: ids } } }),
     prisma.souvenirDistribution.deleteMany({ where: { guestId: { in: ids } } }),
     prisma.guest.deleteMany({ where: { id: { in: ids } } }),
   ]);

   // 6) (Opsional) DELETE /api/attendance/[id]: hapus juga
   //    giftEntry & souvenirDistribution dengan checkInId yang sama.
*/
