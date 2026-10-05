import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import DomainSettingsClient from "@/components/dashboard/domain-settings-client";

export const dynamic = "force-dynamic";

export default async function DomainPage() {
  const s = await auth();
  const invitations = await prisma.invitation.findMany({
    where: { userId: s.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      brideName: true,
      groomName: true,
      customDomain: true,
      subdomain: true,
      status: true,
    },
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Pengaturan Domain</h1>
        <p className="text-muted-foreground mt-1">
          Atur bagaimana tamu membuka undangan Anda — lewat slug, subdomain,
          atau domain kustom Anda sendiri.
        </p>
      </div>
      <DomainSettingsClient invitations={invitations} />
    </div>
  );
}
