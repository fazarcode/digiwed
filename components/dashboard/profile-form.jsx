'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function ProfileForm({ user }) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, currentPassword: currentPwd || undefined, newPassword: newPwd || undefined }) });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return toast.error(data.error || 'Failed');
    toast.success('Profile updated');
    setCurrentPwd(''); setNewPwd('');
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="rounded-2xl bg-white border p-6 space-y-4">
        <h2 className="font-serif text-lg font-semibold">Account Information</h2>
        <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} required /></div>
        <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
      </div>
      <div className="rounded-2xl bg-white border p-6 space-y-4">
        <h2 className="font-serif text-lg font-semibold">Change Password</h2>
        <p className="text-xs text-muted-foreground">Leave blank to keep current password</p>
        <div><Label>Current Password</Label><Input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} /></div>
        <div><Label>New Password</Label><Input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} minLength={6} /></div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="bg-primary">{saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2"/>Saving…</> : 'Save Changes'}</Button>
      </div>
    </form>
  );
}
