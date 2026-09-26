'use client';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function SettingsForm({ initial, templates }) {
  const [values, setValues] = useState({
    website_name: initial.website_name || 'Wedding Invitation Platform',
    logo_url: initial.logo_url || '',
    default_theme: initial.default_theme || (templates[0]?.slug || ''),
    social_instagram: initial.social_instagram || '',
    social_facebook: initial.social_facebook || '',
    social_tiktok: initial.social_tiktok || '',
    social_youtube: initial.social_youtube || '',
    social_whatsapp: initial.social_whatsapp || '',
  });
  const [saving, setSaving] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
    setSaving(false);
    if (!res.ok) return toast.error('Failed to save');
    toast.success('Settings saved');
  };
  const set = (k) => (e) => setValues({ ...values, [k]: e.target.value });

  return (
    <form onSubmit={save} className="rounded-2xl bg-white border border-primary/10 p-8 space-y-5">
      <div>
        <Label>Website Name</Label>
        <Input value={values.website_name} onChange={set('website_name')} />
      </div>
      <div>
        <Label>Logo URL</Label>
        <Input value={values.logo_url} onChange={set('logo_url')} placeholder="https://…" />
        {values.logo_url && <img src={values.logo_url} alt="Logo" className="mt-2 h-12" />}
      </div>
      <div>
        <Label>Default Theme (Template)</Label>
        <select value={values.default_theme} onChange={set('default_theme')} className="w-full h-10 px-3 rounded-md border">
          {templates.map(t => <option key={t.id} value={t.slug}>{t.name}</option>)}
        </select>
      </div>
      <div className="pt-2 border-t">
        <p className="text-sm font-semibold mb-3">Website Information / Social Media</p>
        <p className="text-xs text-muted-foreground mb-3">Shown on the public landing page. Leave a field empty to hide that icon/link.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Instagram URL</Label><Input value={values.social_instagram} onChange={set('social_instagram')} placeholder="https://instagram.com/…" data-testid="set-instagram" /></div>
          <div><Label>Facebook URL</Label><Input value={values.social_facebook} onChange={set('social_facebook')} placeholder="https://facebook.com/…" data-testid="set-facebook" /></div>
          <div><Label>TikTok URL</Label><Input value={values.social_tiktok} onChange={set('social_tiktok')} placeholder="https://tiktok.com/@…" data-testid="set-tiktok" /></div>
          <div><Label>YouTube URL</Label><Input value={values.social_youtube} onChange={set('social_youtube')} placeholder="https://youtube.com/@…" data-testid="set-youtube" /></div>
          <div><Label>WhatsApp number/link</Label><Input value={values.social_whatsapp} onChange={set('social_whatsapp')} placeholder="628xxxxxxxxxx" data-testid="set-whatsapp" /></div>
        </div>
      </div>
      <div className="pt-2">
        <Button type="submit" disabled={saving} className="bg-primary" data-testid="set-save">{saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2"/>Saving…</> : 'Save Changes'}</Button>
      </div>
    </form>
  );
}
