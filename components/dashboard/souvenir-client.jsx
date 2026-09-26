'use client';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, PackageOpen } from 'lucide-react';

export default function SouvenirClient({ invitations }) {
  const [invId, setInvId] = useState(invitations[0]?.id || '');
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', quota: 100 });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!invId) return;
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        fetch(`/api/invitations/${invId}/souvenirs`).then((r) => r.json()),
        fetch(`/api/invitations/${invId}/souvenir-distributions`).then((r) => r.json()),
      ]);
      setItems(a.items || []);
      setHistory(b.items || []);
    } catch { toast.error('Failed to load'); } finally { setLoading(false); }
  }, [invId]);
  useEffect(() => { load(); }, [load]);

  const add = async () => {
    if (!form.name.trim()) return toast.error('Name required');
    setBusy(true);
    try {
      const r = await fetch(`/api/invitations/${invId}/souvenirs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      toast.success('Souvenir added');
      setForm({ name: '', description: '', quota: 100 });
      load();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const patch = async (id, body) => {
    const r = await fetch(`/api/invitations/${invId}/souvenirs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) return toast.error(d.error || 'Failed');
    load();
  };
  const del = async (id) => { if (!confirm('Delete souvenir? Distribution history will also be removed.')) return; await fetch(`/api/invitations/${invId}/souvenirs/${id}`, { method: 'DELETE' }); load(); };

  if (invitations.length === 0) return <div className="rounded-2xl bg-white border p-12 text-center text-muted-foreground">Create an invitation first.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Label className="text-sm">Invitation</Label>
        <select value={invId} onChange={(e) => setInvId(e.target.value)} className="h-10 px-3 rounded-md border text-sm bg-white" data-testid="sv-invitation-select">
          {invitations.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>

      <div className="rounded-2xl bg-white border p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Add Souvenir</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mug" data-testid="sv-name" /></div>
          <div><Label>Quota</Label><Input type="number" min={0} value={form.quota} onChange={(e) => setForm({ ...form, quota: parseInt(e.target.value, 10) || 0 })} data-testid="sv-quota" /></div>
          <div className="flex items-end"><Button onClick={add} disabled={busy} className="bg-primary w-full" data-testid="sv-add"><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          <div className="sm:col-span-4"><Label>Description (optional)</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Souvenirs</p>
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : items.length === 0 ? <p className="text-sm text-muted-foreground">No souvenirs yet.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b"><th className="py-2">Name</th><th>Quota</th><th>Distributed</th><th>Remaining</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id} className="border-b" data-testid={`sv-row-${x.id}`}>
                  <td className="py-2 font-medium">{x.name}</td>
                  <td><Input type="number" min={x.distributed} defaultValue={x.quota} className="h-8 w-20" onBlur={(e) => { const v = parseInt(e.target.value, 10); if (v !== x.quota) patch(x.id, { quota: v }); }} /></td>
                  <td data-testid={`sv-distributed-${x.id}`}>{x.distributed}</td>
                  <td className="font-semibold" data-testid={`sv-remaining-${x.id}`}>{x.remaining}</td>
                  <td><input type="checkbox" checked={x.active} onChange={(e) => patch(x.id, { active: e.target.checked })} /></td>
                  <td className="text-right"><Button size="sm" variant="ghost" onClick={() => del(x.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-2xl bg-white border p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Distribution History</p>
        {history.length === 0 ? <p className="text-sm text-muted-foreground">No distributions yet.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b"><th className="py-2">Guest</th><th>Souvenir</th><th>Qty</th><th>Operator</th><th>Date</th></tr></thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-b"><td className="py-2">{h.guestName || 'Anonymous'}</td><td>{h.souvenirName}</td><td>{h.quantity}</td><td>{h.operatorName || '—'}</td><td>{new Date(h.updatedAt).toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
