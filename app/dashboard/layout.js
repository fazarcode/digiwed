import { requireUser } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import UserSidebar from '@/components/dashboard/sidebar';
import UserHeader from '@/components/dashboard/header';

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }) {
  const session = await requireUser();
  const [invitationsRaw, userRow] = await Promise.all([
    prisma.invitation.findMany({
      where: { userId: session.user.id },
      select: { id: true, package: { select: { features: true } } },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { package: { select: { name: true, features: true } } },
    }),
  ]);
  const userPackage = userRow?.package || null;
  // Attach owner's package so effective-package logic (invitation.package ?? user.package) applies.
  const invitations = invitationsRaw.map((i) => ({ ...i, user: { package: userPackage } }));
  return (
    <div className="flex min-h-screen bg-[#FAF7F2]">
      <UserSidebar invitations={invitations} packageName={userPackage?.name || null} />
      <div className="flex-1 flex flex-col md:ml-64">
        <UserHeader user={session.user} />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
