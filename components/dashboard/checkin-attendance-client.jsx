'use client';
import { useEffect, useState } from 'react';
import { Camera, ScanLine, ClipboardList, Settings2, UserCog, UserPlus, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import CheckInClient from '@/components/dashboard/check-in-client';
import AttendanceClient from '@/components/dashboard/attendance-client';
import DeviceScanClient from '@/components/dashboard/device-scan-client';

// Unified workspace: tabs are React state, NOT routes. A single Operator + Device setup dialog
// runs once per browser SESSION (persisted in sessionStorage); the chosen operator/device are
// shared across Camera / Device / Manual and survive dashboard navigation + remounts.
const TABS = [
  { key: 'camera', label: 'Scan Camera', icon: Camera },
  { key: 'device', label: 'Scan Device', icon: ScanLine },
  { key: 'manual', label: 'Edit Manual Attendance', icon: ClipboardList },
];

// Stable session keys (survive navigation; cleared when the browser session ends).
const SS_OPERATOR = 'checkin.operator';
const SS_DEVICE = 'checkin.device';

export default function CheckinAttendanceClient({
  initialMode = 'camera',
  checkinInvitations = [],
  checkinDevices = [],
  attendanceInvitations = [],
  attendanceDevices = [],
  categories = [],
}) {
  const [mode, setMode] = useState(TABS.some((t) => t.key === initialMode) ? initialMode : 'camera');
  const [operator, setOperator] = useState('');
  const [deviceId, setDeviceId] = useState('');
  // Start closed + unconfigured; a client-only effect decides whether to open (avoids SSR flash).
  const [setupOpen, setSetupOpen] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [devs, setDevs] = useState(checkinDevices);
  const [newDevName, setNewDevName] = useState('');
  const [addingDev, setAddingDev] = useState(false);
  // Draft values inside the setup dialog
  const [draftOp, setDraftOp] = useState('');
  const [draftDev, setDraftDev] = useState('');

  // ---- Add Guest (new guests only) state ----
  const [addGuestOpen, setAddGuestOpen] = useState(false);
  const [agInvitationId, setAgInvitationId] = useState(attendanceInvitations[0]?.id || '');
  const [agName, setAgName] = useState('');
  const [agPhone, setAgPhone] = useState('');
  const [agType, setAgType] = useState('INDIVIDUAL');
  const [agQuota, setAgQuota] = useState(1);
  const [agCategoryId, setAgCategoryId] = useState('');
  const [agBusy, setAgBusy] = useState(false);

  // ---- Post-check-in popup ----
  const [checkedIn, setCheckedIn] = useState(null); // { guest, count, checkInId }
  const [svList, setSvList] = useState([]);
  const [svSelect, setSvSelect] = useState('');
  const [svQty, setSvQty] = useState(1);
  const [savingSv, setSavingSv] = useState(false);
  const [giftMode, setGiftMode] = useState('none'); // none | money | goods
  const [giftAmount, setGiftAmount] = useState('');
  const [giftItem, setGiftItem] = useState('');
  const [giftNote, setGiftNote] = useState('');
  const [savingGift, setSavingGift] = useState(false);

  const openPostCheckin = async (guest, count, checkInId) => {
    setCheckedIn({ guest, count, checkInId });
    setSvSelect(''); setSvQty(1); setGiftMode('none'); setGiftAmount(''); setGiftItem(''); setGiftNote('');
    const invId = guest?.invitation?.id;
    if (invId) {
      try { const r = await fetch(`/api/invitations/${invId}/souvenirs`); const d = await r.json(); setSvList((d.items || []).filter((x) => x.active)); } catch { setSvList([]); }
    } else setSvList([]);
  };

  const saveSouvenir = async () => {
    if (!checkedIn) return;
    const invId = checkedIn.guest?.invitation?.id;
    if (!invId || !svSelect) { toast.error('Pick a souvenir'); return; }
    setSavingSv(true);
    try {
      const r = await fetch(`/api/invitations/${invId}/souvenir-distributions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ souvenirId: svSelect, guestId: checkedIn.guest.id, quantity: parseInt(svQty, 10) || 0, operatorName: operator, checkInId: checkedIn.checkInId || null }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      toast.success(`Souvenir saved. Remaining: ${d.remaining}`);
      setSvList((list) => list.map((x) => (x.id === svSelect ? { ...x, remaining: d.remaining, distributed: d.distributed } : x)));
    } catch (e) { toast.error(e.message); } finally { setSavingSv(false); }
  };

  const saveGift = async () => {
    if (!checkedIn || giftMode === 'none') { toast.error('Select Angpau or Gift first'); return; }
    const invId = checkedIn.guest?.invitation?.id;
    setSavingGift(true);
    try {
      const body = { giverName: checkedIn.guest.name, guestId: checkedIn.guest.id, notes: giftNote || null, checkInId: checkedIn.checkInId || null };
      if (giftMode === 'money') { body.kind = 'MONEY'; body.amount = giftAmount || null; } else { body.kind = 'GOODS'; body.itemName = giftItem || null; }
      const r = await fetch(`/api/invitations/${invId}/gift-entries`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Failed');
      toast.success(d.deduped ? 'Gift record updated' : 'Gift recorded');
    } catch (e) { toast.error(e.message); } finally { setSavingGift(false); }
  };

  const addDevice = async () => {
    if (!newDevName.trim()) return;
    setAddingDev(true);
    try {
      const res = await fetch('/api/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newDevName.trim() }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      const dev = { id: data.item.id, name: data.item.name };
      setDevs((list) => [...list, dev]);
      setDraftDev(dev.id);
      setNewDevName('');
    } catch (e) { /* noop */ } finally { setAddingDev(false); }
  };

  // On mount (client-only): restore operator/device from sessionStorage. If a valid operator
  // session exists, DO NOT show the popup again. Only open it when no valid session exists.
  useEffect(() => {
    try {
      const op = (sessionStorage.getItem(SS_OPERATOR) || '').trim();
      const dev = sessionStorage.getItem(SS_DEVICE) || '';
      if (op) {
        setOperator(op);
        const validDev = dev && devs.find((d) => d.id === dev) ? dev : '';
        setDeviceId(validDev);
        setConfigured(true);
        setSetupOpen(false);
        setDraftOp(op);
        setDraftDev(validDev);
      } else {
        setDraftOp('');
        setDraftDev('');
        setSetupOpen(true);
      }
    } catch {
      setSetupOpen(true);
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmSetup = () => {
    if (!draftOp.trim()) return;
    const op = draftOp.trim();
    const dev = draftDev || '';
    setOperator(op);
    setDeviceId(dev);
    setConfigured(true);
    setSetupOpen(false);
    try {
      sessionStorage.setItem(SS_OPERATOR, op);
      sessionStorage.setItem(SS_DEVICE, dev);
      // Keep localStorage in sync for any legacy standalone reads.
      localStorage.setItem(SS_OPERATOR, op);
      localStorage.setItem(SS_DEVICE, dev);
    } catch {}
  };

  const openChange = () => { setDraftOp(operator); setDraftDev(deviceId); setSetupOpen(true); };
  const deviceName = devs.find((d) => d.id === deviceId)?.name || 'No device';

  // ---- Add Guest: create a REAL guest via the existing Guest API, then continue to check-in ----
  const resetAddGuest = () => {
    setAgName(''); setAgPhone(''); setAgType('INDIVIDUAL'); setAgQuota(1); setAgCategoryId('');
    setAgInvitationId(attendanceInvitations[0]?.id || '');
  };

  const submitAddGuest = async () => {
    if (!configured) { toast.error('Set operator & device first'); setSetupOpen(true); return; }
    if (!agInvitationId) { toast.error('Select an invitation'); return; }
    if (!agName.trim()) { toast.error('Guest name is required'); return; }
    setAgBusy(true);
    try {
      // 1) Prevent duplicates: an existing guest with the same name (+phone) must NOT be re-created.
      const listRes = await fetch(`/api/invitations/${agInvitationId}/guests`);
      if (listRes.ok) {
        const { items = [] } = await listRes.json();
        const nameL = agName.trim().toLowerCase();
        const phoneL = agPhone.trim();
        const dupe = items.find((g) => (g.name || '').trim().toLowerCase() === nameL && (!phoneL || (g.phone || '').trim() === phoneL));
        if (dupe) {
          toast.error(`"${dupe.name}" already exists. Use Scan/Search to check them in.`);
          setAgBusy(false);
          return;
        }
      }
      // 2) Create the real guest (reuses existing guest fields + validation + ownership check).
      const quota = agType === 'GROUP' ? Math.max(1, parseInt(agQuota, 10) || 2) : Math.max(1, parseInt(agQuota, 10) || 1);
      const createRes = await fetch(`/api/invitations/${agInvitationId}/guests`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: agName.trim(), phone: agPhone.trim() || null, guestType: agType, quota, categoryId: agCategoryId || null }),
      });
      const createData = await createRes.json();
      if (!createRes.ok || !createData.item) throw new Error(createData.error || 'Failed to create guest');
      const token = createData.item.token;
      // 3) Immediately continue into the SAME check-in flow (no navigation).
      const count = agType === 'GROUP' ? quota : 1;
      const ciRes = await fetch('/api/guests/lookup/checkin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, deviceId: deviceId || null, operatorName: operator, count }),
      });
      const ciData = await ciRes.json();
      if (!ciRes.ok || !ciData.guest) throw new Error(ciData.error || 'Guest created but check-in failed');
      toast.success(`✓ ${ciData.guest.name} added & checked in`);
      setAddGuestOpen(false);
      resetAddGuest();
      openPostCheckin(ciData.guest, ciData.count || count, ciData.checkInId);
    } catch (e) {
      toast.error(e.message || 'Something went wrong');
    } finally {
      setAgBusy(false);
    }
  };

  const catOf = (g) => (g?.category && typeof g.category === 'object' ? g.category.name : g?.category) || null;

  return (
    <div className="space-y-6">
      {/* Operator + Device setup dialog (once per browser session) */}
      <Dialog open={setupOpen} onOpenChange={(o) => { if (!o && configured) setSetupOpen(false); }}>
        <DialogContent onInteractOutside={(e) => !configured && e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" />Operator &amp; Device</DialogTitle>
            <DialogDescription>Set who is checking in guests and which device. This is shared across Camera, Device, and Manual — and remembered for the rest of your session.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Operator Name *</Label>
              <Input value={draftOp} onChange={(e) => setDraftOp(e.target.value)} placeholder="e.g. Sarah" onKeyDown={(e) => e.key === 'Enter' && confirmSetup()} data-testid="setup-operator-input" />
            </div>
            <div>
              <Label>Device</Label>
              <select value={draftDev} onChange={(e) => setDraftDev(e.target.value)} className="w-full h-10 px-3 rounded-md border text-sm bg-white" data-testid="setup-device-select">
                <option value="">No device</option>
                {devs.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
              </select>
              <div className="flex gap-2 mt-2">
                <Input value={newDevName} onChange={(e) => setNewDevName(e.target.value)} placeholder="＋ Add new device name" className="h-9 text-sm" data-testid="setup-new-device-input" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addDevice())} />
                <Button type="button" variant="outline" size="sm" onClick={addDevice} disabled={addingDev || !newDevName.trim()} data-testid="setup-add-device-btn">Add</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={confirmSetup} disabled={!draftOp.trim()} className="bg-primary" data-testid="setup-continue-btn">Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Active operator/device banner + change action + Add Guest */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/15 bg-white px-4 py-3">
        <div className="flex items-center gap-2 text-sm">
          <UserCog className="h-4 w-4 text-primary" />
          <span>Operator: <strong>{operator || '—'}</strong></span>
          <span className="text-muted-foreground">•</span>
          <span>Device: <strong>{deviceName}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { resetAddGuest(); setAddGuestOpen(true); }} data-testid="add-guest-btn">
            <UserPlus className="h-4 w-4 mr-1" />Add Guest
          </Button>
          <Button variant="outline" size="sm" onClick={openChange} data-testid="change-operator-btn">
            <Settings2 className="h-4 w-4 mr-1" />Change Operator/Device
          </Button>
        </div>
      </div>

      {/* Add Guest dialog — creates a REAL new guest, then continues to check-in */}
      <Dialog open={addGuestOpen} onOpenChange={setAddGuestOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Add Guest</DialogTitle>
            <DialogDescription>Only for a guest who is NOT already in the list. This creates a real guest and immediately checks them in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Invitation *</Label>
              <select value={agInvitationId} onChange={(e) => setAgInvitationId(e.target.value)} className="w-full h-10 px-3 rounded-md border text-sm bg-white" data-testid="ag-invitation-select">
                {attendanceInvitations.length === 0 && <option value="">No invitations</option>}
                {attendanceInvitations.map((i) => (<option key={i.id} value={i.id}>{[i.brideName, i.groomName].filter(Boolean).join(' & ') || 'Untitled'}</option>))}
              </select>
            </div>
            <div>
              <Label>Guest Name *</Label>
              <Input value={agName} onChange={(e) => setAgName(e.target.value)} placeholder="e.g. Ahmad Fauzan" data-testid="ag-name-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input value={agPhone} onChange={(e) => setAgPhone(e.target.value)} placeholder="Optional" data-testid="ag-phone-input" />
              </div>
              <div>
                <Label>Type</Label>
                <select value={agType} onChange={(e) => { setAgType(e.target.value); setAgQuota(e.target.value === 'GROUP' ? 2 : 1); }} className="w-full h-10 px-3 rounded-md border text-sm bg-white" data-testid="ag-type-select">
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="GROUP">Group</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quota</Label>
                <Input type="number" min={1} max={100} value={agQuota} onChange={(e) => setAgQuota(parseInt(e.target.value, 10) || 1)} data-testid="ag-quota-input" />
              </div>
              <div>
                <Label>Category</Label>
                <select value={agCategoryId} onChange={(e) => setAgCategoryId(e.target.value)} className="w-full h-10 px-3 rounded-md border text-sm bg-white" data-testid="ag-category-select">
                  <option value="">No category</option>
                  {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddGuestOpen(false)} disabled={agBusy}>Cancel</Button>
            <Button onClick={submitAddGuest} disabled={agBusy || !agName.trim() || !agInvitationId} className="bg-primary" data-testid="ag-save-btn">
              {agBusy ? 'Saving…' : 'Save & Check-in'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Post-check-in popup (shared by Camera / Device / Add Guest) */}
      <Dialog open={!!checkedIn} onOpenChange={(o) => { if (!o) setCheckedIn(null); }}>
        <DialogContent data-testid="post-checkin-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700"><CheckCircle2 className="h-5 w-5" />Checked In</DialogTitle>
            <DialogDescription>Guest attendance recorded.</DialogDescription>
          </DialogHeader>
          {checkedIn?.guest && (
            <div className="space-y-3">
              <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2">
                  <p className="font-serif text-xl font-bold" data-testid="post-checkin-name">{checkedIn.guest.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-white">{checkedIn.guest.guestType}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{catOf(checkedIn.guest) || 'No category'} • Quota: {checkedIn.guest.quota ?? 1}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Attendance</p>
                  <p className="text-lg font-semibold" data-testid="post-checkin-count">{checkedIn.count} {checkedIn.count > 1 ? 'people' : 'person'}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Status</p>
                  <p className="text-lg font-semibold text-emerald-700">Checked In</p>
                  {typeof checkedIn.guest.checkedInCount === 'number' && (
                    <p className="text-xs text-muted-foreground">Total attended: {checkedIn.guest.checkedInCount}</p>
                  )}
                </div>
              </div>
              {/* Souvenir distribution */}
              <div className="rounded-lg border p-3 space-y-2" data-testid="post-souvenir-section">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Souvenir</p>
                {svList.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No souvenirs configured.</p>
                ) : (
                  <div className="flex flex-wrap items-end gap-2">
                    <select value={svSelect} onChange={(e) => setSvSelect(e.target.value)} className="h-9 px-2 rounded-md border text-sm bg-white" data-testid="post-souvenir-select">
                      <option value="">Select…</option>
                      {svList.map((x) => <option key={x.id} value={x.id}>{x.name} (Avail: {x.remaining})</option>)}
                    </select>
                    <Input type="number" min={0} value={svQty} onChange={(e) => setSvQty(parseInt(e.target.value, 10) || 0)} className="h-9 w-20" data-testid="post-souvenir-qty" />
                    <Button size="sm" onClick={saveSouvenir} disabled={savingSv || !svSelect} className="bg-primary" data-testid="post-souvenir-save">Save</Button>
                  </div>
                )}
              </div>

              {/* Gift / Angpau recording (same Gift Tracking system) */}
              <div className="rounded-lg border p-3 space-y-2" data-testid="post-gift-section">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Gift / Angpau</p>
                <div className="flex gap-3 text-sm">
                  {['none', 'money', 'goods'].map((m) => (
                    <label key={m} className="flex items-center gap-1">
                      <input type="radio" name="giftMode" checked={giftMode === m} onChange={() => setGiftMode(m)} data-testid={`post-gift-mode-${m}`} />
                      {m === 'none' ? 'No Gift' : m === 'money' ? 'Gave Angpau' : 'Gave Gift'}
                    </label>
                  ))}
                </div>
                {giftMode === 'money' && (
                  <div className="flex flex-wrap gap-2">
                    <Input type="number" placeholder="Amount" value={giftAmount} onChange={(e) => setGiftAmount(e.target.value)} className="h-9 w-32" data-testid="post-gift-amount" />
                    <Input placeholder="Note (optional)" value={giftNote} onChange={(e) => setGiftNote(e.target.value)} className="h-9 flex-1 min-w-[140px]" />
                    <Button size="sm" onClick={saveGift} disabled={savingGift} className="bg-primary" data-testid="post-gift-save">Save Gift</Button>
                  </div>
                )}
                {giftMode === 'goods' && (
                  <div className="flex flex-wrap gap-2">
                    <Input placeholder="Gift item" value={giftItem} onChange={(e) => setGiftItem(e.target.value)} className="h-9 w-40" data-testid="post-gift-item" />
                    <Input placeholder="Note (optional)" value={giftNote} onChange={(e) => setGiftNote(e.target.value)} className="h-9 flex-1 min-w-[140px]" />
                    <Button size="sm" onClick={saveGift} disabled={savingGift} className="bg-primary" data-testid="post-gift-save">Save Gift</Button>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCheckedIn(null)} className="bg-primary" data-testid="post-checkin-done-btn">Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border border-primary/15 bg-white p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            data-testid={`mode-${t.key}`}
            onClick={() => setMode(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition',
              mode === t.key ? 'bg-primary text-primary-foreground shadow' : 'text-foreground/70 hover:bg-muted'
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <div data-testid={`mode-content-${mode}`}>
        {mode === 'camera' && (
          <CheckInClient invitations={checkinInvitations} devices={devs} operator={operator} deviceId={deviceId} hideSetup onCheckedIn={(g, c, cid) => openPostCheckin(g, c, cid)} />
        )}
        {mode === 'device' && (
          <DeviceScanClient invitations={checkinInvitations} devices={devs} operator={operator} deviceId={deviceId} hideSetup onCheckedIn={(g, c, cid) => openPostCheckin(g, c, cid)} />
        )}
        {mode === 'manual' && (
          <AttendanceClient invitations={attendanceInvitations} devices={attendanceDevices} categories={categories} operator={operator} />
        )}
      </div>
    </div>
  );
}
