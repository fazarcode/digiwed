'use client';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, FileText } from 'lucide-react';

export default function GiftTrackingClient({ invitations }) {
  const [invId, setInvId] = useState(invitations[0]?.id || '');
  const [entries, setEntries] = useState([]);
  const [totals, setTotals] = useState({ totalMoney: 0, goodsCount: 0 });
  const [physical, setPhysical] = useState([]);
  const [form, setForm] = useState({ kind: 'MONEY', giverName: '', amount: '', itemName: '', notes: '' });
  const [pForm, setPForm] = useState({ name: '', quota: 20, description: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!invId) return;
    try {
      const [a, b] = await Promise.all([
        fetch(`/api/invitations/${invId}/gift-entries`).then((r) => r.json()),
        fetch(`/api/invitations/${invId}/physical-gifts`).then((r) => r.json()),
      ]);
      setEntries(a.items || []);
      setTotals({ totalMoney: a.totalMoney || 0, goodsCount: a.goodsCount || 0 });
      setPhysical(b.items || []);
    } catch { toast.error('Failed to load'); }
  }, [invId]);
  useEffect(() => { load(); }, [load]);

  const addEntry = async () => {
    setBusy(true);
    try {
      const body = { kind: form.kind, giverName: form.giverName || null, notes: form.notes || null };
      if (form.kind === 'MONEY') body.amount = form.amount || null; else body.itemName = form.itemName || null;
      const r = await fetch(`/api/invitations/${invId}/gift-entries`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      toast.success('Gift recorded');
      setForm({ kind: 'MONEY', giverName: '', amount: '', itemName: '', notes: '' });
      load();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const delEntry = async (id) => { if (!confirm('Delete this gift record?')) return; await fetch(`/api/invitations/${invId}/gift-entries/${id}`, { method: 'DELETE' }); load(); };

  const addPhysical = async () => {
    if (!pForm.name.trim()) return toast.error('Item name required');
    const r = await fetch(`/api/invitations/${invId}/physical-gifts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pForm) });
    const d = await r.json();
    if (!r.ok) return toast.error(d.error || 'Failed');
    toast.success('Item added'); setPForm({ name: '', quota: 20, description: '' }); load();
  };
  const patchPhysical = async (id, body) => { const r = await fetch(`/api/invitations/${invId}/physical-gifts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const d = await r.json(); if (!r.ok) return toast.error(d.error || 'Failed'); load(); };
  const delPhysical = async (id) => { if (!confirm('Delete this item?')) return; await fetch(`/api/invitations/${invId}/physical-gifts/${id}`, { method: 'DELETE' }); load(); };

  if (invitations.length === 0) return <div className="rounded-2xl bg-white border p-12 text-center text-muted-foreground">Create an invitation first.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Label className="text-sm">Invitation</Label>
        <select value={invId} onChange={(e) => setInvId(e.target.value)} className="h-10 px-3 rounded-md border text-sm bg-white" data-testid="gt-invitation-select">
          {invitations.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white border p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Total Money</p><p className="font-serif text-3xl font-bold mt-1" data-testid="gt-total-money">{totals.totalMoney.toLocaleString()}</p></div>
        <div className="rounded-2xl bg-white border p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">Goods Records</p><p className="font-serif text-3xl font-bold mt-1">{totals.goodsCount}</p></div>
      </div>

      <div className="rounded-2xl bg-white border p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Add Gift Record</p>
        <div className="grid gap-3 sm:grid-cols-5">
          <div><Label>Type</Label><select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className="w-full h-10 px-3 rounded-md border text-sm bg-white" data-testid="gt-kind"><option value="MONEY">Money</option><option value="GOODS">Goods</option></select></div>
          <div><Label>Giver</Label><Input value={form.giverName} onChange={(e) => setForm({ ...form, giverName: e.target.value })} data-testid="gt-giver" /></div>
          {form.kind === 'MONEY'
            ? <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="gt-amount" /></div>
            : <div><Label>Item</Label><Input value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} data-testid="gt-item" /></div>}
          <div><Label>Note</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex items-end"><Button onClick={addEntry} disabled={busy} className="bg-primary w-full" data-testid="gt-add"><Plus className="h-4 w-4 mr-1" />Add</Button></div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Received Gifts</p>
        {entries.length === 0 ? <p className="text-sm text-muted-foreground">No gifts yet.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b"><th className="py-2">Giver</th><th>Type</th><th>Amount/Item</th><th>Proof</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b" data-testid={`gt-entry-${e.id}`}>
                  <td className="py-2">{e.giverName || e.guestName || 'Anonymous'}</td>
                  <td>{e.kind}</td>
                  <td>{e.kind === 'MONEY' ? (e.amount != null ? e.amount.toLocaleString() : '—') : `${e.itemName || ''}${e.quantity ? ` ×${e.quantity}` : ''}`}</td>
                  <td>{e.hasProof ? <a href={`/api/invitations/${invId}/gift-entries/${e.id}/proof`} target="_blank" rel="noopener" className="text-primary inline-flex items-center gap-1"><FileText className="h-3.5 w-3.5" />View</a> : '—'}</td>
                  <td>{new Date(e.createdAt).toLocaleDateString()}</td>
                  <td className="text-right"><Button size="sm" variant="ghost" onClick={() => delEntry(e.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-2xl bg-white border p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Physical Gift Items (guests claim on the invitation)</p>
        <div className="grid gap-3 sm:grid-cols-4 mb-4">
          <div className="sm:col-span-2"><Label>Item Name</Label><Input value={pForm.name} onChange={(e) => setPForm({ ...pForm, name: e.target.value })} placeholder="e.g. Rice 5kg" data-testid="pg-name" /></div>
          <div><Label>Quota</Label><Input type="number" min={0} value={pForm.quota} onChange={(e) => setPForm({ ...pForm, quota: parseInt(e.target.value, 10) || 0 })} data-testid="pg-quota" /></div>
          <div className="flex items-end"><Button onClick={addPhysical} className="bg-primary w-full" data-testid="pg-add"><Plus className="h-4 w-4 mr-1" />Add</Button></div>
        </div>
        {physical.length === 0 ? <p className="text-sm text-muted-foreground">No physical items.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b"><th className="py-2">Item</th><th>Quota</th><th>Claimed</th><th>Remaining</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {physical.map((x) => (
                <tr key={x.id} className="border-b" data-testid={`pg-row-${x.id}`}>
                  <td className="py-2 font-medium">{x.name}</td>
                  <td><Input type="number" min={x.claimed} defaultValue={x.quota} className="h-8 w-20" onBlur={(e) => { const v = parseInt(e.target.value, 10); if (v !== x.quota) patchPhysical(x.id, { quota: v }); }} /></td>
                  <td>{x.claimed}</td>
                  <td className="font-semibold" data-testid={`pg-remaining-${x.id}`}>{x.remaining}</td>
                  <td><input type="checkbox" checked={x.active} onChange={(e) => patchPhysical(x.id, { active: e.target.checked })} /></td>
                  <td className="text-right"><Button size="sm" variant="ghost" onClick={() => delPhysical(x.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
