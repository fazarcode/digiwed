import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import RsvpList from "@/components/dashboard/rsvp-list";

export const dynamic = "force-dynamic";

export default async function RsvpPage({ searchParams }) {
  const s = await auth();
  const params = await searchParams;

  const attendanceFilter = params?.attendance || "ALL";
  const invitationFilter = params?.invitationId || "ALL";
  const searchQuery = params?.search || ""; // Tangkap parameter pencarian
  const currentPage = Number(params?.page) || 1;
  const limit = 10;
  const skip = (currentPage - 1) * limit;

  // 1. Ambil list undangan untuk dropdown
  const userInvitations = await prisma.invitation.findMany({
    where: { userId: s.user.id },
    select: { id: true, brideName: true, groomName: true },
  });

  // 2. Buat kondisi filter utama (Where Clause)
  const whereClause = {
    invitation: { userId: s.user.id },
    isMessageOnly: false,
  };

  if (attendanceFilter !== "ALL") whereClause.attendance = attendanceFilter;
  if (invitationFilter !== "ALL") whereClause.invitationId = invitationFilter;

  // Jika ada input search, cari berdasarkan nama tamu
  if (searchQuery) {
    whereClause.name = {
      contains: searchQuery,
    };
  }

  // 3. Ambil data RSVP dengan Pagination
  const rsvps = await prisma.rsvp.findMany({
    where: whereClause,
    include: {
      invitation: { select: { brideName: true, groomName: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: skip,
    take: limit,
  });

  // 4. Hitung total data untuk pagination (sesuai filter & search)
  const totalRsvpsCount = await prisma.rsvp.count({
    where: whereClause,
  });
  const totalPages = Math.ceil(totalRsvpsCount / limit);

  // 5. Kalkulasi statistik Dashboard (Abaikan pencarian agar statistik total tetap akurat)
  const statsWhereClause = { invitation: { userId: s.user.id }, isMessageOnly: false };
  if (invitationFilter !== "ALL")
    statsWhereClause.invitationId = invitationFilter;

  const allRsvpsForStats = await prisma.rsvp.findMany({
    where: statsWhereClause,
    select: { attendance: true, guestCount: true },
  });

  const stats = {
    total: allRsvpsForStats.length,
    attending: allRsvpsForStats.filter((r) => r.attendance === "ATTENDING")
      .length,
    notAttending: allRsvpsForStats.filter(
      (r) => r.attendance === "NOT_ATTENDING",
    ).length,
    maybe: allRsvpsForStats.filter((r) => r.attendance === "MAYBE").length,
    totalGuests: allRsvpsForStats
      .filter((r) => r.attendance === "ATTENDING")
      .reduce((sum, r) => sum + r.guestCount, 0),
  };

  // 6. Phase 2 — load messages/wishes (separate from RSVP layout) for the management area.
  const messagesWhere = { invitation: { userId: s.user.id }, message: { not: null } };
  if (invitationFilter !== "ALL") messagesWhere.invitationId = invitationFilter;
  const messageRows = await prisma.rsvp.findMany({
    where: messagesWhere,
    include: { invitation: { select: { brideName: true, groomName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const messages = messageRows
    .filter((m) => String(m.message || "").trim() !== "")
    .map((m) => ({
      id: m.id,
      name: m.name,
      message: m.message,
      isMessageOnly: m.isMessageOnly,
      createdAt: m.createdAt,
      invitation: m.invitation,
    }));

  // 7. Lempar semua data ke Komponen UI
  return (
    <RsvpList
      rsvps={rsvps}
      messages={messages}
      stats={stats}
      userInvitations={userInvitations}
      currentPage={currentPage}
      totalPages={totalPages}
      totalRsvpsCount={totalRsvpsCount}
      attendanceFilter={attendanceFilter}
      invitationFilter={invitationFilter}
      searchQuery={searchQuery}
      skip={skip}
      limit={limit}
    />
  );
}
