"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, ChevronUp, ChevronDown } from "lucide-react";

export default function CategoriesEditor({ invitationId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const base = `/api/invitations/${invitationId}/categories`;

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
    const r = await fetch(`${base}/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    if (!r.ok) {
      const d = await r.json();
      toast.error(d.error || "Gagal mengubah nama");
      load();
    }
  };

  const move = async (index, dir) => {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[index], next[j]] = [next[j], next[index]];
    setItems(next); // optimistic update
    const r = await fetch(base, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((x) => x.id) }),
    });
    if (!r.ok) {
      toast.error("Gagal mengubah urutan");
      load();
    }
  };

  const del = async (c) => {
    let url = `${base}/${c.id}`;
    if (c.guestCount > 0) {
      const others = items.filter((x) => x.id !== c.id);
      const target = prompt(
        `"${c.name}" digunakan oleh ${c.guestCount} tamu. Masukkan nama kategori tujuan untuk memindahkan mereka, atau kosongkan untuk melepas kategori:`,
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
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-xl font-semibold">Kategori Tamu</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Urutan dari atas ke bawah menentukan antrian sapa tamu di TV. Kategori
          paling atas disapa lebih dulu.
        </p>
      </div>

      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Belum ada kategori. Tambahkan di bawah.
          </p>
        )}
        {items.map((c, i) => (
          <div
            key={c.id}
            className="flex items-center gap-2 p-2 border rounded-lg bg-gray-50/50"
          >
            <span className="w-5 text-center text-xs text-muted-foreground">
              {i + 1}
            </span>
            <div className="flex flex-col">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="disabled:opacity-30"
                aria-label="Naikkan"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={i === items.length - 1}
                onClick={() => move(i, 1)}
                className="disabled:opacity-30"
                aria-label="Turunkan"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </div>
            <Input
              className="h-8 text-sm flex-1"
              defaultValue={c.name}
              onBlur={(e) =>
                e.target.value !== c.name && rename(c, e.target.value)
              }
            />
            <span className="text-xs text-muted-foreground">
              {c.guestCount} tamu
            </span>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="h-7 w-7"
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
          placeholder="Nama sisi/kategori baru"
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Button type="button" onClick={add} className="bg-primary">
          <Plus className="h-4 w-4 mr-1" />
          Tambah
        </Button>
      </div>
    </div>
  );
}
