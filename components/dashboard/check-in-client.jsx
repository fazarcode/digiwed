'use client';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { QrCode, Camera, CheckCircle2, AlertCircle, ScanLine, Plus, Trash2, Users as UsersIcon, User, RefreshCw, StopCircle } from 'lucide-react';

export default function CheckInClient({ invitations, devices: initialDevices, operator, deviceId, hideSetup = false, onCheckedIn }) {
  const [devices, setDevices] = useState(initialDevices);
  const [selectedDevice, setSelectedDevice] = useState(initialDevices[0]?.id || '');
  const [operatorName, setOperatorName] = useState('');
  // Feature G2: when the unified page provides operator/device, use them (shared across tabs).
  const effOperator = operator !== undefined ? (operator || '') : operatorName;
  const effDevice = deviceId !== undefined ? (deviceId || '') : selectedDevice;
  const [mode, setMode] = useState('manual');
  const [token, setToken] = useState('');
  const [pending, setPending] = useState(null);
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [groupCount, setGroupCount] = useState(1);
  const [individualCount, setIndividualCount] = useState(1);
  const [selfieDataUrl, setSelfieDataUrl] = useState(null);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const html5QrRef = useRef(null);
  const scanLockRef = useRef(false);            // Prevents duplicate scans while showing result
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const totalChecked = invitations.reduce((s, i) => s + i.checkedIn, 0);
  const totalGuests = invitations.reduce((s, i) => s + i.totalGuests, 0);
  const totalCheckIns = invitations.reduce((s, i) => s + i.totalCheckIns, 0);

  useEffect(() => { try { setOperatorName(localStorage.getItem('checkin.operator') || ''); const d = localStorage.getItem('checkin.device'); if (d && initialDevices.find(x => x.id === d)) setSelectedDevice(d); } catch {} }, []);

  const persistHint = () => { try { localStorage.setItem('checkin.operator', effOperator); localStorage.setItem('checkin.device', effDevice); } catch {} };

  // ---- Auto check-in flow (used by continuous scanner) ----
  const autoCheckin = async (token) => {
    if (!effOperator.trim()) { toast.error('Enter operator name first'); return; }
    const info = await fetch(`/api/guests/lookup/checkin?token=${encodeURIComponent(token)}`).then(r => r.json()).catch(() => null);
    if (!info?.guest) { setResult({ ok: false, message: info?.error || 'Guest not found' }); return; }
    const g = info.guest;
    if (g.invitation.selfieVerification) {
      // Fall back to manual confirmation flow (need selfie)
      setPending(g); toast.info('Selfie required — confirm manually below'); return;
    }
    if (g.guestType === 'INDIVIDUAL' && g.checkedInAt) {
      setResult({ ok: false, message: 'Already checked in.', guest: g });
      return;
    }
    // Use guest.quota as count (default 1). For GROUP: use quota as count.
    const count = Math.max(1, Math.min(g.quota || 1, 50));
    persistHint();
    const res = await fetch('/api/guests/lookup/checkin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: g.token, deviceId: effDevice || null, operatorName: effOperator.trim(), count }),
    });
    const data = await res.json();
    if (!res.ok) { setResult({ ok: false, message: data.error, guest: data.guest }); return; }
    setResult({ ok: true, guest: data.guest, count });
    toast.success(`✓ ${data.guest.name} (+${count})`);
    onCheckedIn?.(data.guest, count, data.checkInId);
  };

  // ---- Manual lookup + confirm flow ----
  const lookup = async (t) => {
    setResult(null); setPending(null); setSelfieDataUrl(null); setGroupCount(1); setIndividualCount(1);
    const info = await fetch(`/api/guests/lookup/checkin?token=${encodeURIComponent(t)}`).then(r => r.json()).catch(() => null);
    if (!info?.guest) return setResult({ ok: false, message: info?.error || 'Guest not found' });
    if (info.guest.guestType === 'INDIVIDUAL' && info.guest.checkedInAt) {
      return setResult({ ok: false, message: 'This individual guest has already checked in.', guest: info.guest });
    }
    setIndividualCount(Math.min(1, info.guest.quota || 1));
    setGroupCount(Math.min(info.guest.quota || 2, 2));
    setPending(info.guest);
  };
  const confirm = async () => {
    if (!pending) return;
    if (!effOperator.trim()) return toast.error('Please enter operator name');
    if (pending.invitation.selfieVerification && !selfieDataUrl) return toast.error('Selfie is required for this event');
    persistHint();
    const rawCount = pending.guestType === 'GROUP' ? groupCount : individualCount;
    const count = Math.max(1, Math.min(rawCount, pending.quota || 1, 50));
    const body = { token: pending.token, deviceId: effDevice || null, operatorName: effOperator.trim(), count, selfieDataUrl: pending.invitation.selfieVerification ? selfieDataUrl : null };
    const res = await fetch(`/api/guests/lookup/checkin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) return setResult({ ok: false, message: data.error, guest: data.guest });
    setResult({ ok: true, guest: data.guest, count });
    setPending(null); setSelfieDataUrl(null); setToken('');
    toast.success(`✓ ${data.guest.name} checked in`);
    onCheckedIn?.(data.guest, count, data.checkInId);
  };

  const submitManual = (e) => { e.preventDefault(); if (!token) return; lookup(token); };

  // ---- Continuous Scanner ----
  const startScanner = async () => {
    if (!effOperator.trim()) return toast.error('Please enter operator name first');
    setScanning(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      html5QrRef.current = new Html5Qrcode('qr-reader');
      await html5QrRef.current.start({ facingMode: 'environment' }, { fps: 10, qrbox: 250 }, async (text) => {
        if (scanLockRef.current) return;
        scanLockRef.current = true;
        try {
          // Robust token extraction: try full URL, then fall back to regex, then raw text
          let tok = String(text || '').trim();
          const m = tok.match(/[?&]guest=([\w-]+)/);
          if (m) tok = m[1];
          else {
            try { const u = new URL(text); const t = u.searchParams.get('guest'); if (t) tok = t; } catch {}
          }
          await autoCheckin(tok);
        } finally {
          setTimeout(() => { scanLockRef.current = false; setResult(null); }, 1700);
        }
      });
    } catch (e) {
      toast.error('Camera access denied or unavailable'); setScanning(false);
    }
  };
  const stopScanner = async () => {
    if (html5QrRef.current) {
      try { await html5QrRef.current.stop(); } catch {}
      try { html5QrRef.current.clear(); } catch {}
      html5QrRef.current = null;
    }
    scanLockRef.current = false;
    setScanning(false);
  };

  const startSelfieCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
    } catch { toast.error('Cannot access selfie camera'); }
  };
  const captureSelfie = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    setSelfieDataUrl(canvas.toDataURL('image/jpeg', 0.7));
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
  };

  const addDevice = async () => {
    if (!newDeviceName.trim()) return;
    const res = await fetch('/api/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newDeviceName.trim() }) });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error);
    setDevices(d => [data.item, ...d]);
    setSelectedDevice(data.item.id);
    setNewDeviceName(''); setShowAddDevice(false);
    toast.success('Device added');
  };
  const delDevice = async (id) => {
    if (!confirm('Delete this device?')) return;
    await fetch(`/api/devices/${id}`, { method: 'DELETE' });
    setDevices(d => d.filter(x => x.id !== id));
    if (selectedDevice === id) setSelectedDevice('');
  };

  // Cleanup on unmount / route change
  useEffect(() => {
    const handleUnload = () => { stopScanner(); if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
    window.addEventListener('beforeunload', handleUnload);
    return () => { handleUnload(); window.removeEventListener('beforeunload', handleUnload); };
  }, []);

  const selfieRequired = pending?.invitation?.selfieVerification;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        {!hideSetup && (
        <div className="rounded-2xl bg-white border p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Operator &amp; Device</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Operator Name*</Label><Input value={operatorName} onChange={e => setOperatorName(e.target.value)} placeholder="e.g. Sarah" /></div>
            <div><Label>Device</Label>
              <div className="flex gap-2">
                <select value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)} className="flex-1 h-10 px-3 rounded-md border text-sm">
                  <option value="">— Select Device —</option>
                  {devices.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <Button size="sm" variant="outline" onClick={() => setShowAddDevice(v => !v)}><Plus className="h-4 w-4"/></Button>
              </div>
            </div>
          </div>
          {showAddDevice && (
            <div className="mt-3 flex gap-2">
              <Input value={newDeviceName} onChange={e => setNewDeviceName(e.target.value)} placeholder="Device name (e.g. iPad #1)" onKeyDown={e => e.key === 'Enter' && addDevice()} />
              <Button size="sm" onClick={addDevice} className="bg-primary">Add</Button>
            </div>
          )}
        </div>
        )}

        <div className="rounded-2xl bg-white border p-6">
          <div className="flex gap-2 mb-4">
            <Button variant={mode === 'manual' ? 'default' : 'outline'} onClick={() => { setMode('manual'); stopScanner(); }} className={mode === 'manual' ? 'bg-primary' : ''}><QrCode className="h-4 w-4 mr-1"/>Manual</Button>
            <Button variant={mode === 'camera' ? 'default' : 'outline'} onClick={() => setMode('camera')} className={mode === 'camera' ? 'bg-primary' : ''}><Camera className="h-4 w-4 mr-1"/>Camera Scan</Button>
          </div>

          {mode === 'manual' && !pending && (
            <form onSubmit={submitManual} className="space-y-3">
              <div><Label>Guest Token</Label><Input value={token} onChange={e => setToken(e.target.value)} placeholder="e.g. abc123xyz" className="font-mono" /></div>
              <Button type="submit" className="bg-primary"><ScanLine className="h-4 w-4 mr-1"/>Lookup Guest</Button>
            </form>
          )}

          {mode === 'camera' && (
            <div className="space-y-3">
              {!scanning ? (
                <div className="text-center py-6">
                  <Camera className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground mb-3">Camera stays on until you press Stop. Scans continue after each check-in.</p>
                  <Button onClick={startScanner} className="bg-primary">Open Camera</Button>
                </div>
              ) : (
                <div>
                  <div id="qr-reader" className="w-full max-w-md mx-auto rounded-lg overflow-hidden" />
                  <Button variant="outline" onClick={stopScanner} className="mt-3"><StopCircle className="h-4 w-4 mr-1"/>Stop Camera</Button>
                  <p className="text-xs text-muted-foreground mt-2">Scans automatically resume 1.7s after each result. Duplicate scans are locked.</p>
                </div>
              )}
            </div>
          )}

          {pending && (
            <div className="space-y-4 mt-4">
              <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2">
                  {pending.guestType === 'GROUP' ? <UsersIcon className="h-5 w-5 text-primary"/> : <User className="h-5 w-5 text-primary"/>}
                  <p className="font-serif text-xl font-bold">{pending.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${pending.guestType === 'GROUP' ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}>{pending.guestType}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{pending.category || 'No category'} • Quota: {pending.quota}</p>
              </div>

              {pending.guestType === 'INDIVIDUAL' ? (
                <div>
                  <Label>Number of Attendees</Label>
                  <Input type="number" min={1} max={pending.quota || 1} value={individualCount} onChange={e => setIndividualCount(parseInt(e.target.value, 10) || 1)} disabled={(pending.quota || 1) <= 1} />
                  <p className="text-xs text-muted-foreground mt-1">1..{pending.quota || 1} (bounded by guest quota)</p>
                </div>
              ) : (
                <div>
                  <Label>Group Attendees for this check-in</Label>
                  <Input type="number" min={1} max={pending.quota || 50} value={groupCount} onChange={e => setGroupCount(parseInt(e.target.value, 10) || 1)} />
                </div>
              )}

              {selfieRequired && (
                <div>
                  <Label>Selfie Verification (required)</Label>
                  {!selfieDataUrl ? (
                    <div className="space-y-2">
                      {!streamRef.current && <Button size="sm" variant="outline" onClick={startSelfieCamera}><Camera className="h-4 w-4 mr-1"/>Start Camera</Button>}
                      <video ref={videoRef} className="w-full max-w-xs rounded-lg" autoPlay muted playsInline />
                      <Button size="sm" onClick={captureSelfie} className="bg-primary">Capture Selfie</Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <img src={selfieDataUrl} alt="Selfie" className="max-w-xs rounded-lg border" />
                      <Button size="sm" variant="outline" onClick={() => { setSelfieDataUrl(null); startSelfieCamera(); }}><RefreshCw className="h-3.5 w-3.5 mr-1"/>Retake</Button>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { setPending(null); setSelfieDataUrl(null); setToken(''); }}>Cancel</Button>
                <Button onClick={confirm} className="bg-emerald-600"><CheckCircle2 className="h-4 w-4 mr-1"/>Confirm Check-in</Button>
              </div>
            </div>
          )}
        </div>

        {result && (
          <div className={`rounded-2xl border-2 p-6 ${result.ok ? 'bg-emerald-50 border-emerald-300' : 'bg-red-50 border-red-300'}`}>
            <div className="flex items-start gap-3">
              {result.ok ? <CheckCircle2 className="h-8 w-8 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="h-8 w-8 text-red-600 flex-shrink-0" />}
              <div>
                <p className="font-serif text-xl font-bold">{result.ok ? `Checked In${result.count > 1 ? ` (× ${result.count})` : ''}!` : result.message}</p>
                {result.guest && <p className="font-medium text-lg mt-1">{result.guest.name}</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-white border p-6 h-fit">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Statistics</p>
        <p className="font-serif text-4xl font-bold mt-2">{totalChecked} <span className="text-lg text-muted-foreground">/ {totalGuests}</span></p>
        <p className="text-sm text-muted-foreground mt-1">Unique guests checked in</p>
        <p className="text-xs text-muted-foreground mt-1">Total check-in events: {totalCheckIns}</p>
        <div className="mt-4 space-y-2">
          {invitations.map(i => (
            <div key={i.id} className="text-sm">
              <div className="flex justify-between"><span>{i.brideName} & {i.groomName}</span><span className="font-medium">{i.checkedIn} / {i.totalGuests}</span></div>
              <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: i.totalGuests ? `${(i.checkedIn / i.totalGuests) * 100}%` : '0%' }} /></div>
              {i.selfieVerification && <p className="text-[10px] uppercase tracking-widest text-primary/70 mt-0.5">◉ Selfie verification enabled</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
