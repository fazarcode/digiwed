"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Trash2, Link as LinkIcon, Youtube } from "lucide-react";

// ---------------------------------------------------------------------------
// Util link Google Drive untuk FILE VIDEO (bukan YouTube/Vimeo).
// Sama seperti audio: link share Drive (…/view) adalah halaman preview,
// bukan file video langsung, jadi otomatis dikonversi ke endpoint unduh
// mentah supaya bisa diputar via tag <video>.
// ---------------------------------------------------------------------------

function extractGoogleDriveId(url) {
  if (!url) return null;
  const patterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/uc\?.*?[?&]id=([a-zA-Z0-9_-]+)/,
    /docs\.google\.com\/uc\?.*?[?&]id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?.*?[?&]id=([a-zA-Z0-9_-]+)/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m && m[1]) return m[1];
  }
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return idMatch ? idMatch[1] : null;
}

// PENTING: untuk file Drive di atas ±25MB, Google akan menampilkan halaman
// konfirmasi "tidak dapat memindai virus" alih-alih file mentahnya, jadi tetap
// gagal diputar walau linknya sudah benar format — untuk video berukuran
// besar, sebaiknya unggah langsung lewat Cara 1.
function normalizeVideoUrl(url) {
  const trimmed = (url || "").trim();
  if (!trimmed) return trimmed;
  if (
    trimmed.includes("drive.google.com") ||
    trimmed.includes("docs.google.com")
  ) {
    const id = extractGoogleDriveId(trimmed);
    if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
  }
  return trimmed;
}

export default function VideoEditor({ invitationId, initial, onChange }) {
  const [items, setItems] = useState(initial);
  const [url, setUrl] = useState("");

  const refresh = async () => {
    const res = await fetch(`/api/invitations/${invitationId}/video`);
    const data = await res.json();
    setItems(data.items || []);
    onChange?.();
  };
  const add = async (u = url) => {
    if (!u) return;
    let type = "MP4";
    if (u.includes("youtube") || u.includes("youtu.be")) type = "YOUTUBE";
    else if (u.includes("vimeo")) type = "VIMEO";
    // Google Drive bukan YouTube/Vimeo, jadi masuk kategori MP4 — link-nya
    // dikonversi dulu ke file langsung sebelum disimpan.
    const normalizedUrl = type === "MP4" ? normalizeVideoUrl(u) : u;
    const res = await fetch(`/api/invitations/${invitationId}/video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: normalizedUrl, type }),
    });
    if (!res.ok) return toast.error("Gagal menambahkan video");
    setUrl("");
    refresh();
  };
  const uploadFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append("file", f);
    fd.append("kind", "video");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Unggah gagal");
    await add(data.url);
    e.target.value = "";
  };
  const removeItem = async (id) => {
    await fetch(`/api/invitations/${invitationId}/video/${id}`, {
      method: "DELETE",
    });
    refresh();
  };

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-semibold">Video</h2>
      <div className="rounded-lg border border-dashed p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Cara 1 — Unggah MP4
        </p>
        <label>
          <Button asChild variant="outline" size="sm">
            <span>
              <Upload className="h-3.5 w-3.5 mr-1" />
              Pilih File Video
            </span>
          </Button>
          <input
            type="file"
            accept="video/mp4,video/webm"
            hidden
            onChange={uploadFile}
          />
        </label>
      </div>
      <div className="rounded-lg border border-dashed p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
          Cara 2 — URL YouTube / Vimeo / MP4
        </p>
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL YouTube / Vimeo / MP4 (atau link Google Drive)"
          />
          <Button size="sm" onClick={() => add()}>
            <LinkIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Link berbagi Google Drive otomatis dikonversi ke link file langsung.
          Pastikan akses filenya "Anyone with the link", dan untuk video di atas
          ±25MB sebaiknya unggah langsung lewat Cara 1.
        </p>
      </div>
      <div className="space-y-2">
        {items.map((v) => (
          <div
            key={v.id}
            className="flex items-center gap-2 p-2 border rounded-lg"
          >
            <Youtube className="h-4 w-4 text-red-600" />
            <div className="flex-1 text-xs truncate">{v.url}</div>
            <span className="text-[10px] px-2 py-0.5 bg-muted rounded">
              {v.type}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => removeItem(v.id)}
              aria-label="Hapus video"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Belum ada video ditambahkan.
          </p>
        )}
      </div>
    </div>
  );
}
