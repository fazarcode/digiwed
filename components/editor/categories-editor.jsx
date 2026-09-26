"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";

export default function CategoriesEditor({ invitationId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const base = `/api/invitations/${invitationId}/categories`;

  const load = async () => {
    try { const r = await fetch(base); const d = await r.json(); if (r.ok) setItems(d.items || []); }
    catch { toast.error("Failed to load"); } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const add = async () => {
    if (!name.trim()) return;
    const r = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
    const d = await r.json(); if (!r.ok) return toast.error(d.error || "Failed");
    setName(""); load();
  };
  const rename = async (c, newName) => {
    const r = await fetch(`${base}/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName }) });
    if (!r.ok) { const d = await r.json(); toast.error(d.error || "Failed"); load(); }
  };
  const del = async (c) => {
    let url = `${base}/${c.id}`;
    if (c.guestCount > 0) {
      const others = items.filter((x) => x.id !== c.id);
      const target = prompt(`"${c.name}" is used by ${c.guestCount} guest(s). Enter a category name to reassign them to, or leave blank to unassign:`, others[0]?.name || "");
      if (target === null) return;
      const match = others.find((x) => x.name.toLowerCase() === target.trim().toLowerCase());
      url += `?reassignTo=${target.trim() ? (match ? match.id : "null") : "null"}`;
    }
    const r = await fetch(url, { method: "DELETE" });
    if (!r.ok) { const d = await r.json(); return toast.error(d.error || "Delete failed"); }
    toast.success("Deleted"); load();
  };

  if (loading) return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading…</div>;
  return (
    <div className="space-y-4">
      <div><h2 className="font-serif text-xl font-semibold">Guest Sides / Categories</h2><p className="text-xs text-muted-foreground mt-0.5">Global (shared) categories are admin-managed. Add your own invitation-specific ones below.</p></div>
      <div className="space-y-2">
        {items.map((c) => (
          <div key={c.id} className="flex items-center gap-2 p-2 border rounded-lg bg-gray-50/50">
            {c.global ? (
              <><span className="flex-1 text-sm px-2">{c.name}</span><span className="text-[10px] uppercase tracking-wide bg-muted px-2 py-0.5 rounded-full">Global</span></>
            ) : (
              <>
                <Input className="h-8 text-sm flex-1" defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && rename(c, e.target.value)} />
                <span className="text-xs text-muted-foreground">{c.guestCount} guest(s)</span>
                <Button type="button" variant="destructive" size="icon" className="h-7 w-7" onClick={() => del(c)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New side/category name" onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button type="button" onClick={add} className="bg-primary"><Plus className="h-4 w-4 mr-1" />Add</Button>
      </div>
    </div>
  );
}
