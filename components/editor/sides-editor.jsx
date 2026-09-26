"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";

// Req 5 — invitation-scoped Guest Sides (independent of Category).
export default function SidesEditor({ invitationId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const base = `/api/invitations/${invitationId}/sides`;

  const load = async () => {
    try {
      const r = await fetch(base);
      const d = await r.json();
      if (r.ok) setItems(d.items || []);
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const add = async () => {
    if (!name.trim()) return;
    const r = await fetch(base, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
    const d = await r.json();
    if (!r.ok) return toast.error(d.error || "Failed");
    setName(""); load();
  };
  const rename = async (c, newName) => {
    if (!newName.trim() || newName === c.name) return;
    const r = await fetch(`${base}/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName.trim() }) });
    if (!r.ok) { const d = await r.json(); toast.error(d.error || "Failed"); }
    load();
  };
  const del = async (c) => {
    let url = `${base}/${c.id}`;
    if (c.guestCount > 0) {
      const others = items.filter((x) => x.id !== c.id);
      const target = prompt(`"${c.name}" is used by ${c.guestCount} guest(s). Enter a side name to reassign them to, or leave blank to unassign:`, others[0]?.name || "");
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
    <div className="space-y-4" data-testid="sides-editor">
      <div>
        <h2 className="font-serif text-xl font-semibold">Guest Sides</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Bride side, Groom side, etc. Independent from Categories. Deleting a side keeps its guests (they become unassigned).</p>
      </div>
      <div className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground border border-dashed rounded-xl p-6 text-center">No sides yet. Add one below.</p>}
        {items.map((c) => (
          <div key={c.id} className="flex items-center gap-2 p-2 border rounded-lg bg-gray-50/50">
            <Input className="h-8 text-sm flex-1" defaultValue={c.name} data-testid={`side-name-${c.id}`} onBlur={(e) => rename(c, e.target.value)} />
            <span className="text-xs text-muted-foreground">{c.guestCount} guest(s)</span>
            <Button type="button" variant="destructive" size="icon" className="h-7 w-7" data-testid={`side-delete-${c.id}`} onClick={() => del(c)}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New side name (e.g. Bride Side)" data-testid="side-new-input" onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button type="button" onClick={add} className="bg-primary" data-testid="side-add-btn"><Plus className="h-4 w-4 mr-1" />Add</Button>
      </div>
    </div>
  );
}
