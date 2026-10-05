import Link from "next/link";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import {
  FileHeart,
  Users,
  MessageSquare,
  ScanLine,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const ATTENDANCE_LABEL = {
  ATTENDING: "Hadir",
  NOT_ATTENDING: "Tidak Hadir",
  MAYBE: "Belum Pasti",
};

export default async function UserDashboardPage() {
  const session = await auth();
  const userId = session.user.id;

  const [invitations, guests, rsvps, checkedIn, latestRsvps] =
    await Promise.all([
      prisma.invitation.count({ where: { userId } }),
      prisma.guest.count({ where: { invitation: { userId } } }),
      prisma.rsvp.count({ where: { invitation: { userId } } }),
      prisma.guest.count({
        where: { invitation: { userId }, checkedInAt: { not: null } },
      }),
      prisma.rsvp.findMany({
        where: { invitation: { userId } },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          invitation: { select: { brideName: true, groomName: true } },
        },
      }),
    ]);

  const stats = [
    {
      label: "Undangan",
      value: invitations,
      icon: FileHeart,
      color: "from-rose-500/20 to-rose-500/5",
      iconColor: "text-rose-700",
    },
    {
      label: "Tamu",
      value: guests,
      icon: Users,
      color: "from-amber-500/20 to-amber-500/5",
      iconColor: "text-amber-700",
    },
    {
      label: "RSVP Diterima",
      value: rsvps,
      icon: MessageSquare,
      color: "from-blue-500/20 to-blue-500/5",
      iconColor: "text-blue-700",
    },
    {
      label: "Sudah Check-in",
      value: checkedIn,
      icon: ScanLine,
      color: "from-emerald-500/20 to-emerald-500/5",
      iconColor: "text-emerald-700",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Kelola undangan, tamu, dan RSVP Anda
          </p>
        </div>
        <Link href="/dashboard/invitations/new">
          <Button className="bg-primary">
            <Plus className="h-4 w-4 mr-2" />
            Undangan Baru
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${s.color} border border-primary/10 p-6`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="font-serif text-4xl font-bold mt-2">{s.value}</p>
              </div>
              <div
                className={`h-12 w-12 rounded-full bg-white/70 flex items-center justify-center ${s.iconColor}`}
              >
                <s.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white border border-primary/10 p-6">
          <h2 className="font-serif text-xl font-semibold mb-4">
            RSVP Terbaru
          </h2>
          <div className="space-y-3">
            {latestRsvps.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Belum ada RSVP
              </p>
            )}
            {latestRsvps.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between py-2 border-b border-primary/5 last:border-0"
              >
                <div>
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    untuk {r.invitation.brideName} & {r.invitation.groomName} •{" "}
                    {r.rsvpType === "GROUP"
                      ? `+${r.guestCount - 1}`
                      : "Individu"}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${r.attendance === "ATTENDING" ? "bg-emerald-100 text-emerald-700" : r.attendance === "NOT_ATTENDING" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}
                >
                  {ATTENDANCE_LABEL[r.attendance] || r.attendance}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/10 p-6 flex flex-col justify-center items-center text-center">
          <Sparkles className="h-8 w-8 text-primary mb-3" />
          <h2 className="font-serif text-xl font-semibold">
            Buat Sesuatu yang Indah
          </h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Mulai dari template dan sesuaikan setiap detailnya
          </p>
          <Link href="/dashboard/invitations/new">
            <Button className="bg-primary">Buat Undangan</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
