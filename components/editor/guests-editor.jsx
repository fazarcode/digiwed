'use client';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy, Trash2, QrCode as QrIcon, Plus, Upload, Download, Users as UsersIcon, User } from 'lucide-react';

const SIDE_LABEL = { GROOM: "Groom's Side", BRIDE: "Bride's Side", BOTH: 'Both Sides', PARENTS: 'Parents' };
const GENDER_LABEL = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other' };

export default function GuestsEditor({ invitationId, slug }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '', guestType: 'INDIVIDUAL', quota: 1, gender: '', guestSide: '', categoryId: '' });
  const [importing, setImporting] = useState(false);
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => { load(); loadCategories(); }, []);
  const loadCategories = async () => {
    const res = await fetch('/api/categories');
    const data = await res.json();
    setCategories(data.items || []);
  };
  const load = async () => {
    const res = await fetch(`/api/invitations/${invitationId}/guests`);
    const data = await res.json();
    setItems(data.items || []);
  };

  const add = async () => {
    if (!form.name) return toast.error('Name is required');
    const payload = { ...form, gender: form.gender || null, guestSide: form.guestSide || null, categoryId: form.categoryId || null };
    const res = await fetch(`/api/invitations/${invitationId}/guests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) return toast.error('Failed');
    setForm({ name: '', phone: '', guestType: 'INDIVIDUAL', gender: '', guestSide: '', categoryId: '' });
    load();
    toast.success('Guest added');
  };
  const remove = async (id) => {
    if (!confirm('Delete this guest?')) return;
    await fetch(`/api/invitations/${invitationId}/guests/${id}`, { method: 'DELETE' });
    load();
  };
  const copyLink = (g) => { const q = g.nameSlug ? `?to=${encodeURIComponent(g.nameSlug)}` : `?guest=${g.token}`; navigator.clipboard.writeText(`${baseUrl}/invite/${slug}${q}`); toast.success('Guest link copied'); };

  const doImport = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setImporting(true);
    const fd = new FormData(); fd.append('file', f);
    const res = await fetch(`/api/invitations/${invitationId}/guests/import`, { method: 'POST', body: fd });
    const data = await res.json();
    setImporting(false); e.target.value = '';
    if (!res.ok) return toast.error(data.error || 'Import failed');
    toast.success(`Imported ${data.createdCount} guests${data.failedCount ? ` (${data.failedCount} failed)` : ''}`);
    load();
  };

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-semibold">Guests ({items.length})</h2>

      <div className="grid grid-cols-2 gap-2">
        <a href={`/api/invitations/${invitationId}/guests/import-template`} target="_blank"><Button size="sm" variant="outline" className="w-full"><Download className="h-3.5 w-3.5 mr-1"/>Excel Template</Button></a>
        <label className="w-full">
          <Button asChild size="sm" variant="outline" className="w-full" disabled={importing}><span><Upload className="h-3.5 w-3.5 mr-1"/>{importing ? 'Importing…' : 'Import Excel'}</span></Button>
          <input type="file" hidden accept=".xlsx,.xls" onChange={doImport} />
        </label>
      </div>

      <div className="rounded-lg border p-3 space-y-2">
        <Input placeholder="Guest Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <Input placeholder="Phone (optional)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <select value={form.guestType} onChange={e => setForm({ ...form, guestType: e.target.value, quota: e.target.value === 'GROUP' ? Math.max(form.quota, 2) : 1 })} className="h-9 px-2 rounded-md border text-sm">
            <option value="INDIVIDUAL">Individual</option>
            <option value="GROUP">Group</option>
          </select>
          <Input type="number" min={1} max={100} value={form.quota} onChange={e => setForm({ ...form, quota: parseInt(e.target.value, 10) || 1 })} placeholder="Quota" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })} className="h-9 px-2 rounded-md border text-sm">
            <option value="">— Category —</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="h-9 px-2 rounded-md border text-sm">
            <option value="">— Gender —</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </select>
          <select value={form.guestSide} onChange={e => setForm({ ...form, guestSide: e.target.value })} className="h-9 px-2 rounded-md border text-sm">
            <option value="">— Side —</option>
            <option value="GROOM">Groom</option>
            <option value="BRIDE">Bride</option>
            <option value="BOTH">Both</option>
            <option value="PARENTS">Parents</option>
          </select>
        </div>
        <Button size="sm" onClick={add} className="bg-primary w-full"><Plus className="h-4 w-4 mr-1"/>Add Guest</Button>
      </div>

      <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin">
        {items.map(g => (
          <div key={g.id} className="p-3 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  {g.guestType === 'GROUP' ? <UsersIcon className="h-3.5 w-3.5 text-primary flex-shrink-0"/> : <User className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0"/>}
                  <p className="font-medium text-sm truncate">{g.name}</p>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {g.category || '—'} • {g.gender ? GENDER_LABEL[g.gender] : '—'} • {g.guestSide ? SIDE_LABEL[g.guestSide] : '—'}
                </p>
                {g.phone && <p className="text-xs text-muted-foreground">{g.phone}</p>}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button size="sm" variant="ghost" onClick={() => copyLink(g)} title="Copy Link"><Copy className="h-3.5 w-3.5"/></Button>
                <a href={`/api/guests/${g.id}/qr`} target="_blank" rel="noopener"><Button size="sm" variant="ghost" title="QR Code"><QrIcon className="h-3.5 w-3.5"/></Button></a>
                <Button size="sm" variant="ghost" onClick={() => remove(g.id)}><Trash2 className="h-3.5 w-3.5 text-red-600"/></Button>
              </div>
            </div>
            {g.checkedInAt && (
              <p className="mt-1 text-xs text-emerald-700">
                ✓ Checked-in {g.guestType === 'GROUP' ? `× ${g.checkedInCount}` : ''} · first: {new Date(g.checkedInAt).toLocaleString()}
              </p>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No guests yet</p>}
      </div>
    </div>
  );
}
