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
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load(); /* eslint-disable-next-line */
  }, []);

  const add = async () => {
    if (!name.trim()) return;
    const r = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const d = await r.json();
    if (!r.ok) return toast.error(d.error || "Gagal menambahkan");
    setName("");
    load();
  };
  const rename = async (c, newName) => {
    if (!newName.trim() || newName === c.name) return;
    const r = await fetch(`${base}/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (!r.ok) {
      const d = await r.json();
      toast.error(d.error || "Gagal mengubah nama");
    }
    load();
  };
  const del = async (c) => {
    let url = `${base}/${c.id}`;
    if (c.guestCount > 0) {
      const others = items.filter((x) => x.id !== c.id);
      const target = prompt(
        `"${c.name}" digunakan oleh ${c.guestCount} tamu. Masukkan nama Pihak Tamu tujuan untuk memindahkan mereka, atau kosongkan untuk melepas Pihak Tamu:`,
        others[0]?.name || "",
      );
      if (target === null) return;
      const match = others.find(
        (x) => x.name.toLowerCase() === target.trim().toLowerCase(),
      );
      url += `?reassignTo=${target.trim() ? (match ? match.id : "null") : "null"}`;
    }
    const r = await fetch(url, { method: "DELETE" });
    if (!r.ok) {
      const d = await r.json();
      return toast.error(d.error || "Gagal menghapus");
    }
    toast.success("Berhasil dihapus");
    load();
  };

  if (loading)
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Memuat…
      </div>
    );
  return (
    <div className="space-y-4" data-testid="sides-editor">
      <div>
        <h2 className="font-serif text-xl font-semibold">Pihak Tamu Tamu</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Pihak Tamu mempelai wanita, Pihak Tamu mempelai pria, dan sebagainya.
          Terpisah dari Kategori. Menghapus Pihak Tamu tidak menghapus tamunya
          (tamu menjadi tanpa Pihak Tamu).
        </p>
      </div>
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground border border-dashed rounded-xl p-6 text-center">
            Belum ada Pihak Tamu. Tambahkan di bawah.
          </p>
        )}
        {items.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-2 p-2 border rounded-lg bg-gray-50/50"
          >
            <Input
              className="h-8 text-sm flex-1"
              defaultValue={c.name}
              data-testid={`side-name-${c.id}`}
              onBlur={(e) => rename(c, e.target.value)}
            />
            <span className="text-xs text-muted-foreground">
              {c.guestCount} tamu
            </span>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="h-7 w-7"
              data-testid={`side-delete-${c.id}`}
              onClick={() => del(c)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama Pihak Tamu baru (mis. Pihak Tamu Mempelai Wanita)"
          data-testid="side-new-input"
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Button
          type="button"
          onClick={add}
          className="bg-primary"
          data-testid="side-add-btn"
        >
          <Plus className="h-4 w-4 mr-1" />
          Tambah
        </Button>
      </div>
    </div>
  );
}
