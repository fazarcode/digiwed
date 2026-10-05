import prisma from "@/lib/prisma";
import NewInvitationForm from "@/components/dashboard/new-invitation-form";

export const dynamic = "force-dynamic";

export default async function NewInvitationPage() {
  const [templates, packages] = await Promise.all([
    prisma.template.findMany({
      where: { enabled: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.package.findMany({
      where: { status: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);
  const list = templates.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    previewImage: t.previewImage,
  }));
  const pkgs = packages.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    features: p.features || {},
  }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Buat Undangan Baru</h1>
        <p className="text-muted-foreground mt-1">
          Isi detail dasar — template akan ditentukan oleh administrator
        </p>
      </div>
      <NewInvitationForm templates={list} packages={pkgs} />
    </div>
  );
}
