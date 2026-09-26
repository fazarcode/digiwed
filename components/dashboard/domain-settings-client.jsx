'use client';
import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Globe, Save, Copy, ExternalLink, CheckCircle2, AlertCircle, Link as LinkIcon } from 'lucide-react';

const MODES = [
  { id: 'SLUG', label: 'Slug (default)', icon: LinkIcon, hint: 'Use the default platform URL — no setup required.' },
  { id: 'SUBDOMAIN', label: 'Subdomain', icon: Globe, hint: 'Serve on a branded subdomain like wedding.yoursite.com.' },
  { id: 'CUSTOM', label: 'Custom Domain', icon: Globe, hint: 'Point your own domain via CNAME. Fallback to slug URL until active.' },
];

export default function DomainSettingsClient({ invitations }) {
  const [selectedId, setSelectedId] = useState(invitations[0]?.id || '');
  const inv = useMemo(() => invitations.find(i => i.id === selectedId), [invitations, selectedId]);

  const initialMode = inv?.customDomain ? 'CUSTOM' : (inv?.subdomain ? 'SUBDOMAIN' : 'SLUG');
  const [mode, setMode] = useState(initialMode);
  const [customDomain, setCustomDomain] = useState(inv?.customDomain || '');
  const [subdomain, setSubdomain] = useState(inv?.subdomain || '');
  const [checking, setChecking] = useState(false);
  const [reachable, setReachable] = useState(null); // null | true | false
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setMode(inv?.customDomain ? 'CUSTOM' : (inv?.subdomain ? 'SUBDOMAIN' : 'SLUG'));
    setCustomDomain(inv?.customDomain || '');
    setSubdomain(inv?.subdomain || '');
    setReachable(null);
  }, [selectedId]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const platformHost = useMemo(() => { try { return new URL(origin).hostname; } catch { return 'invitation.example.com'; } }, [origin]);
  const rootDomain = useMemo(() => platformHost.split('.').slice(-2).join('.') || 'example.com', [platformHost]);

  const slugUrl = inv ? `${origin}/invite/${inv.slug}` : '';
  const subUrl = subdomain ? `https://${subdomain}.${rootDomain}` : '';
  const cdUrl = customDomain ? `https://${customDomain}` : '';

  const save = async () => {
    if (!inv) return;
    setSaving(true);
    try {
      const payload = {};
      if (mode === 'CUSTOM') { payload.customDomain = customDomain.trim() || null; payload.subdomain = null; }
      else if (mode === 'SUBDOMAIN') { payload.subdomain = subdomain.trim() || null; payload.customDomain = null; }
      else { payload.customDomain = null; payload.subdomain = null; }
      const res = await fetch(`/api/invitations/${inv.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.success('Domain settings saved');
      // Refresh local snapshot
      inv.customDomain = data.invitation.customDomain;
      inv.subdomain = data.invitation.subdomain;
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const checkDomain = async () => {
    if (!customDomain) return;
    setChecking(true); setReachable(null);
    try {
      const res = await fetch(`https://${customDomain}`, { method: 'HEAD', mode: 'no-cors' });
      // no-cors → response is opaque; we can only detect network failure vs success by exception
      setReachable(true);
    } catch (e) {
      setReachable(false);
    } finally { setChecking(false); }
  };

  const copy = (text) => { navigator.clipboard.writeText(text); toast.success('Copied'); };

  if (invitations.length === 0) {
    return <div className="rounded-2xl bg-white border p-12 text-center"><p className="text-muted-foreground">Create an invitation first to configure its domain.</p></div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      {/* Invitation picker */}
      <div className="lg:col-span-1 rounded-2xl bg-white border p-4 space-y-1 h-fit">
        <p className="text-xs uppercase tracking-widest text-muted-foreground px-2 pb-2">Your Invitations</p>
        {invitations.map(i => (
          <button key={i.id} data-testid={`domain-inv-${i.id}`} onClick={() => setSelectedId(i.id)} className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${selectedId === i.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
            <p className="font-medium">{i.brideName} & {i.groomName}</p>
            <p className="text-xs opacity-70">{i.customDomain ? `custom: ${i.customDomain}` : (i.subdomain ? `sub: ${i.subdomain}` : `slug: ${i.slug}`)}</p>
          </button>
        ))}
      </div>

      <div className="lg:col-span-3 space-y-4">
        {/* Mode picker */}
        <div className="rounded-2xl bg-white border p-5 space-y-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">URL Mode</p>
          <div className="grid gap-2 md:grid-cols-3">
            {MODES.map(m => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  data-testid={`mode-${m.id.toLowerCase()}`}
                  onClick={() => setMode(m.id)}
                  className={`text-left p-3 rounded-xl border transition ${active ? 'border-primary bg-primary/5 shadow-sm' : 'border-primary/10 hover:border-primary/30'}`}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold"><m.icon className="h-4 w-4" />{m.label}</div>
                  <p className="text-xs text-muted-foreground mt-1">{m.hint}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mode-specific fields */}
        {mode === 'SLUG' && (
          <div className="rounded-2xl bg-white border p-5 space-y-3">
            <Label>Slug URL</Label>
            <div className="flex gap-2">
              <Input value={slugUrl} readOnly className="font-mono text-xs" />
              <Button variant="outline" onClick={() => copy(slugUrl)} data-testid="copy-slug-url"><Copy className="h-4 w-4" /></Button>
              <a href={slugUrl} target="_blank"><Button variant="outline"><ExternalLink className="h-4 w-4" /></Button></a>
            </div>
            <p className="text-xs text-muted-foreground">This URL always works — even if your subdomain or custom domain isn't yet active.</p>
          </div>
        )}

        {mode === 'SUBDOMAIN' && (
          <div className="rounded-2xl bg-white border p-5 space-y-3">
            <Label>Subdomain</Label>
            <div className="flex items-center gap-2">
              <Input data-testid="subdomain-input" value={subdomain} onChange={(e) => setSubdomain(e.target.value.replace(/[^a-z0-9-]/gi, '').toLowerCase())} placeholder="e.g. john-jane" className="max-w-xs" />
              <span className="text-sm text-muted-foreground">.{rootDomain}</span>
            </div>
            <p className="text-xs text-muted-foreground">Only lowercase letters, numbers and hyphens. Fallback URL: <span className="font-mono">{slugUrl}</span></p>
            {subUrl && (
              <div className="flex gap-2 pt-2">
                <Input value={subUrl} readOnly className="font-mono text-xs" />
                <Button variant="outline" onClick={() => copy(subUrl)}><Copy className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
        )}

        {mode === 'CUSTOM' && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white border p-5 space-y-3">
              <Label>Your Domain</Label>
              <div className="flex gap-2">
                <Input data-testid="custom-domain-input" value={customDomain} onChange={(e) => setCustomDomain(e.target.value.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase())} placeholder="e.g. domain-event.com" />
                <Button variant="outline" onClick={checkDomain} disabled={!customDomain || checking} data-testid="check-domain-btn">
                  {checking ? 'Checking…' : 'Check'}
                </Button>
              </div>
              {reachable === true && <div className="flex items-center gap-2 text-xs text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Domain is reachable</div>}
              {reachable === false && <div className="flex items-center gap-2 text-xs text-amber-700"><AlertCircle className="h-4 w-4" /> Domain not reachable yet — using slug fallback</div>}
              <p className="text-xs text-muted-foreground">Fallback URL until active: <span className="font-mono">{slugUrl}</span></p>
            </div>

            <div className="rounded-2xl bg-white border p-5 space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2"><Globe className="h-4 w-4 text-primary" />DNS Configuration</p>
              <p className="text-xs text-muted-foreground">Add the following record at your DNS provider. It may take a few minutes to propagate.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-left text-muted-foreground uppercase tracking-widest border-b">
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Host</th>
                      <th className="py-2 pr-4">Value</th>
                      <th className="py-2">TTL</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3 pr-4"><code className="px-2 py-0.5 rounded bg-muted">CNAME</code></td>
                      <td className="py-3 pr-4">{customDomain ? (customDomain.startsWith('www.') ? 'www' : '@') : 'www'}</td>
                      <td className="py-3 pr-4">{platformHost}</td>
                      <td className="py-3">3600</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Example: <span className="font-mono">CNAME</span> | <span className="font-mono">www</span> | <span className="font-mono">domain-event.com</span> → <span className="font-mono">{platformHost}</span>
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button data-testid="save-domain-btn" onClick={save} disabled={saving} className="bg-primary">
            <Save className="h-4 w-4 mr-1.5" /> {saving ? 'Saving…' : 'Save Domain Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
}
