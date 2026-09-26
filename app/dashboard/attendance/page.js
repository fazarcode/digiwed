import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import CheckinAttendanceClient from '@/components/dashboard/checkin-attendance-client';

export const dynamic = 'force-dynamic';

// Unified Check-in & Attendance workspace (Feature 3).
// Server component keeps the existing data-fetch + permissions, then hands data to a client
// wrapper that swaps camera / device / manual modes IN PLACE (tabs = state, no navigation).
export default async function AttendancePage({ searchParams }) {
  const sp = await searchParams;
  const initialMode = ['camera', 'device', 'manual'].includes(sp?.mode) ? sp.mode : 'camera';

  const s = await auth();
  const userId = s.user.id;

  const [attInvitations, devices, categories, checkinRaw] = await Promise.all([
    prisma.invitation.findMany({ where: { userId }, select: { id: true, brideName: true, groomName: true } }),
    prisma.device.findMany({ where: { userId }, orderBy: { name: 'asc' }, select: { id: true, name: true, notes: true, active: true } }),
    prisma.guestCategory.findMany({ where: { enabled: true }, orderBy: [{ order: 'asc' }], select: { id: true, name: true } }),
    prisma.invitation.findMany({
      where: { userId },
      include: {
        _count: { select: { guests: true, checkIns: true } },
        guests: { select: { id: true, checkedInAt: true, checkedInCount: true, guestType: true } },
      },
    }),
  ]);

  // Camera/Device modes reuse the existing check-in-client shape.
  const checkinInvitations = checkinRaw.map((i) => ({
    id: i.id, brideName: i.brideName, groomName: i.groomName,
    totalGuests: i._count.guests,
    checkedIn: i.guests.filter((g) => g.checkedInAt).length,
    totalCheckIns: i._count.checkIns,
    selfieVerification: i.selfieVerification,
  }));
  const checkinDevices = devices.filter((d) => d.active).map((d) => ({ id: d.id, name: d.name, notes: d.notes }));
  const attendanceDevices = devices.map((d) => ({ id: d.id, name: d.name }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Check-in &amp; Attendance</h1>
        <p className="text-muted-foreground mt-1">Scan guest QR via camera or device, or manage attendance manually — all in one place.</p>
      </div>
      <CheckinAttendanceClient
        initialMode={initialMode}
        checkinInvitations={checkinInvitations}
        checkinDevices={checkinDevices}
        attendanceInvitations={attInvitations}
        attendanceDevices={attendanceDevices}
        categories={categories}
      />
    </div>
  );
}
