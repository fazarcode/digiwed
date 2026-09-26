import prisma from '@/lib/prisma';
import SettingsForm from '@/components/admin/settings-form';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const settings = await prisma.setting.findMany();
  const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
  const templates = await prisma.template.findMany({ where: { enabled: true }, select: { id: true, name: true, slug: true } });
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-serif text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure platform-wide settings</p>
      </div>
      <SettingsForm initial={map} templates={templates} />
    </div>
  );
}
