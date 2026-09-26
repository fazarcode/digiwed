import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/rbac';
import prisma from '@/lib/prisma';
import TemplateCodeEditor from '@/components/admin/template-code-editor';

export const dynamic = 'force-dynamic';

export default async function TemplateEditPage({ params }) {
  await requireAdmin();
  const p = await params;
  const template = await prisma.template.findUnique({ where: { id: p.id } });
  if (!template) notFound();
  return (
    <TemplateCodeEditor
      template={{ id: template.id, name: template.name, folderPath: template.folderPath }}
    />
  );
}
