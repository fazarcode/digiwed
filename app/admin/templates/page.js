import prisma from '@/lib/prisma';
import TemplatesManager from '@/components/admin/templates-manager';

export const dynamic = 'force-dynamic';

export default async function AdminTemplatesPage() {
  const templates = await prisma.template.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { invitations: true } } },
  });
  const serialized = templates.map(t => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
    previewImage: t.previewImage,
    enabled: t.enabled,
    invitationCount: t._count.invitations,
    createdAt: t.createdAt.toISOString(),
  }));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-bold">Templates</h1>
        <p className="text-muted-foreground mt-1">Upload and manage invitation templates (HTML/CSS/JS ZIP)</p>
      </div>
      <TemplatesManager initialTemplates={serialized} />
    </div>
  );
}
