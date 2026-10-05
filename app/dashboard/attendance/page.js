import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import CheckinAttendanceClient from "@/components/dashboard/checkin-attendance-client";

export const dynamic = "force-dynamic";

// Workspace Check-in & Kehadiran terpadu.
// Server component tetap mengambil data + izin akses, lalu menyerahkannya ke wrapper client
// yang berpindah mode kamera / device / manual di tempat (tab = state, tanpa navigasi).
export default async function AttendancePage({ searchParams }) {
  const sp = await searchParams;
  const initialMode = ["camera", "device", "manual"].includes(sp?.mode)
    ? sp.mode
    : "camera";

  const s = await auth();
  const userId = s.user.id;

  const [attInvitations, devices, categories, guestSides, checkinRaw] =
    await Promise.all([
      prisma.invitation.findMany({
        where: { userId },
        select: { id: true, brideName: true, groomName: true },
      }),
      prisma.device.findMany({
        where: { userId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, notes: true, active: true },
      }),
      // Kategori milik undangan user ini saja, urut sesuai antrian sapa TV
      prisma.guestCategory.findMany({
        where: {
          enabled: true,
          invitation: { userId },
        },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: { id: true, name: true, invitationId: true },
      }),
      // Sisi tamu milik undangan user ini
      prisma.guestSideOption.findMany({
        where: { enabled: true, invitation: { userId } },
        orderBy: [{ order: "asc" }],
        select: { id: true, name: true, invitationId: true },
      }),
      prisma.invitation.findMany({
        where: { userId },
        include: {
          _count: { select: { guests: true, checkIns: true } },
          guests: {
            select: {
              id: true,
              checkedInAt: true,
              checkedInCount: true,
              guestType: true,
            },
          },
        },
      }),
    ]);

  const checkinInvitations = checkinRaw.map((i) => ({
    id: i.id,
    brideName: i.brideName,
    groomName: i.groomName,
    totalGuests: i._count.guests,
    checkedIn: i.guests.filter((g) => g.checkedInAt).length,
    totalCheckIns: i._count.checkIns,
    selfieVerification: i.selfieVerification,
  }));
  const checkinDevices = devices
    .filter((d) => d.active)
    .map((d) => ({ id: d.id, name: d.name, notes: d.notes }));
  const attendanceDevices = devices.map((d) => ({ id: d.id, name: d.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">
          Check-in &amp; Kehadiran
        </h1>
        <p className="text-muted-foreground mt-1">
          Scan QR tamu lewat kamera atau device, atau kelola kehadiran secara
          manual — semuanya di satu tempat.
        </p>
      </div>
      <CheckinAttendanceClient
        initialMode={initialMode}
        checkinInvitations={checkinInvitations}
        checkinDevices={checkinDevices}
        attendanceInvitations={attInvitations}
        attendanceDevices={attendanceDevices}
        categories={categories}
        guestSides={guestSides}
      />
    </div>
  );
}
