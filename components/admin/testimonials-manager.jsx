'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, Star } from 'lucide-react';

export default function TestimonialsManager({ initial, endpoint = '/api/admin/testimonials' }) {
  const [items, setItems] = useState(initial || []);
  const [form, setForm] = useState({ name: '', text: '', rating: 5, order: 0 });
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!form.name.trim() || !form.text.trim()) return toast.error('Name and text required');
    setBusy(true);
    try {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      setItems((l) => [...l, d.item]);
      setForm({ name: '', text: '', rating: 5, order: 0 });
      toast.success('Added');
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const patch = async (id, body) => {
    const r = await fetch(`${endpoint}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) return toast.error(d.error || 'Failed');
    setItems((l) => l.map((x) => (x.id === id ? d.item : x)));
  };
  const del = async (id) => { if (!confirm('Delete testimonial?')) return; await fetch(`${endpoint}/${id}`, { method: 'DELETE' }); setItems((l) => l.filter((x) => x.id !== id)); };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Add Testimonial</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <div><Label>Client Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="tm-name" /></div>
          <div><Label>Rating (1-5)</Label><Input type="number" min={1} max={5} value={form.rating} onChange={(e) => setForm({ ...form, rating: parseInt(e.target.value, 10) || 5 })} data-testid="tm-rating" /></div>
          <div><Label>Order</Label><Input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: parseInt(e.target.value, 10) || 0 })} /></div>
          <div className="flex items-end"><Button onClick={add} disabled={busy} className="bg-primary w-full" data-testid="tm-add"><Plus className="h-4 w-4 mr-1" />Add</Button></div>
          <div className="sm:col-span-4"><Label>Testimonial Text</Label><Textarea rows={2} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} data-testid="tm-text" /></div>
        </div>
      </div>
      <div className="rounded-2xl bg-white border p-5">
        {items.length === 0 ? <p className="text-sm text-muted-foreground">No testimonials yet.</p> : (
          <div className="space-y-3">
            {items.map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-3 border-b pb-3" data-testid={`tm-row-${t.id}`}>
                <div>
                  <div className="flex items-center gap-2"><span className="font-medium">{t.name}</span><span className="flex text-amber-500">{Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5" fill="currentColor" />)}</span></div>
                  <p className="text-sm text-muted-foreground italic">&ldquo;{t.text}&rdquo;</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={t.active} onChange={(e) => patch(t.id, { active: e.target.checked })} />Active</label>
                  <Button size="sm" variant="ghost" onClick={() => del(t.id)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
