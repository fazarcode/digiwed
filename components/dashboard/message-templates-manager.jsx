"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Save } from "lucide-react";

export default function MessageTemplatesManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const base = "/api/message-templates";

  const load = async () => {
    try { const r = await fetch(base); const d = await r.json(); if (r.ok) setItems(d.items || []); }
    catch { toast.error("Failed to load"); } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const add = async () => {
    const r = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "New Template", body: "Hello {name}, you are invited!" }) });
    const d = await r.json(); if (!r.ok) return toast.error(d.error || "Failed"); setItems((x) => [...x, d.item]);
  };
  const save = async (t) => {
    const r = await fetch(`${base}/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: t.name, body: t.body, active: t.active }) });
    if (!r.ok) { const d = await r.json(); return toast.error(d.error || "Save failed"); } toast.success("Saved");
  };
  const del = async (id) => { if (!confirm("Delete this template?")) return; const r = await fetch(`${base}/${id}`, { method: "DELETE" }); if (!r.ok) return toast.error("Delete failed"); setItems((x) => x.filter((t) => t.id !== id)); };
  const upd = (id, field, value) => setItems((x) => x.map((t) => t.id === id ? { ...t, [field]: value } : t));

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading…</div>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="font-serif text-xl font-semibold">My Message Templates</h2><p className="text-xs text-muted-foreground">Reusable WhatsApp / invite messages. Placeholders like {"{name}"} are filled per guest.</p></div>
        <Button onClick={add} className="bg-primary"><Plus className="h-4 w-4 mr-1" />New</Button>
      </div>
      <div className="grid gap-4">
        {items.map((t) => (
          <div key={t.id} className="p-4 border rounded-xl bg-white space-y-3">
            <div className="flex items-center gap-2">
              <Input className="h-9 font-medium" value={t.name} onChange={(e) => upd(t.id, "name", e.target.value)} />
              <label className="flex items-center gap-1 text-xs cursor-pointer shrink-0"><input type="checkbox" checked={t.active !== false} onChange={(e) => upd(t.id, "active", e.target.checked)} />Active</label>
              <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => save(t)}><Save className="h-4 w-4" /></Button>
              <Button variant="destructive" size="icon" className="h-9 w-9" onClick={() => del(t.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <Textarea rows={4} value={t.body} onChange={(e) => upd(t.id, "body", e.target.value)} />
          </div>
        ))}
        {items.length === 0 && <div className="text-sm text-muted-foreground border border-dashed rounded-xl p-6 text-center">No templates yet.</div>}
      </div>
    </div>
  );
}
