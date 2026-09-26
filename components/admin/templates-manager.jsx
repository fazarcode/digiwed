'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Trash2, Eye, Power, PowerOff, Loader2, FileArchive, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function TemplatesManager({ initialTemplates }) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileRef = useRef(null);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) return toast.error('Please upload a .zip file');
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/admin/templates/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      toast.success(`Template "${data.template.name}" uploaded`);
      setTemplates(t => [{ ...data.template, invitationCount: 0 }, ...t.filter(x => x.id !== data.template.id)]);
      router.refresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const toggle = async (t) => {
    const res = await fetch(`/api/admin/templates/${t.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !t.enabled }) });
    if (!res.ok) return toast.error('Failed');
    setTemplates(ts => ts.map(x => x.id === t.id ? { ...x, enabled: !t.enabled } : x));
    toast.success(t.enabled ? 'Template disabled' : 'Template enabled');
  };

  const del = async (t) => {
    if (t.invitationCount > 0) return toast.error('Cannot delete: template is in use by invitations');
    if (!confirm(`Delete template "${t.name}"? Files will be removed.`)) return;
    const res = await fetch(`/api/admin/templates/${t.id}`, { method: 'DELETE' });
    if (!res.ok) return toast.error('Failed');
    setTemplates(ts => ts.filter(x => x.id !== t.id));
    toast.success('Template deleted');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border border-primary/10 p-6 border-dashed">
        <div className="flex flex-col items-center text-center py-8">
          <FileArchive className="h-10 w-10 text-primary mb-3" />
          <h3 className="font-serif text-xl font-semibold">Upload Template ZIP</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-md">Upload a ZIP containing <code className="bg-muted px-1.5 rounded">manifest.json</code>, <code className="bg-muted px-1.5 rounded">index.html</code>, optional <code className="bg-muted px-1.5 rounded">preview.jpg</code>, and <code className="bg-muted px-1.5 rounded">assets/</code>.</p>
          <input ref={fileRef} type="file" accept=".zip" hidden onChange={onUpload} />
          <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="bg-primary">
            {uploading ? <><Loader2 className="h-4 w-4 animate-spin mr-2"/>Uploading…</> : <><Upload className="h-4 w-4 mr-2" />Choose ZIP File</>}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map(t => (
          <div key={t.id} className={`rounded-2xl bg-white border overflow-hidden transition ${t.enabled ? 'border-primary/10' : 'border-red-200 opacity-70'}`}>
            <div className="aspect-video bg-gradient-to-br from-amber-100 to-amber-200 relative">
              {t.previewImage ? (
                <img src={`/storage-file/${t.previewImage}`} alt={t.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary/40 font-serif text-2xl">{t.name}</div>
              )}
              <span className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full ${t.enabled ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>{t.enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div className="p-4">
              <h3 className="font-serif text-lg font-semibold">{t.name}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{t.description || 'No description'}</p>
              <p className="text-xs text-muted-foreground mt-2">Used by {t.invitationCount} invitation(s)</p>
              <div className="flex gap-1 mt-3">
                <Button size="sm" variant="outline" onClick={() => setPreview(t)}><Eye className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="outline" title="Edit code" onClick={() => router.push(`/admin/templates/${t.id}/edit`)}><Code2 className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="outline" onClick={() => toggle(t)}>{t.enabled ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}</Button>
                <Button size="sm" variant="outline" onClick={() => del(t)}><Trash2 className="h-3.5 w-3.5 text-red-600" /></Button>
              </div>
            </div>
          </div>
        ))}
        {templates.length === 0 && <div className="col-span-full text-center text-muted-foreground py-12">No templates uploaded yet</div>}
      </div>

      <Dialog open={!!preview} onOpenChange={o => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b"><DialogTitle>{preview?.name} — Preview</DialogTitle></DialogHeader>
          {preview && <iframe src={`/api/admin/templates/${preview.id}/render`} className="w-full h-full border-0" title="Template preview" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
