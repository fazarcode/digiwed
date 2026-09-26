'use client';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Cpu, ScanLine, CheckCircle2, AlertCircle } from 'lucide-react';

// Thin "Scan Device" integration seam (Feature 3).
// Reuses the existing Device model (via /api/devices) for device selection and feeds the SAME
// check-in service used by camera mode (POST /api/guests/lookup/checkin). No vendor/hardware is
// invented: a hardware scanner typically emits the QR token as keystrokes ending in Enter, so the
// token input auto-submits on Enter. `deviceCheckIn(payload)` is the single seam a real scanner
// driver would call.
export default function DeviceScanClient({ invitations = [], devices: initialDevices = [], operator, deviceId, hideSetup = false, onCheckedIn }) {
  const [devices, setDevices] = useState(initialDevices);
  const [selectedDevice, setSelectedDevice] = useState(initialDevices[0]?.id || '');
  const [operatorName, setOperatorName] = useState('');
  const effOperator = operator !== undefined ? (operator || '') : operatorName;
  const effDevice = deviceId !== undefined ? (deviceId || '') : selectedDevice;
  const [token, setToken] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    try {
      setOperatorName(localStorage.getItem('checkin.operator') || '');
      const d = localStorage.getItem('checkin.device');
      if (d && initialDevices.find((x) => x.id === d)) setSelectedDevice(d);
    } catch {}
    // Refresh device list from the existing endpoint.
    fetch('/api/devices')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.items) {
          setDevices(data.items);
          setSelectedDevice((cur) => cur || data.items[0]?.id || '');
        }
      })
      .catch(() => {});
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistHint = () => {
    try {
      localStorage.setItem('checkin.operator', effOperator);
      localStorage.setItem('checkin.device', effDevice);
    } catch {}
  };

  // Single seam mapping to the existing check-in endpoint (same one camera mode uses).
  const deviceCheckIn = async (payload) => {
    const res = await fetch('/api/guests/lookup/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  };

  const submitToken = async (raw) => {
    const t = String(raw || '').trim();
    if (!t) return;
    if (!effOperator.trim()) { toast.error('Enter operator name first'); inputRef.current?.focus(); return; }
    setBusy(true);
    persistHint();
    try {
      const { ok, data } = await deviceCheckIn({
        token: t,
        deviceId: effDevice || null,
        operatorName: effOperator.trim(),
        count: 1,
      });
      if (!ok || data?.error) {
        setResults((r) => [{ ok: false, message: data?.error || 'Check-in failed', token: t, at: Date.now() }, ...r].slice(0, 25));
        toast.error(data?.error || 'Check-in failed');
      } else {
        setResults((r) => [{ ok: true, name: data?.guest?.name || t, count: data?.count || 1, token: t, at: Date.now() }, ...r].slice(0, 25));
        toast.success(`\u2713 ${data?.guest?.name || 'Checked in'}`);
        if (data?.guest) onCheckedIn?.(data.guest, data?.count || 1, data?.checkInId);
      }
    } finally {
      setToken('');
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl bg-white border border-primary/10 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-primary" />
          <h3 className="font-serif text-xl font-semibold">Device Scanner</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Select the check-in device and operator, then scan a guest QR with your hardware scanner
          (or type/paste the token and press Enter). This uses the same check-in service as camera mode.
        </p>

        <div className="space-y-1.5">
          <Label>Operator Name</Label>
          <Input value={effOperator} onChange={(e) => setOperatorName(e.target.value)} disabled={hideSetup} placeholder="e.g. Front Desk 1" />
        </div>

        <div className="space-y-1.5">
          <Label>Device</Label>
          <select
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
            value={effDevice}
            disabled={hideSetup}
            onChange={(e) => setSelectedDevice(e.target.value)}
          >
            <option value="">No device</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label>Scan / Token</Label>
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitToken(token); } }}
              placeholder="Scan QR or paste guest token, then Enter"
              disabled={busy}
            />
            <Button onClick={() => submitToken(token)} disabled={busy} className="bg-primary shrink-0">
              <ScanLine className="h-4 w-4 mr-1" />Check in
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-primary/10 p-6">
        <h3 className="font-serif text-lg font-semibold mb-3">Recent Scans</h3>
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scans yet.</p>
        ) : (
          <ul className="space-y-2 max-h-[420px] overflow-auto">
            {results.map((r, i) => (
              <li key={i} className={`flex items-center gap-2 text-sm rounded-md px-3 py-2 ${r.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
                {r.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <span className="font-medium">{r.ok ? r.name : r.message}</span>
                {r.ok && r.count > 1 ? <span className="text-xs">(+{r.count})</span> : null}
                <span className="ml-auto text-xs opacity-60 font-mono">{r.token.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
