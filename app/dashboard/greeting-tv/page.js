import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import GreetingTVSettings from "@/components/dashboard/greeting-tv-settings";

export const dynamic = "force-dynamic";

export default async function GreetingTVPage() {
  const s = await auth();

  const invitations = await prisma.invitation.findMany({
    where: {
      userId: s.user.id,
    },
    select: {
      id: true,
      brideName: true,
      groomName: true,
      slug: true,
      status: true,
      tvEnabled: true,
      tvBackground: true,
      tvCouplePhoto: true,
      tvLogo: true,
      tvDuration: true,
      tvSoundEnabled: true,
      tvAnimationEnabled: true,
      tvFontSize: true,
      tvFullscreen: true,
      tvCategoryColors: true,
      // Kategori milik undangan ini saja, urut sesuai antrian sapa TV
      guestCategories: {
        where: { enabled: true },
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          name: true,
          order: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">TV Sapaan Tamu</h1>

        <p className="text-muted-foreground mt-1">
          Atur layar sapaan TV/monitor di lokasi acara. Layar ini menampilkan
          setiap tamu saat mereka check-in.
        </p>
      </div>

      <GreetingTVSettings invitations={invitations} />
    </div>
  );
}
