'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, Trash2, Music } from 'lucide-react';

export default function MusicEditor({ invitationId, initial, onChange }) {
  const [music, setMusic] = useState(initial);
  const [url, setUrl] = useState(initial?.url || '');
  const [title, setTitle] = useState(initial?.title || '');

  const save = async (u = url, t = title) => {
    const res = await fetch(`/api/invitations/${invitationId}/music`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: u, title: t }) });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || 'Failed');
    setMusic(data.music); onChange?.();
    toast.success('Music saved');
  };
  const uploadFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append('file', f); fd.append('kind', 'audio');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || 'Upload failed');
    setUrl(data.url); await save(data.url, title); e.target.value = '';
  };
  const remove = async () => {
    await fetch(`/api/invitations/${invitationId}/music`, { method: 'DELETE' });
    setMusic(null); setUrl(''); setTitle(''); onChange?.();
  };

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-semibold">Background Music</h2>
      <div className="rounded-lg border border-dashed p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Method 1 — Upload MP3</p>
        <label><Button asChild variant="outline" size="sm"><span><Upload className="h-3.5 w-3.5 mr-1"/>Choose MP3 File</span></Button><input type="file" accept="audio/mpeg,audio/mp3" hidden onChange={uploadFile} /></label>
      </div>
      <div className="rounded-lg border border-dashed p-4 space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Method 2 — MP3 URL</p>
        <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://.../song.mp3" />
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Song title (optional)" />
        <Button size="sm" onClick={() => save()}>Save</Button>
      </div>
      {music && (
        <div className="p-3 bg-primary/5 rounded-lg flex items-center gap-3">
          <Music className="h-5 w-5 text-primary" />
          <div className="flex-1 text-xs truncate">{music.title || music.url}</div>
          <audio src={music.url} controls className="h-8" />
          <Button size="sm" variant="ghost" onClick={remove}><Trash2 className="h-3.5 w-3.5"/></Button>
        </div>
      )}
    </div>
  );
}
