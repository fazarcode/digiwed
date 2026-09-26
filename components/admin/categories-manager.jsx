'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowUp, ArrowDown, GripVertical, Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function CategoriesManager({ initial }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);

  const add = async () => {
    if (!name.trim()) return toast.error('Name required');
    const res = await fetch('/api/admin/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    setName('');
    setItems(l => [...l, { ...data.item, guestCount: 0 }].sort((a, b) => a.order - b.order));
    toast.success('Category added');
  };

  const update = async (id, patch) => {
    const res = await fetch(`/api/admin/categories/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    setItems(l => l.map(c => c.id === id ? { ...c, ...data.item } : c));
  };

  const move = async (id, dir) => {
    const idx = items.findIndex(c => c.id === id);
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= items.length) return;
    const next = [...items];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setItems(next);
    const res = await fetch('/api/admin/categories/reorder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderedIds: next.map(c => c.id) }) });
    if (!res.ok) toast.error('Failed to reorder');
  };

  const del = async (c) => {
    if (c.guestCount > 0 && !confirm(`"${c.name}" is used by ${c.guestCount} guest(s). Delete anyway? Their category will be cleared.`)) return;
    if (c.guestCount === 0 && !confirm(`Delete category "${c.name}"?`)) return;
    const res = await fetch(`/api/admin/categories/${c.id}`, { method: 'DELETE' });
    if (!res.ok) return toast.error('Failed');
    setItems(l => l.filter(x => x.id !== c.id));
    toast.success('Deleted');
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await update(editing.id, { name: fd.get('name') });
    setEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border p-4">
        <div className="flex gap-2">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="New category name (e.g. VIP)" onKeyDown={e => e.key === 'Enter' && add()} />
          <Button onClick={add} className="bg-primary"><Plus className="h-4 w-4 mr-1"/>Add</Button>
        </div>
      </div>

      <div className="rounded-2xl bg-white border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3 w-16">Order</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Guests</th>
              <th className="px-4 py-3">Enabled</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((c, i) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => move(c.id, 'up')} title="Move up"><ArrowUp className="h-3.5 w-3.5"/></Button>
                    <Button size="sm" variant="ghost" disabled={i === items.length - 1} onClick={() => move(c.id, 'down')} title="Move down"><ArrowDown className="h-3.5 w-3.5"/></Button>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3">{c.guestCount}</td>
                <td className="px-4 py-3">
                  <Switch checked={c.enabled} onCheckedChange={(v) => update(c.id, { enabled: v })} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(c)}><Pencil className="h-3.5 w-3.5"/></Button>
                    <Button size="sm" variant="ghost" onClick={() => del(c)}><Trash2 className="h-3.5 w-3.5 text-red-600"/></Button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No categories yet</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Category</DialogTitle></DialogHeader>
          {editing && <form onSubmit={saveEdit} className="space-y-3">
            <div><Label>Name</Label><Input name="name" defaultValue={editing.name} required autoFocus /></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit">Save</Button></DialogFooter>
          </form>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
