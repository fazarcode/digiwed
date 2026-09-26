'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, Trash2, GripVertical, Link as LinkIcon } from 'lucide-react';

export default function GalleryEditor({ invitationId, initial, onChange }) {
  const [items, setItems] = useState(initial);
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const refresh = async () => {
    const res = await fetch(`/api/invitations/${invitationId}/gallery`);
    const data = await res.json();
    setItems(data.items || []);
    onChange?.();
  };

  const addUrl = async () => {
    if (!url) return;
    const res = await fetch(`/api/invitations/${invitationId}/gallery`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
    if (!res.ok) return toast.error('Failed');
    setUrl(''); refresh();
  };
  const uploadFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true);
    const fd = new FormData(); fd.append('file', f); fd.append('kind', 'image');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json(); setUploading(false);
    if (!res.ok) return toast.error(data.error || 'Upload failed');
    await fetch(`/api/invitations/${invitationId}/gallery`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: data.url }) });
    refresh();
    e.target.value = '';
  };
  const removeItem = async (id) => {
    await fetch(`/api/invitations/${invitationId}/gallery/${id}`, { method: 'DELETE' });
    refresh();
  };

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-semibold">Gallery</h2>
      <div className="rounded-lg border border-dashed p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Method 1 — Upload File</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <Button asChild variant="outline" size="sm" disabled={uploading}><span><Upload className="h-3.5 w-3.5 mr-1"/>{uploading ? 'Uploading…' : 'Choose Image'}</span></Button>
          <input type="file" accept="image/*" hidden onChange={uploadFile} />
        </label>
      </div>
      <div className="rounded-lg border border-dashed p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Method 2 — Paste Public URL</p>
        <div className="flex gap-2"><Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://... (Cloudinary, Google Drive, S3, etc.)" /><Button size="sm" onClick={addUrl}><LinkIcon className="h-3.5 w-3.5"/></Button></div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map(g => (
          <div key={g.id} className="relative group aspect-square rounded-lg overflow-hidden border">
            <img src={g.url} alt="" className="w-full h-full object-cover" />
            <button onClick={() => removeItem(g.id)} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><Trash2 className="h-3 w-3"/></button>
          </div>
        ))}
      </div>
    </div>
  );
}
