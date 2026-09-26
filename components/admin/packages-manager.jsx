'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Package as PackageIcon } from 'lucide-react';
import { FEATURE_KEYS, FEATURE_LABELS } from '@/lib/features';

function emptyFeatures() {
  const o = {};
  for (const k of Object.keys(FEATURE_KEYS)) o[k] = false;
  return o;
}

export default function PackagesManager({ initial }) {
  const router = useRouter();
  const [editing, setEditing] = useState(null); // null | {} for new | package for edit

  const openNew = () => setEditing({ name: '', description: '', status: true, sortOrder: (initial.length + 1) * 10, features: emptyFeatures() });
  const openEdit = (p) => setEditing({ ...p, features: { ...emptyFeatures(), ...(p.features || {}) } });

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      name: editing.name, description: editing.description, status: !!editing.status,
      sortOrder: parseInt(editing.sortOrder, 10) || 0, features: editing.features,
    };
    const url = editing.id ? `/api/admin/packages/${editing.id}` : '/api/admin/packages';
    const method = editing.id ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) { const err = await res.json().catch(() => ({})); return toast.error(err.error || 'Save failed'); }
    toast.success(editing.id ? 'Package updated' : 'Package created');
    setEditing(null);
    router.refresh();
  };

  const toggle = async (p) => {
    const res = await fetch(`/api/admin/packages/${p.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: !p.status }) });
    if (!res.ok) return toast.error('Toggle failed');
    router.refresh();
  };

  const del = async (p) => {
    if (!confirm(`Delete package "${p.name}"? ${p.usageCount ? `${p.usageCount} invitation(s) currently use it — they will revert to default (all features).` : ''}`)) return;
    const res = await fetch(`/api/admin/packages/${p.id}`, { method: 'DELETE' });
    if (!res.ok) return toast.error('Delete failed');
    toast.success('Package deleted');
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="bg-primary" onClick={openNew} data-testid="new-package-btn"><Plus className="h-4 w-4 mr-1.5" />New Package</Button>
      </div>

      {initial.length === 0 ? (
        <div className="rounded-2xl bg-white border p-12 text-center">
          <PackageIcon className="h-12 w-12 mx-auto text-primary/40 mb-3" />
          <p className="text-muted-foreground">No packages yet. Create your first tier to gate premium features.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-widest text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-2">Order</th>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Features</th>
                  <th className="px-4 py-2">Usage</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {initial.map(p => {
                  const active = Object.entries(p.features || {}).filter(([_, v]) => v).length;
                  const total = Object.keys(FEATURE_KEYS).length;
                  return (
                    <tr key={p.id} className="border-t" data-testid={`package-row-${p.id}`}>
                      <td className="px-4 py-3 font-mono text-xs">{p.sortOrder}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">{p.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1 max-w-[280px]">{p.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">{active}/{total} enabled</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.usageCount} invitations</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Switch checked={p.status} onCheckedChange={() => toggle(p)} data-testid={`toggle-package-${p.id}`} />
                          <span className={`text-xs ${p.status ? 'text-emerald-700' : 'text-muted-foreground'}`}>{p.status ? 'Active' : 'Inactive'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(p)} data-testid={`edit-package-${p.id}`}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => del(p)} data-testid={`delete-package-${p.id}`}><Trash2 className="h-3.5 w-3.5 text-red-600" /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {editing && (
            <form onSubmit={submit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>{editing.id ? 'Edit Package' : 'New Package'}</DialogTitle>
                <DialogDescription>Set feature toggles. Users will see only the menus their package allows.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} data-testid="package-name" />
                </div>
                <div>
                  <Label>Sort Order</Label>
                  <Input type="number" value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: e.target.value })} data-testid="package-sort" />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea rows={2} value={editing.description || ''} onChange={(e) => setEditing({ ...editing, description: e.target.value })} data-testid="package-description" />
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <Switch checked={!!editing.status} onCheckedChange={(v) => setEditing({ ...editing, status: v })} data-testid="package-status" />
                <span className="text-sm">Package is active (users can select it)</span>
              </div>

              <div>
                <Label className="mb-2 block">Features</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 rounded-lg border p-3 max-h-72 overflow-y-auto">
                  {Object.keys(FEATURE_KEYS).map(k => (
                    <label key={k} className="flex items-center gap-2 text-sm cursor-pointer p-1.5 rounded hover:bg-muted">
                      <input type="checkbox"
                             checked={!!editing.features[k]}
                             onChange={(e) => setEditing({ ...editing, features: { ...editing.features, [k]: e.target.checked } })}
                             data-testid={`feature-${k}`} />
                      <span>{FEATURE_LABELS[k]}</span>
                    </label>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button type="submit" className="bg-primary" data-testid="save-package-btn">{editing.id ? 'Save Changes' : 'Create Package'}</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
