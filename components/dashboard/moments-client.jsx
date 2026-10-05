"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import MomentsCustomizer from "@/components/editor/moments-customizer";
import {
  Trash2,
  Download,
  QrCode as QrIcon,
  Copy,
  ExternalLink,
  Camera,
} from "lucide-react";

// Format tanggal tetap (zona waktu tetap) agar tidak terjadi hydration mismatch
const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

const formatDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : dateFormatter.format(d);
};

export default function MomentsClient({ invitations }) {
  const router = useRouter();

  const [selectedId, setSelectedId] = useState(invitations[0]?.id || "");

  // Fallback ke undangan pertama jika undangan terpilih sudah tidak ada
  const selected = useMemo(
    () =>
      invitations.find((i) => i.id === selectedId) || invitations[0] || null,
    [invitations, selectedId],
  );

  const [showQr, setShowQr] = useState(false);
  const [zoom, setZoom] = useState(null);

  // FIX HYDRATION:
  // Jangan menggunakan window.location.origin saat render.
  // URL relatif akan sama antara server dan client.
  const publicUrl = selected ? `/moments/${selected.slug}` : "";

  const del = async (mid) => {
    if (!selected) return;

    if (!confirm("Hapus foto ini? Tindakan ini tidak dapat dibatalkan."))
      return;

    try {
      const res = await fetch(
        `/api/invitations/${selected.id}/moments/${mid}`,
        { method: "DELETE" },
      );

      if (!res.ok) throw new Error();

      toast.success("Foto berhasil dihapus");
      router.refresh();
    } catch {
      toast.error("Gagal menghapus foto");
    }
  };

  const downloadAll = () => {
    if (!selected) return;

    window.open(
      `/api/invitations/${selected.id}/moments/download-all`,
      "_blank",
    );
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Tautan unggah berhasil disalin");
    } catch {
      toast.error("Gagal menyalin tautan. Salin secara manual.");
    }
  };

  if (invitations.length === 0) {
    return (
      <div className="rounded-2xl bg-white border p-12 text-center">
        <p className="text-muted-foreground">
          Buat undangan terlebih dahulu, setelah itu tamu dapat mengunggah
          momen.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      {/* LIST UNDANGAN */}
      <div className="lg:col-span-1 rounded-2xl bg-white border p-4 space-y-1 h-fit">
        <p className="text-xs uppercase tracking-widest text-muted-foreground px-2 pb-2">
          Undangan Anda
        </p>

        {invitations.map((i) => (
          <button
            key={i.id}
            type="button"
            data-testid={`moments-inv-${i.id}`}
            onClick={() => setSelectedId(i.id)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${
              selected?.id === i.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            <p className="font-medium">
              {[i.brideName, i.groomName].filter(Boolean).join(" & ") ||
                "Tanpa nama"}
            </p>

            <p className="text-xs opacity-70">{i.moments?.length || 0} foto</p>
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="lg:col-span-3 space-y-4">
        {/* CUSTOMIZER */}
        {selected && (
          <div
            className="rounded-2xl bg-white border p-5"
            data-testid="moments-customize-card"
          >
            {/* key agar state form ter-reset saat berganti undangan */}
            <MomentsCustomizer key={selected.id} inv={selected} />
          </div>
        )}

        {/* PUBLIC URL */}
        <div className="rounded-2xl bg-white border p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              URL Unggah Publik
            </p>

            <p
              className="font-mono text-sm truncate max-w-[420px]"
              data-testid="moments-public-url"
            >
              {publicUrl}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={copyLink}
              data-testid="copy-moments-link"
            >
              <Copy className="h-4 w-4 mr-1.5" />
              Salin Tautan
            </Button>

            <Button variant="outline" asChild>
              <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Pratinjau
              </a>
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowQr(true)}
              data-testid="show-moments-qr"
            >
              <QrIcon className="h-4 w-4 mr-1.5" />
              Tampilkan QR
            </Button>

            <Button
              className="bg-primary"
              onClick={downloadAll}
              disabled={!selected?.moments?.length}
              data-testid="download-all-moments"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Unduh Semua
            </Button>
          </div>
        </div>

        {/* GALLERY */}
        <div className="rounded-2xl bg-white border p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            {selected?.moments?.length || 0} foto
          </p>

          {selected?.moments?.length ? (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {selected.moments.map((m) => (
                <div
                  key={m.id}
                  className="group rounded-xl border border-primary/10 overflow-hidden bg-muted/20"
                  data-testid={`moment-${m.id}`}
                >
                  <button
                    type="button"
                    onClick={() => setZoom(m)}
                    className="block w-full aspect-square bg-black/5"
                  >
                    <img
                      src={m.url}
                      alt={m.senderName || "Foto tamu"}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>

                  <div className="p-2 text-xs">
                    <p className="font-medium truncate">
                      {m.senderName || "Anonim"}
                    </p>

                    <p className="text-muted-foreground">
                      {formatDate(m.createdAt)}
                    </p>

                    {m.message && (
                      <p className="italic mt-1 line-clamp-2">
                        &ldquo;{m.message}&rdquo;
                      </p>
                    )}

                    <div className="flex justify-between pt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        asChild
                        aria-label="Unduh foto"
                      >
                        <a href={m.url} download>
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => del(m.id)}
                        aria-label="Hapus foto"
                        data-testid={`delete-moment-${m.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Camera className="h-12 w-12 mx-auto mb-3 opacity-30" />

              <p>
                Belum ada momen. Bagikan kode QR kepada tamu di lokasi acara.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* DIALOG QR */}
      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Momen Acara</DialogTitle>

            <DialogDescription>
              Tamu dapat memindai kode ini untuk mengunggah foto, tanpa perlu
              login.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-3">
              <img
                src={`/api/invitations/${selected.id}/moments-qr`}
                alt="QR Momen"
                className="w-full rounded-lg border"
              />

              <p className="text-xs text-muted-foreground text-center break-all">
                {publicUrl}
              </p>

              <Button className="w-full bg-primary" asChild>
                <a href={`/api/invitations/${selected.id}/moments-qr`} download>
                  <Download className="h-4 w-4 mr-1.5" />
                  Unduh QR
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG ZOOM FOTO */}
      <Dialog open={!!zoom} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="max-w-3xl">
          {zoom && (
            <>
              <DialogHeader>
                <DialogTitle>{zoom.senderName || "Anonim"}</DialogTitle>

                <DialogDescription>
                  {formatDate(zoom.createdAt)}
                </DialogDescription>
              </DialogHeader>

              <img
                src={zoom.url}
                alt={zoom.senderName || "Foto tamu"}
                className="w-full rounded-lg"
              />

              {zoom.message && (
                <p className="italic text-sm">&ldquo;{zoom.message}&rdquo;</p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
