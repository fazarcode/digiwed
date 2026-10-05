import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import OwnerRatingForm from "@/components/dashboard/owner-rating-form";

export const dynamic = "force-dynamic";

export default async function OwnerRatingPage() {
  const s = await auth();

  const [existing, invitation] = await Promise.all([
    prisma.testimonial.findFirst({
      where: { userId: s.user.id },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findFirst({
      where: { userId: s.user.id },
      orderBy: { updatedAt: "desc" },
      select: { brideName: true, groomName: true },
    }),
  ]);

  const coupleName = invitation
    ? `${invitation.brideName || "Mempelai Wanita"} & ${invitation.groomName || "Mempelai Pria"}`
    : existing?.name || "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Rating Saya</h1>
        <p className="text-muted-foreground mt-1">
          Beri rating dan testimoni untuk layanan kami. Setiap pengguna hanya
          bisa memberi satu rating.
        </p>
      </div>
      {coupleName ? (
        <OwnerRatingForm
          initial={
            existing
              ? {
                  id: existing.id,
                  rating: existing.rating,
                  text: existing.text,
                }
              : null
          }
          coupleName={coupleName}
        />
      ) : (
        <div className="rounded-2xl bg-white border p-12 text-center">
          <p className="text-muted-foreground">
            Buat undangan terlebih dahulu agar nama pengantin bisa ditampilkan
            pada rating Anda.
          </p>
        </div>
      )}
    </div>
  );
}
