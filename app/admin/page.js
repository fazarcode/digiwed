import prisma from '@/lib/prisma';
import { Users, FileText, CheckCircle2, PenLine, TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [totalUsers, totalInvitations, published, drafts, latestInvitations, latestUsers] = await Promise.all([
    prisma.user.count(),
    prisma.invitation.count(),
    prisma.invitation.count({ where: { status: 'PUBLISHED' } }),
    prisma.invitation.count({ where: { status: 'DRAFT' } }),
    prisma.invitation.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { user: true } }),
    prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { role: true } }),
  ]);

  const stats = [
    { label: 'Total Users', value: totalUsers, icon: Users, color: 'from-amber-500/20 to-amber-500/5', iconColor: 'text-amber-700' },
    { label: 'Total Invitations', value: totalInvitations, icon: FileText, color: 'from-emerald-500/20 to-emerald-500/5', iconColor: 'text-emerald-700' },
    { label: 'Published', value: published, icon: CheckCircle2, color: 'from-blue-500/20 to-blue-500/5', iconColor: 'text-blue-700' },
    { label: 'Drafts', value: drafts, icon: PenLine, color: 'from-rose-500/20 to-rose-500/5', iconColor: 'text-rose-700' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your invitation platform</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${s.color} border border-primary/10 p-6`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="font-serif text-4xl font-bold mt-2">{s.value}</p>
              </div>
              <div className={`h-12 w-12 rounded-full bg-white/70 flex items-center justify-center ${s.iconColor}`}>
                <s.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white border border-primary/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-semibold">Latest Invitations</h2>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {latestInvitations.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No invitations yet</p>}
            {latestInvitations.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-primary/5 last:border-0">
                <div>
                  <p className="font-medium">{inv.brideName || 'Untitled'} & {inv.groomName || 'Untitled'}</p>
                  <p className="text-xs text-muted-foreground">by {inv.user.name} • {new Date(inv.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${inv.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{inv.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-primary/10 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl font-semibold">Latest Users</h2>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="space-y-3">
            {latestUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b border-primary/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-semibold">{u.name?.[0]?.toUpperCase() || 'U'}</div>
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">{u.role.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
