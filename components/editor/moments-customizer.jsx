"use client";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import MomentsHero from "@/components/moments/moments-hero";

// Req 9A — pemilik dapat menyesuaikan landing Photo Moments dengan pratinjau langsung.
export default function MomentsCustomizer({ inv }) {
  const [form, setForm] = useState({
    momentsTitle: inv.momentsTitle || "",
    momentsMessage: inv.momentsMessage || "",
  });
  const timer = useRef(null);

  // Selalu kirim seluruh form agar perubahan dalam jeda debounce tidak hilang
  const persist = (next) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/invitations/${inv.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        if (!r.ok) throw new Error();
      } catch {
        toast.error("Gagal menyimpan");
      }
    }, 500);
  };

  const update = (patch) => {
    const next = { ...form, ...patch };
    setForm(next);
    persist(next);
  };

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  const previewInv = {
    brideName: inv.brideName,
    groomName: inv.groomName,
    coverImage: inv.coverImage,
    venue: inv.venue,
    momentsTitle: form.momentsTitle,
    momentsMessage: form.momentsMessage,
  };

  return (
    <div className="space-y-4" data-testid="moments-customizer">
      <div>
        <h2 className="font-serif text-xl font-semibold">
          Halaman Photo Moments
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Sesuaikan halaman pengambilan foto untuk tamu. Perubahan langsung
          terlihat di pratinjau di bawah.
        </p>
      </div>
      <div>
        <Label>Judul</Label>
        <Input
          value={form.momentsTitle}
          onChange={(e) => update({ momentsTitle: e.target.value })}
          placeholder="Momen Acara"
          data-testid="moments-title-input"
        />
      </div>
      <div>
        <Label>Pesan Sambutan</Label>
        <Textarea
          rows={3}
          value={form.momentsMessage}
          onChange={(e) => update({ momentsMessage: e.target.value })}
          placeholder="Bagikan kenangan yang Anda abadikan hari ini…"
          data-testid="moments-message-input"
        />
      </div>
      <a
        href={`/moments/${inv.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary inline-flex items-center gap-1"
      >
        <ExternalLink className="h-3 w-3" />
        Buka halaman publik
      </a>

      <div className="pt-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Pratinjau Langsung
        </p>
        <div
          className="rounded-2xl border overflow-hidden bg-gradient-to-b from-[#FAF7F2] to-[#F5EFE4] pb-6"
          data-testid="moments-live-preview"
        >
          <MomentsHero invitation={previewInv} />
        </div>
      </div>
    </div>
  );
}
