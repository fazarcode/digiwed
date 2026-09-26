"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Wallet, Gift as GiftIcon } from "lucide-react";

// Req 7 — received-gift LEDGER. Money vs Goods entries with optional guest link.
export default function GiftEntriesEditor({ invitationId }) {
  const [items, setItems] = useState([]);
  const [guests, setGuests] = useState([]);
  const [totals, setTotals] = useState({ totalMoney: 0, goodsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("MONEY");
  const [form, setForm] = useState({ amount: "", itemName: "", giverName: "", guestId: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const base = `/api/invitations/${invitationId}/gift-entries`;

  const load = async () => {
    try {
      const r = await fetch(base);
      const d = await r.json();
      if (r.ok) { setItems(d.items || []); setTotals({ totalMoney: d.totalMoney || 0, goodsCount: d.goodsCount || 0 }); }
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };
  const loadGuests = async () => {
    try {
      const r = await fetch(`/api/invitations/${invitationId}/guests`);
      const d = await r.json();
      const list = Array.isArray(d) ? d : (d.items || d.guests || []);
      setGuests(list);
    } catch {}
  };
  useEffect(() => { load(); loadGuests(); /* eslint-disable-next-line */ }, []);

  const add = async () => {
    if (tab === "MONEY" && !form.amount) return toast.error("Enter an amount");
    if (tab === "GOODS" && !form.itemName.trim()) return toast.error("Enter an item name");
    setSaving(true);
    try {
      const body = { kind: tab, giverName: form.giverName || null, guestId: form.guestId || null, notes: form.notes || null };
      if (tab === "MONEY") body.amount = form.amount;
      else body.itemName = form.itemName;
      const r = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      setForm({ amount: "", itemName: "", giverName: "", guestId: "", notes: "" });
      toast.success("Gift recorded");
      load();
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!confirm("Delete this gift record?")) return;
    const r = await fetch(`${base}/${id}`, { method: "DELETE" });
    if (!r.ok) return toast.error("Delete failed");
    setItems((x) => x.filter((i) => i.id !== id));
    load();
  };

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading…</div>;

  return (
    <div className="space-y-4" data-testid="gift-entries-editor">
      <div>
        <h2 className="font-serif text-xl font-semibold">Gift Tracking</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Record gifts received from guests (money or goods). This is a private ledger, separate from the angpau account settings.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border p-3 bg-emerald-50/50">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Total Money</p>
          <p className="text-2xl font-serif" data-testid="gift-total-money">{totals.totalMoney.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border p-3 bg-amber-50/50">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Goods Received</p>
          <p className="text-2xl font-serif" data-testid="gift-total-goods">{totals.goodsCount}</p>
        </div>
      </div>

      <div className="flex gap-1 rounded-lg border p-1 w-fit">
        {["MONEY", "GOODS"].map((k) => (
          <button key={k} type="button" data-testid={`gift-tab-${k}`} onClick={() => setTab(k)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm ${tab === k ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            {k === "MONEY" ? <Wallet className="h-3.5 w-3.5" /> : <GiftIcon className="h-3.5 w-3.5" />}{k === "MONEY" ? "Money" : "Goods"}
          </button>
        ))}
      </div>

      <div className="p-4 border rounded-xl bg-gray-50/50 space-y-3">
        {tab === "MONEY" ? (
          <div><Label className="text-xs">Amount</Label><Input type="number" className="h-8 text-sm" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="500000" data-testid="gift-amount" /></div>
        ) : (
          <div><Label className="text-xs">Item Name</Label><Input className="h-8 text-sm" value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })} placeholder="e.g. Blender" data-testid="gift-item" /></div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div><Label className="text-xs">Giver Name</Label><Input className="h-8 text-sm" value={form.giverName} onChange={(e) => setForm({ ...form, giverName: e.target.value })} placeholder="Optional" data-testid="gift-giver" /></div>
          <div>
            <Label className="text-xs">Link to Guest (optional)</Label>
            <select value={form.guestId} onChange={(e) => setForm({ ...form, guestId: e.target.value })} className="w-full h-8 px-2 rounded-md border text-sm bg-white" data-testid="gift-guest">
              <option value="">—</option>
              {guests.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        </div>
        <div><Label className="text-xs">Notes (optional)</Label><Textarea rows={2} className="text-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="gift-notes" /></div>
        <Button type="button" onClick={add} disabled={saving} className="bg-primary" data-testid="gift-add-btn"><Plus className="h-4 w-4 mr-1" />{saving ? "Saving…" : "Add Record"}</Button>
      </div>

      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground border border-dashed rounded-xl p-6 text-center">No gifts recorded yet.</p>}
        {items.map((e) => (
          <div key={e.id} className="flex items-center gap-3 p-3 border rounded-lg bg-white" data-testid={`gift-row-${e.id}`}>
            {e.kind === "MONEY" ? <Wallet className="h-4 w-4 text-emerald-600" /> : <GiftIcon className="h-4 w-4 text-amber-600" />}
            <div className="flex-1">
              <p className="text-sm font-medium">{e.kind === "MONEY" ? Number(e.amount || 0).toLocaleString() : e.itemName}</p>
              <p className="text-xs text-muted-foreground">{[e.giverName, e.guestName].filter(Boolean).join(" • ") || "Anonymous"}{e.notes ? ` — ${e.notes}` : ""}</p>
            </div>
            <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${e.kind === "MONEY" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{e.kind}</span>
            <Button type="button" variant="destructive" size="icon" className="h-7 w-7" data-testid={`gift-delete-${e.id}`} onClick={() => del(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}
