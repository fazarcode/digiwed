"use client";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, ArrowUp, ArrowDown } from "lucide-react";

const TYPES = ["text", "textarea", "email", "phone", "number", "select", "radio", "checkbox"];
const HAS_OPTS = ["select", "radio", "checkbox"];

export default function RsvpFieldsEditor({ invitationId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const timers = useRef({});
  const base = `/api/invitations/${invitationId}/rsvp-fields`;

  useEffect(() => { (async () => {
    try { const r = await fetch(base); const d = await r.json(); if (r.ok) setItems(d.items || []); }
    catch { toast.error("Failed to load RSVP fields"); } finally { setLoading(false); }
  })(); /* eslint-disable-next-line */ }, []);

  const add = async () => {
    const r = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: "New Field", type: "text" }) });
    const d = await r.json(); if (!r.ok) return toast.error(d.error || "Failed");
    setItems((x) => [...x, d.item]);
  };
  const persist = (id, patch) => {
    if (timers.current[id]) clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      const r = await fetch(`${base}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      if (!r.ok) { const d = await r.json(); toast.error(d.error || "Save failed"); }
    }, 500);
  };
  const upd = (id, field, value) => { setItems((x) => x.map((f) => f.id === id ? { ...f, [field]: value } : f)); persist(id, { [field]: value }); };
  const updOptions = (id, text) => { const arr = text.split("\n").map((s) => s.trim()).filter(Boolean); setItems((x) => x.map((f) => f.id === id ? { ...f, options: arr } : f)); persist(id, { options: arr }); };
  const del = async (id) => { if (!confirm("Delete this field?")) return; const r = await fetch(`${base}/${id}`, { method: "DELETE" }); if (!r.ok) return toast.error("Delete failed"); setItems((x) => x.filter((f) => f.id !== id)); };
  const move = (i, dir) => { const t = i + dir; if (t < 0 || t >= items.length) return; const n = [...items]; [n[i], n[t]] = [n[t], n[i]]; n.forEach((f, idx) => (f.order = idx * 10)); setItems(n); persist(n[i].id, { order: n[i].order }); persist(n[t].id, { order: n[t].order }); };

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading…</div>;
  return (
    <div className="space-y-4">
      <div><h2 className="font-serif text-xl font-semibold">RSVP Form Fields</h2><p className="text-xs text-muted-foreground mt-0.5">Custom fields shown in addition to the standard name/attendance/message.</p></div>
      {items.length === 0 && <div className="text-sm text-muted-foreground border border-dashed rounded-xl p-6 text-center">No custom fields yet.</div>}
      <div className="space-y-4">
        {items.map((f, i) => (
          <div key={f.id} className="p-4 border rounded-xl bg-gray-50/50 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Input className="h-8 text-sm font-medium" value={f.label || ""} onChange={(e) => upd(f.id, "label", e.target.value)} placeholder="Field label" />
              <div className="flex items-center gap-1 shrink-0">
                <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
                <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => move(i, 1)} disabled={i === items.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
                <Button type="button" variant="destructive" size="icon" className="h-7 w-7" onClick={() => del(f.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Type</Label>
                <select className="w-full h-8 text-sm rounded-md border px-2" value={f.type} onChange={(e) => upd(f.id, "type", e.target.value)}>
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div><Label className="text-xs">Placeholder</Label><Input className="h-8 text-sm" value={f.placeholder || ""} onChange={(e) => upd(f.id, "placeholder", e.target.value)} /></div>
            </div>
            {HAS_OPTS.includes(f.type) && (
              <div><Label className="text-xs">Options (one per line)</Label>
                <Textarea rows={3} className="text-sm" value={(f.options || []).join("\n")} onChange={(e) => updOptions(f.id, e.target.value)} placeholder={"Attending\nNot Attending"} />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={!!f.required} onChange={(e) => upd(f.id, "required", e.target.checked)} />Required</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={f.enabled !== false} onChange={(e) => upd(f.id, "enabled", e.target.checked)} />Enabled</label>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" className="w-full border-dashed" onClick={add}><Plus className="h-4 w-4 mr-1" />Add Field</Button>
    </div>
  );
}
