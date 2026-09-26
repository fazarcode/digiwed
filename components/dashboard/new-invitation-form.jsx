'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Req 3 — users no longer pick a template; it is inherited from the admin-assigned account template.
export default function NewInvitationForm() {
  const router = useRouter();
  const [brideName, setBrideName] = useState('');
  const [groomName, setGroomName] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brideName, groomName }) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return toast.error(data.error || 'Failed');
    toast.success('Invitation created');
    router.push(`/dashboard/invitations/${data.invitation.id}/edit`);
  };

  return (
    <form onSubmit={submit} className="space-y-6 max-w-2xl">
      <div className="rounded-2xl bg-white border border-primary/10 p-6">
        <h2 className="font-serif text-lg font-semibold mb-4">Basic Info</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label>Bride Name</Label><Input value={brideName} onChange={e => setBrideName(e.target.value)} placeholder="e.g. Amelia" required data-testid="new-bride-name" /></div>
          <div><Label>Groom Name</Label><Input value={groomName} onChange={e => setGroomName(e.target.value)} placeholder="e.g. Fazar" required data-testid="new-groom-name" /></div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">Your invitation design template is assigned by the administrator. You can customize all content in the editor.</p>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="bg-primary" data-testid="create-invitation-btn">{saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2"/>Creating…</> : 'Continue to Editor →'}</Button>
      </div>
    </form>
  );
}
