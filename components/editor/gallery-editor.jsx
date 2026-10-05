"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Trash2, GripVertical, Link as LinkIcon } from "lucide-react";

// ---------------------------------------------------------------------------
// Util gambar: perbaikan untuk link Google Drive & placeholder yang gagal load
// (sama seperti di ImagePicker milik InvitationEditor — disalin di sini karena
// file ini berdiri sendiri).
// ---------------------------------------------------------------------------

const IMG_ERROR_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>
      <rect width='100%' height='100%' fill='#f1e5d8'/>
      <text x='50%' y='50%' font-family='sans-serif' font-size='11' fill='#8b6f47' text-anchor='middle' dominant-baseline='middle'>Gagal memuat</text>
    </svg>`,
  );

// Ambil file ID dari berbagai format link Google Drive:
//  - https://drive.google.com/file/d/FILE_ID/view?usp=sharing
//  - https://drive.google.com/open?id=FILE_ID
//  - https://drive.google.com/uc?id=FILE_ID&export=view
//  - https://docs.google.com/uc?id=FILE_ID
function extractGoogleDriveId(url) {
  if (!url) return null;
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/thumbnail\?.*?[?&]id=([a-zA-Z0-9_-]+)/,
    /(?:drive|docs)\.google\.com\/uc\?.*?[?&]id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?.*?[?&]id=([a-zA-Z0-9_-]+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m && m[1]) return m[1];
  }
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return idMatch ? idMatch[1] : null;
}

// Link Google Drive biasa (…/view) adalah halaman preview, BUKAN link gambar
// langsung, sehingga <img src> selalu gagal. Di sini otomatis dikonversi ke
// endpoint thumbnail Google Drive yang bisa langsung ditampilkan sebagai <img>.
// Link gambar non-Drive (Cloudinary, S3, dsb.) dikembalikan apa adanya.
function normalizeImageUrl(url) {
  const trimmed = (url || "").trim();
  if (!trimmed) return trimmed;
  if (
    trimmed.includes("drive.google.com") ||
    trimmed.includes("docs.google.com")
  ) {
    const id = extractGoogleDriveId(trimmed);
    if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
  }
  return trimmed;
}

export default function GalleryEditor({ invitationId, initial, onChange }) {
  const [items, setItems] = useState(initial);
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const refresh = async () => {
    const res = await fetch(`/api/invitations/${invitationId}/gallery`);
    const data = await res.json();
    setItems(data.items || []);
    onChange?.();
  };

  const addUrl = async () => {
    if (!url) return;
    // Konversi link Google Drive ke link gambar langsung SEBELUM disimpan,
    // supaya data yang tersimpan di database juga sudah benar (bukan cuma
    // pratinjaunya di editor ini).
    const normalized = normalizeImageUrl(url);
    const res = await fetch(`/api/invitations/${invitationId}/gallery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: normalized }),
    });
    if (!res.ok) return toast.error("Gagal menambahkan foto");
    setUrl("");
    refresh();
  };
  const uploadFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", f);
    fd.append("kind", "image");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) return toast.error(data.error || "Unggah gagal");
    await fetch(`/api/invitations/${invitationId}/gallery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: data.url }),
    });
    refresh();
    e.target.value = "";
  };
  const removeItem = async (id) => {
    await fetch(`/api/invitations/${invitationId}/gallery/${id}`, {
      method: "DELETE",
    });
    refresh();
  };

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-semibold">Galeri</h2>
      <div className="rounded-lg border border-dashed p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Cara 1 — Unggah File
        </p>
        <label className="flex items-center gap-2 cursor-pointer">
          <Button asChild variant="outline" size="sm" disabled={uploading}>
            <span>
              <Upload className="h-3.5 w-3.5 mr-1" />
              {uploading ? "Mengunggah…" : "Pilih Gambar"}
            </span>
          </Button>
          <input type="file" accept="image/*" hidden onChange={uploadFile} />
        </label>
      </div>
      <div className="rounded-lg border border-dashed p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Cara 2 — Tempel URL Publik
        </p>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://... (Cloudinary, Google Drive, S3, dll.)"
          />
          <Button size="sm" onClick={addUrl}>
            <LinkIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Link berbagi Google Drive otomatis dikonversi ke link gambar langsung.
          Pastikan akses filenya diatur ke "Anyone with the link".
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((g) => (
          <GalleryThumb key={g.id} item={g} onRemove={() => removeItem(g.id)} />
        ))}
      </div>
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          Belum ada foto di galeri.
        </p>
      )}
    </div>
  );
}

function GalleryThumb({ item, onRemove }) {
  const [errored, setErrored] = useState(false);
  // Menormalkan lagi saat render supaya foto lama yang sempat tersimpan
  // mentah (link Google Drive belum dikonversi) tetap tampil tanpa perlu
  // dihapus & ditambah ulang.
  const src = errored ? IMG_ERROR_PLACEHOLDER : normalizeImageUrl(item.url);

  return (
    <div className="relative group aspect-square rounded-lg overflow-hidden border">
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover"
        onError={() => setErrored(true)}
      />
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
        aria-label="Hapus foto"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}
