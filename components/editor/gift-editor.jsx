"use client";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, ArrowUp, ArrowDown, Wallet, Gift as GiftIcon } from "lucide-react";

export default function GiftEditor({ invitationId, onChange }) {
  const [gifts, setGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const timers = useRef({});
  const base = `/api/invitations/${invitationId}/gifts`;

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(base);
        const data = await res.json();
        if (res.ok) setGifts(data.items || []);
      } catch { toast.error("Failed to load gifts"); }
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addGift = async (kind) => {
    setAdding(true);
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setGifts((g) => [...g, data.item]);
      onChange?.();
    } catch (e) { toast.error(e.message); }
    finally { setAdding(false); }
  };

  const persist = (id, patch) => {
    if (timers.current[id]) clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      try {
        const res = await fetch(`${base}/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Save failed"); }
        onChange?.();
      } catch (e) { toast.error(e.message); }
    }, 500);
  };

  const updateField = (id, field, value) => {
    setGifts((g) => g.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
    persist(id, { [field]: value });
  };

  const toggleEnabled = (id, enabled) => {
    setGifts((g) => g.map((x) => (x.id === id ? { ...x, enabled } : x)));
    persist(id, { enabled });
  };

  const removeGift = async (id) => {
    if (!confirm("Delete this gift option?")) return;
    try {
      const res = await fetch(`${base}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setGifts((g) => g.filter((x) => x.id !== id));
      onChange?.();
    } catch (e) { toast.error(e.message); }
  };

  const move = async (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= gifts.length) return;
    const next = [...gifts];
    [next[index], next[target]] = [next[target], next[index]];
    setGifts(next);
    // Reassign sequential order and persist the two affected records.
    next.forEach((g, i) => { g.order = i * 10; });
    persist(next[index].id, { order: next[index].order });
    persist(next[target].id, { order: next[target].order });
    onChange?.();
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading gifts…</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-xl font-semibold">Gift / Angpau</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Add money (bank/e-wallet) or goods (gift registry) options for your guests.
        </p>
      </div>

      {gifts.length === 0 && (
        <div className="text-sm text-muted-foreground border border-dashed rounded-xl p-6 text-center">
          No gift options yet. Add one below.
        </div>
      )}

      <div className="space-y-4">
        {gifts.map((g, index) => (
          <div key={g.id} className="p-4 border rounded-xl bg-gray-50/50 space-y-3 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {g.kind === "MONEY" ? <Wallet className="h-4 w-4 text-primary" /> : <GiftIcon className="h-4 w-4 text-primary" />}
                <select
                  value={g.kind}
                  onChange={(e) => updateField(g.id, "kind", e.target.value)}
                  className="h-8 text-sm rounded-md border px-2"
                >
                  <option value="MONEY">Money</option>
                  <option value="GOODS">Goods / Item</option>
                </select>
              </div>
              <div className="flex items-center gap-1">
                <label className="flex items-center gap-1 text-xs mr-1 cursor-pointer">
                  <input type="checkbox" checked={g.enabled !== false} onChange={(e) => toggleEnabled(g.id, e.target.checked)} />
                  Enabled
                </label>
                <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
                <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => move(index, 1)} disabled={index === gifts.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
                <Button type="button" variant="destructive" size="icon" className="h-7 w-7" onClick={() => removeGift(g.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>

            {g.kind === "MONEY" ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Provider / Bank</Label>
                    <Input className="h-8 text-sm" value={g.provider || ""} onChange={(e) => updateField(g.id, "provider", e.target.value)} placeholder="BCA / OVO / GoPay" />
                  </div>
                  <div>
                    <Label className="text-xs">Account Name</Label>
                    <Input className="h-8 text-sm" value={g.accountName || ""} onChange={(e) => updateField(g.id, "accountName", e.target.value)} placeholder="Account holder" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Account Number</Label>
                  <Input className="h-8 text-sm" value={g.accountNumber || ""} onChange={(e) => updateField(g.id, "accountNumber", e.target.value)} placeholder="1234567890" />
                </div>
                <div>
                  <Label className="text-xs">Instructions (optional)</Label>
                  <Textarea rows={2} className="text-sm" value={g.instructions || ""} onChange={(e) => updateField(g.id, "instructions", e.target.value)} placeholder="Any note for guests" />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Item Name</Label>
                  <Input className="h-8 text-sm" value={g.itemName || ""} onChange={(e) => updateField(g.id, "itemName", e.target.value)} placeholder="e.g. Kitchen set" />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea rows={2} className="text-sm" value={g.description || ""} onChange={(e) => updateField(g.id, "description", e.target.value)} placeholder="Details about the item" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Link (optional)</Label>
                    <Input className="h-8 text-sm" value={g.link || ""} onChange={(e) => updateField(g.id, "link", e.target.value)} placeholder="https://registry..." />
                  </div>
                  <div>
                    <Label className="text-xs">Recipient (optional)</Label>
                    <Input className="h-8 text-sm" value={g.recipientName || ""} onChange={(e) => updateField(g.id, "recipientName", e.target.value)} placeholder="Send to..." />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1 border-dashed" onClick={() => addGift("MONEY")} disabled={adding}>
          <Plus className="h-4 w-4 mr-1" />Add Money
        </Button>
        <Button type="button" variant="outline" className="flex-1 border-dashed" onClick={() => addGift("GOODS")} disabled={adding}>
          <Plus className="h-4 w-4 mr-1" />Add Goods
        </Button>
      </div>
    </div>
  );
}
