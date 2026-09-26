'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Tv, ExternalLink, Copy, Loader2, Upload } from 'lucide-react';

const PREVIEW_FONT = { small: 20, medium: 26, large: 34, xlarge: 44 };

export default function GreetingTVSettings({ invitations }) {
  const [selectedId, setSelectedId] = useState(invitations[0]?.id || '');
  const [invs, setInvs] = useState(invitations);
  const [saving, setSaving] = useState(false);
  const selected = invs.find(i => i.id === selectedId);
  const tvUrl = typeof window !== 'undefined' && selected ? `${window.location.origin}/tv/${selected.id}` : '';

  const update = (patch) => setInvs(list => list.map(i => i.id === selectedId ? { ...i, ...patch } : i));

  const save = async () => {
    setSaving(true);
    const res = await fetch(`/api/tv/${selectedId}/settings`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tvEnabled: selected.tvEnabled, tvBackground: selected.tvBackground, tvCouplePhoto: selected.tvCouplePhoto, tvLogo: selected.tvLogo,
        tvDuration: selected.tvDuration, tvSoundEnabled: selected.tvSoundEnabled, tvAnimationEnabled: selected.tvAnimationEnabled,
        tvFontSize: selected.tvFontSize, tvFullscreen: selected.tvFullscreen,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast.error('Save failed');
    toast.success('Settings saved');
  };

  const uploadFile = (field) => async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append('file', f); fd.append('kind', 'image');
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) { e.target.value = ''; return toast.error(data.error || 'Upload failed'); }
    update({ [field]: data.url });
    // Auto-persist so uploaded media is saved immediately (fixes bug where Save was skipped)
    try {
      const saveRes = await fetch(`/api/tv/${selectedId}/settings`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: data.url }),
      });
      if (!saveRes.ok) throw new Error();
      toast.success('Uploaded and saved');
    } catch { toast.error('Uploaded but auto-save failed \u2014 click Save Settings'); }
    e.target.value = '';
  };

  if (!invitations.length) return <div className="rounded-2xl bg-white border p-12 text-center"><p className="text-muted-foreground">Create an invitation first.</p></div>;
  if (!selected) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      <div className="lg:col-span-1 rounded-2xl bg-white border p-4 space-y-1 h-fit">
        <p className="text-xs uppercase tracking-widest text-muted-foreground px-2 pb-2">Your Invitations</p>
        {invs.map(i => (
          <button key={i.id} onClick={() => setSelectedId(i.id)} className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${selectedId === i.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
            <p className="font-medium">{i.brideName} & {i.groomName}</p>
            <p className="text-xs opacity-70">{i.tvEnabled ? '◉ TV Enabled' : 'TV Disabled'}</p>
          </button>
        ))}
      </div>
      <div className="lg:col-span-3 space-y-4">
        <div className="rounded-2xl bg-white border p-6 space-y-5">
          <div className="flex items-start gap-3 border-b pb-4">
            <input type="checkbox" checked={!!selected.tvEnabled} onChange={e => update({ tvEnabled: e.target.checked })} className="mt-1 h-4 w-4" id="tv-en" />
            <label htmlFor="tv-en" className="flex-1 cursor-pointer">
              <span className="font-medium">Enable Greeting TV</span>
              <p className="text-xs text-muted-foreground">When enabled, real-time check-in events are pushed to the TV page.</p>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Display Duration (seconds)</Label><Input type="number" min={3} max={60} value={selected.tvDuration} onChange={e => update({ tvDuration: parseInt(e.target.value, 10) || 7 })} /></div>
            <div>
              <Label>Font Size</Label>
              <select value={selected.tvFontSize} onChange={e => update({ tvFontSize: e.target.value })} className="w-full h-10 px-3 rounded-md border text-sm">
                <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option><option value="xlarge">Extra Large</option>
              </select>
            </div>
            <div className="flex items-start gap-2"><input type="checkbox" checked={!!selected.tvSoundEnabled} onChange={e => update({ tvSoundEnabled: e.target.checked })} id="tv-sound" /><label htmlFor="tv-sound" className="text-sm">Enable Sound (chime on new guest)</label></div>
            <div className="flex items-start gap-2"><input type="checkbox" checked={!!selected.tvAnimationEnabled} onChange={e => update({ tvAnimationEnabled: e.target.checked })} id="tv-anim" /><label htmlFor="tv-anim" className="text-sm">Enable Animations</label></div>
            <div className="flex items-start gap-2"><input type="checkbox" checked={!!selected.tvFullscreen} onChange={e => update({ tvFullscreen: e.target.checked })} id="tv-fs" /><label htmlFor="tv-fs" className="text-sm">Auto-request Full Screen mode</label></div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[{ field: 'tvBackground', label: 'Background Image' }, { field: 'tvCouplePhoto', label: 'Couple Photo / Banner' }, { field: 'tvLogo', label: 'Event Logo' }].map(({ field, label }) => (
              <div key={field}>
                <Label>{label}</Label>
                <div className="flex gap-1">
                  <Input value={selected[field] || ''} onChange={e => update({ [field]: e.target.value })} placeholder="URL or upload" />
                  <label><Button asChild size="sm" variant="outline"><span><Upload className="h-3.5 w-3.5"/></span></Button><input type="file" hidden accept="image/*" onChange={uploadFile(field)} /></label>
                </div>
                {selected[field] && <img src={selected[field]} alt="" className="mt-2 rounded h-20 object-cover w-full" />}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-2 text-sm">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">TV Screen URL</p>
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded">{tvUrl}</code>
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(tvUrl); toast.success('URL copied'); }}><Copy className="h-3.5 w-3.5"/></Button>
                <a href={tvUrl} target="_blank" rel="noopener"><Button size="sm" variant="outline"><ExternalLink className="h-3.5 w-3.5 mr-1"/>Open TV</Button></a>
              </div>
            </div>
            <Button onClick={save} disabled={saving} className="bg-primary">{saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2"/>Saving…</> : <><Tv className="h-4 w-4 mr-2"/>Save Settings</>}</Button>
          </div>
        </div>

        {/* Req 8 — live preview driven by local form state (not saved data) */}
        <div className="rounded-2xl bg-white border p-4" data-testid="tv-live-preview">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Live Preview</p>
          <div
            className="relative rounded-xl overflow-hidden aspect-video bg-cover bg-center flex items-center justify-center text-center text-white"
            style={selected.tvBackground ? { backgroundImage: `url(${selected.tvBackground})` } : { background: 'linear-gradient(135deg,#1a0f08,#3a2418,#5a3820)' }}
          >
            {selected.tvBackground && <div className="absolute inset-0 bg-black/40" />}
            {selected.tvLogo && <img src={selected.tvLogo} alt="" className="absolute top-3 left-3 h-8 z-10" />}
            <div className="relative z-10 px-6 py-4">
              {selected.tvCouplePhoto && <img src={selected.tvCouplePhoto} alt="" className="mx-auto max-h-28 rounded-xl mb-3 shadow-2xl" />}
              <p style={{ fontFamily: 'Great Vibes, cursive' }} className="text-2xl text-amber-200">The Wedding of</p>
              <p style={{ fontFamily: 'Playfair Display, serif', fontSize: PREVIEW_FONT[selected.tvFontSize] || PREVIEW_FONT.large }} className="tracking-widest font-bold leading-tight">
                {selected.brideName || 'Bride'} &amp; {selected.groomName || 'Groom'}
              </p>
              <div className="mt-3 inline-flex items-center gap-3 text-[11px] text-amber-100/80">
                <span>⏱ {selected.tvDuration || 7}s / guest</span>
                <span>{selected.tvSoundEnabled ? '🔊 Sound' : '🔇 Muted'}</span>
                <span>{selected.tvAnimationEnabled ? '✨ Animated' : 'Static'}</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">This mirrors the idle TV screen. Guest greetings appear live as they check in.</p>
          <style jsx global>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Great+Vibes&display=swap');`}</style>
        </div>
      </div>
    </div>
  );
}
