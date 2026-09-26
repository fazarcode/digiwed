import Link from 'next/link';
import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { Plus, Edit, Trash2, Eye, Copy, Send, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import InvitationRowActions from '@/components/dashboard/invitation-row-actions';

export const dynamic = 'force-dynamic';

export default async function InvitationsListPage() {
  const session = await auth();
  const invitations = await prisma.invitation.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      template: { select: { name: true } },
      _count: { select: { guests: true, rsvps: true } },
    },
  });
  const items = invitations.map(i => ({
    id: i.id, slug: i.slug, brideName: i.brideName, groomName: i.groomName,
    status: i.status, templateName: i.template?.name || '—',
    weddingDate: i.weddingDate?.toISOString() || null,
    guestCount: i._count.guests, rsvpCount: i._count.rsvps,
    updatedAt: i.updatedAt.toISOString(),
  }));
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">My Invitations</h1>
          <p className="text-muted-foreground mt-1">Create, edit and publish your wedding invitations</p>
        </div>
        <Link href="/dashboard/invitations/new"><Button className="bg-primary"><Plus className="h-4 w-4 mr-2"/>New Invitation</Button></Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-white border border-primary/10 p-16 text-center">
          <p className="font-serif text-xl mb-2">No invitations yet</p>
          <p className="text-muted-foreground mb-4">Create your first beautiful invitation to get started.</p>
          <Link href="/dashboard/invitations/new"><Button className="bg-primary">Create Now</Button></Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(i => (
            <div key={i.id} className="rounded-2xl bg-white border border-primary/10 overflow-hidden hover:shadow-lg transition">
              <div className="h-32 bg-gradient-to-br from-amber-100 via-rose-100 to-amber-200 relative">
                <div className="absolute inset-0 flex items-center justify-center text-center px-4">
                  <div>
                    <p className="font-script text-2xl text-primary">{i.brideName || 'Bride'} &amp; {i.groomName || 'Groom'}</p>
                  </div>
                </div>
                <span className={`absolute top-2 right-2 text-[10px] uppercase tracking-widest px-2 py-1 rounded-full ${i.status === 'PUBLISHED' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>{i.status}</span>
              </div>
              <div className="p-4">
                <div className="text-xs text-muted-foreground">Template: {i.templateName}</div>
                <div className="text-xs text-muted-foreground mt-1">{i.weddingDate ? new Date(i.weddingDate).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'No date set'}</div>
                <div className="flex gap-4 mt-2 text-xs">
                  <span>👥 {i.guestCount}</span>
                  <span>✉️ {i.rsvpCount}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  <Link href={`/dashboard/invitations/${i.id}/edit`}><Button size="sm" variant="outline"><Edit className="h-3.5 w-3.5 mr-1"/>Edit</Button></Link>
                  <a href={`/invite/${i.slug}?preview=1`} target="_blank" rel="noopener"><Button size="sm" variant="outline"><Eye className="h-3.5 w-3.5"/></Button></a>
                  <InvitationRowActions invitation={i} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
