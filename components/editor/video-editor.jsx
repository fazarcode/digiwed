'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, Trash2, Link as LinkIcon, Youtube } from 'lucide-react';

export default function VideoEditor({ invitationId, initial, onChange }) {
  const [items, setItems] = useState(initial);
  const [url, setUrl] = useState('');

  const refresh = async () => {
    const res = await fetch(`/api/invitations/${invitationId}/video`);
    const data = await res.json();
    setItems(data.items || []); onChange?.();
  };
  const add = async (u = url) => {
    if (!u) return;
    let type = 'MP4';
    if (u.includes('youtube') || u.includes('youtu.be')) type = 'YOUTUBE';
    else if (u.includes('vimeo')) type = 'VIMEO';
    await fetch(`/api/invitations/${invitationId}/video`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: u, type }) });
    setUrl(''); refresh();
  };
  const uploadFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append('file', f); fd.append('kind', 'video');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || 'Upload failed');
    await add(data.url); e.target.value = '';
  };
  const removeItem = async (id) => { await fetch(`/api/invitations/${invitationId}/video/${id}`, { method: 'DELETE' }); refresh(); };

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-semibold">Video</h2>
      <div className="rounded-lg border border-dashed p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Method 1 — Upload MP4</p>
        <label><Button asChild variant="outline" size="sm"><span><Upload className="h-3.5 w-3.5 mr-1"/>Choose Video File</span></Button><input type="file" accept="video/mp4,video/webm" hidden onChange={uploadFile} /></label>
      </div>
      <div className="rounded-lg border border-dashed p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Method 2 — YouTube / Vimeo / MP4 URL</p>
        <div className="flex gap-2"><Input value={url} onChange={e => setUrl(e.target.value)} placeholder="YouTube / Vimeo / MP4 URL" /><Button size="sm" onClick={() => add()}><LinkIcon className="h-3.5 w-3.5"/></Button></div>
      </div>
      <div className="space-y-2">
        {items.map(v => (
          <div key={v.id} className="flex items-center gap-2 p-2 border rounded-lg">
            <Youtube className="h-4 w-4 text-red-600" />
            <div className="flex-1 text-xs truncate">{v.url}</div>
            <span className="text-[10px] px-2 py-0.5 bg-muted rounded">{v.type}</span>
            <Button size="sm" variant="ghost" onClick={() => removeItem(v.id)}><Trash2 className="h-3.5 w-3.5"/></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
