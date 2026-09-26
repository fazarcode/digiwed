import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import ProfileForm from '@/components/dashboard/profile-form';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const s = await auth();
  const user = await prisma.user.findUnique({ where: { id: s.user.id } });
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-serif text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account information</p>
      </div>
      <ProfileForm user={{ id: user.id, name: user.name, email: user.email }} />
    </div>
  );
}
