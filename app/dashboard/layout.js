import { requireUser } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import UserSidebar, {
  SidebarProvider,
  BottomTabBar,
} from "@/components/dashboard/sidebar";
import UserHeader from "@/components/dashboard/header";

export const dynamic = "force-dynamic";

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
  // Sertakan paket milik user agar logika paket efektif (invitation.package ?? user.package) berlaku.
  const invitations = invitationsRaw.map((i) => ({
    ...i,
    user: { package: userPackage },
  }));
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-[#FAF7F2]">
        <UserSidebar
          invitations={invitations}
          packageName={userPackage?.name || null}
        />
        <div className="flex-1 min-w-0 flex flex-col lg:ml-[var(--sidebar-w,16rem)] transition-[margin] duration-200">
          <UserHeader user={session.user} />
          {/* pb-24: ruang untuk bar tab bawah di mobile/tablet */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 overflow-y-auto">
            {children}
          </main>
        </div>
        <BottomTabBar invitations={invitations} />
      </div>
    </SidebarProvider>
  );
}
