"use client";
import { useMemo, useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Copy, Save, RotateCcw, Send } from "lucide-react";
import { toast } from "sonner";
import { renderTemplate, buildContext, PLACEHOLDER_LIST } from "@/lib/whatsapp";

export default function MessageTemplateClient({
  initialTemplate,
  defaultTemplate,
  isCustom,
  invitations,
}) {
  const [template, setTemplate] = useState(initialTemplate);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(invitations[0]?.id || "");
  const selectedInv = invitations.find((i) => i.id === selectedId);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const previewCtx = useMemo(() => {
    if (!selectedInv) return null;
    const guest = selectedInv.sampleGuest || {
      name: "Budi Santoso",
      token: "sample-token",
      quota: 2,
      category: "VIP",
    };
    return buildContext({ invitation: selectedInv, guest, origin });
  }, [selectedInv, origin]);

  const preview = useMemo(
    () => renderTemplate(template, previewCtx || {}),
    [template, previewCtx],
  );

  const insertPlaceholder = (ph) => {
    setTemplate(
      (prev) =>
        `${prev}${prev.endsWith(" ") || prev.length === 0 ? "" : " "}${ph}`,
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/message-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      toast.success("Template pesan berhasil disimpan");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!confirm("Kembalikan ke template bawaan? Perubahan Anda akan diganti."))
      return;
    try {
      const res = await fetch("/api/message-template", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error();
      setTemplate(data.template || defaultTemplate);
      toast.success("Template dikembalikan ke bawaan");
    } catch {
      toast.error("Gagal mengembalikan template");
    }
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
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Editor */}
      <div className="space-y-4 rounded-2xl bg-white border border-primary/10 p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Template Anda
          </p>
          {isCustom && (
            <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
              Kustom
            </span>
          )}
        </div>
        <Textarea
          data-testid="message-template-textarea"
          rows={16}
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
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
                data-testid={`insert-placeholder-${p.replace(/[{}]/g, "")}`}
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
            data-testid="save-template-btn"
            onClick={save}
            disabled={saving}
            className="bg-primary"
          >
            <Save className="h-4 w-4 mr-1.5" />
            {saving ? "Menyimpan…" : "Simpan Template"}
          </Button>
          <Button
            data-testid="reset-template-btn"
            onClick={reset}
            variant="outline"
          >
            <RotateCcw className="h-4 w-4 mr-1.5" /> Kembalikan ke Bawaan
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
            <Button
              data-testid="copy-preview-btn"
              size="sm"
              variant="ghost"
              onClick={copyPreview}
            >
              <Copy className="h-3.5 w-3.5 mr-1" /> Salin
            </Button>
            <Button
              data-testid="open-whatsapp-btn"
              size="sm"
              variant="ghost"
              onClick={openWhatsApp}
            >
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
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full h-9 px-2 rounded-md border text-sm mt-1"
              data-testid="preview-invitation-select"
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
          data-testid="message-preview"
        >
          {preview}
        </div>

        {selectedInv?.sampleGuest && (
          <p className="text-xs text-muted-foreground">
            Tamu contoh:{" "}
            <span className="font-medium">{selectedInv.sampleGuest.name}</span>
          </p>
        )}
      </div>
    </div>
  );
}
