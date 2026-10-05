"use client";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Save, Copy, Send } from "lucide-react";
import { renderTemplate, buildContext, PLACEHOLDER_LIST } from "@/lib/whatsapp";

const SAMPLE_GUEST = {
  name: "Budi Santoso",
  token: "sample-token",
  quota: 2,
  category: "VIP",
};

// Satu template = editor (kiri) + pratinjau langsung (kanan)
function TemplateCard({
  t,
  onChange,
  onSave,
  onDelete,
  saving,
  deleting,
  invitations,
  selectedId,
  onSelectInvitation,
  origin,
}) {
  const selectedInv = invitations.find((i) => i.id === selectedId);

  const previewCtx = useMemo(() => {
    if (!selectedInv) return null;
    return buildContext({
      invitation: selectedInv,
      guest: selectedInv.sampleGuest || SAMPLE_GUEST,
      origin,
    });
  }, [selectedInv, origin]);

  const preview = useMemo(
    () => renderTemplate(t.body || "", previewCtx || {}),
    [t.body, previewCtx],
  );

  const insertPlaceholder = (ph) => {
    const prev = t.body || "";
    onChange(
      t.id,
      "body",
      `${prev}${prev.endsWith(" ") || prev.length === 0 ? "" : " "}${ph}`,
    );
  };

  const copyPreview = async () => {
    try {
      await navigator.clipboard.writeText(preview);
      toast.success("Pesan berhasil disalin");
    } catch {
      toast.error("Gagal menyalin pesan");
    }
  };

  const openWhatsApp = () => {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(preview)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div
      className="grid gap-6 lg:grid-cols-2"
      data-testid={`template-card-${t.id}`}
    >
      {/* Editor */}
      <div className="space-y-4 rounded-2xl bg-white border border-primary/10 p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Template Anda
          </p>
          <label className="flex items-center gap-1.5 text-xs cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={t.active !== false}
              onChange={(e) => onChange(t.id, "active", e.target.checked)}
            />
            Aktif
          </label>
        </div>

        <div>
          <label className="text-xs text-muted-foreground">Nama template</label>
          <Input
            className="h-9 font-medium mt-1"
            value={t.name}
            onChange={(e) => onChange(t.id, "name", e.target.value)}
            placeholder="Nama template"
            data-testid={`template-name-${t.id}`}
          />
        </div>

        <Textarea
          data-testid={`template-body-${t.id}`}
          rows={12}
          value={t.body}
          onChange={(e) => onChange(t.id, "body", e.target.value)}
          className="font-mono text-sm"
        />

        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            Placeholder — klik untuk menyisipkan
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PLACEHOLDER_LIST.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => insertPlaceholder(p)}
                className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition font-mono"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t">
          <Button
            onClick={() => onSave(t)}
            disabled={saving}
            className="bg-primary"
            data-testid={`save-template-${t.id}`}
          >
            <Save className="h-4 w-4 mr-1.5" />
            {saving ? "Menyimpan…" : "Simpan Template"}
          </Button>
          <Button
            variant="outline"
            onClick={() => onDelete(t.id)}
            disabled={deleting}
            className="text-red-600 hover:text-red-700"
            data-testid={`delete-template-${t.id}`}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            {deleting ? "Menghapus…" : "Hapus"}
          </Button>
        </div>
      </div>

      {/* Pratinjau */}
      <div className="space-y-3 rounded-2xl bg-white border border-primary/10 p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Pratinjau Langsung
          </p>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={copyPreview}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Salin
            </Button>
            <Button size="sm" variant="ghost" onClick={openWhatsApp}>
              <Send className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Buka
              WhatsApp
            </Button>
          </div>
        </div>

        {invitations.length > 1 && (
          <div>
            <label className="text-xs text-muted-foreground">
              Pratinjau untuk undangan:
            </label>
            <select
              value={selectedId}
              onChange={(e) => onSelectInvitation(e.target.value)}
              className="w-full h-9 px-2 rounded-md border text-sm mt-1"
            >
              {invitations.map((i) => (
                <option key={i.id} value={i.id}>
                  {[i.brideName, i.groomName].filter(Boolean).join(" & ") ||
                    "Tanpa nama"}
                </option>
              ))}
            </select>
          </div>
        )}

        {invitations.length === 0 && (
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            Buat undangan terlebih dahulu untuk melihat pratinjau sebenarnya.
            Placeholder akan tetap kosong.
          </div>
        )}

        <div
          className="rounded-lg bg-[#DCF8C6]/40 border border-emerald-100 p-4 whitespace-pre-wrap text-sm leading-relaxed min-h-[300px]"
          data-testid={`template-preview-${t.id}`}
        >
          {preview}
        </div>

        {selectedInv && (
          <p className="text-xs text-muted-foreground">
            Tamu contoh:{" "}
            <span className="font-medium">
              {(selectedInv.sampleGuest || SAMPLE_GUEST).name}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export default function MessageTemplatesManager({ invitations = [] }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedId, setSelectedId] = useState(invitations[0]?.id || "");
  const [origin, setOrigin] = useState("");
  const base = "/api/message-templates";

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const load = async () => {
    try {
      const r = await fetch(base);
      const d = await r.json().catch(() => ({}));
      if (r.ok) setItems(d.items || []);
      else toast.error(d.error || "Gagal memuat template");
    } catch {
      toast.error("Gagal memuat template");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  const add = async () => {
    setAdding(true);
    try {
      const r = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Template Baru",
          body: "Halo {name}, Anda diundang!",
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Gagal menambahkan template");
      setItems((x) => [d.item, ...x]);
      toast.success("Template ditambahkan");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setAdding(false);
    }
  };

  const save = async (t) => {
    setSavingId(t.id);
    try {
      const r = await fetch(`${base}/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: t.name, body: t.body, active: t.active }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || "Gagal menyimpan");
      }
      toast.success("Template berhasil disimpan");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSavingId(null);
    }
  };

  const del = async (id) => {
    if (!confirm("Hapus template ini?")) return;
    setDeletingId(id);
    try {
      const r = await fetch(`${base}/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      setItems((x) => x.filter((t) => t.id !== id));
      toast.success("Template dihapus");
    } catch {
      toast.error("Gagal menghapus template");
    } finally {
      setDeletingId(null);
    }
  };

  const upd = (id, field, value) =>
    setItems((x) => x.map((t) => (t.id === id ? { ...t, [field]: value } : t)));

  if (loading)
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Memuat…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-semibold">
            Template Pesan Saya
          </h2>
          <p className="text-xs text-muted-foreground">
            Pesan WhatsApp / undangan yang dapat dipakai ulang. Placeholder
            seperti {"{name}"} akan diisi otomatis untuk setiap tamu.
          </p>
        </div>
        <Button onClick={add} disabled={adding} className="bg-primary">
          {adding ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-1" />
          )}
          Baru
        </Button>
      </div>

      <div className="space-y-6">
        {items.map((t) => (
          <TemplateCard
            key={t.id}
            t={t}
            onChange={upd}
            onSave={save}
            onDelete={del}
            saving={savingId === t.id}
            deleting={deletingId === t.id}
            invitations={invitations}
            selectedId={selectedId}
            onSelectInvitation={setSelectedId}
            origin={origin}
          />
        ))}

        {items.length === 0 && (
          <div className="text-sm text-muted-foreground border border-dashed rounded-xl p-6 text-center">
            Belum ada template.
          </div>
        )}
      </div>
    </div>
  );
}
