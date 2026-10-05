"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Tv,
  ExternalLink,
  Copy,
  Loader2,
  Upload,
  Trash2,
  WifiOff,
  RotateCcw,
} from "lucide-react";
import TvOfflineOverlay from "./tv-offline-overlay";
import {
  COLOR_SWATCHES,
  DEFAULT_CATEGORY_COLOR,
  normalizeCategoryColors,
  newCategoryId,
  getContrastText,
} from "@/lib/tv-colors";

const PREVIEW_FONT = {
  small: 20,
  medium: 26,
  large: 34,
  xlarge: 44,
};

const HEX_RE = /^#[0-9a-f]{6}$/i;

const keyOf = (s) => String(s).trim().toLowerCase();

// Input hex dengan draft lokal supaya bisa diketik bebas
function HexInput({ value, onCommit }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <Input
      value={draft}
      onChange={(e) => {
        let v = e.target.value.startsWith("#")
          ? e.target.value
          : `#${e.target.value}`;

        v = v.slice(0, 7);

        setDraft(v);

        if (HEX_RE.test(v)) {
          onCommit(v);
        }
      }}
      onBlur={() => setDraft(value)}
      className="h-9 w-24 font-mono text-xs uppercase"
      maxLength={7}
    />
  );
}

export default function GreetingTVSettings({ invitations }) {
  const [selectedId, setSelectedId] = useState(invitations[0]?.id || "");

  const [invs, setInvs] = useState(invitations);

  const [saving, setSaving] = useState(false);

  // =========================================================
  // FIX HYDRATION
  // Jangan membaca window.location.origin saat render pertama.
  // Server tidak memiliki window.
  // =========================================================
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  // State pratinjau
  const [previewMode, setPreviewMode] = useState("idle");
  // 'idle' | 'guest'

  const [previewCatId, setPreviewCatId] = useState("");

  const [showOffline, setShowOffline] = useState(false);

  const selected = invs.find((i) => i.id === selectedId);

  // URL baru dibuat setelah component sudah mount
  const tvUrl = selected && origin ? `${origin}/tv/${selected.id}` : "";

  const update = (patch) =>
    setInvs((list) =>
      list.map((i) => (i.id === selectedId ? { ...i, ...patch } : i)),
    );

  // =========================================================
  // WARNA PER KATEGORI
  // Kategori milik undangan yang dipilih, urut sesuai antrian sapa TV
  // =========================================================

  const savedRules = normalizeCategoryColors(selected?.tvCategoryColors);

  const ownCategories = selected?.guestCategories || [];

  // Nama kategori unik, urutan mengikuti order dari pengaturan kategori
  const existingNames = [
    ...new Map(
      ownCategories.map((category) => [keyOf(category.name), category.name]),
    ).values(),
  ];

  const categories = [
    // =======================================================
    // KATEGORI MILIK UNDANGAN INI
    // =======================================================
    ...existingNames.map((name) => {
      const rule = savedRules.find((r) => keyOf(r.name) === keyOf(name));

      return {
        id: rule?.id || `auto_${keyOf(name)}`,
        name,
        color: rule?.color || DEFAULT_CATEGORY_COLOR,
        hasRule: !!rule,
        orphan: false,
      };
    }),

    // =======================================================
    // RULE LAMA YANG KATEGORINYA SUDAH TIDAK ADA
    // =======================================================
    ...savedRules
      .filter((r) => !existingNames.some((n) => keyOf(n) === keyOf(r.name)))
      .map((r) => ({
        ...r,
        hasRule: true,
        orphan: true,
      })),
  ];

  // =========================================================
  // SET WARNA KATEGORI
  // =========================================================

  const setColor = (name, color) => {
    const exists = savedRules.some((r) => keyOf(r.name) === keyOf(name));

    update({
      tvCategoryColors: exists
        ? savedRules.map((r) =>
            keyOf(r.name) === keyOf(name)
              ? {
                  ...r,
                  color,
                }
              : r,
          )
        : [
            ...savedRules,
            {
              id: newCategoryId(),
              name,
              color,
            },
          ],
    });
  };

  // =========================================================
  // RESET WARNA
  // =========================================================

  const resetColor = (name) =>
    update({
      tvCategoryColors: savedRules.filter((r) => keyOf(r.name) !== keyOf(name)),
    });

  // =========================================================
  // SIMPAN
  // =========================================================

  const save = async () => {
    setSaving(true);

    try {
      const res = await fetch(`/api/tv/${selectedId}/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tvEnabled: selected.tvEnabled,
          tvBackground: selected.tvBackground,
          tvCouplePhoto: selected.tvCouplePhoto,
          tvLogo: selected.tvLogo,
          tvDuration: selected.tvDuration,
          tvSoundEnabled: selected.tvSoundEnabled,
          tvAnimationEnabled: selected.tvAnimationEnabled,
          tvFontSize: selected.tvFontSize,
          tvFullscreen: selected.tvFullscreen,
          tvCategoryColors: savedRules,
        }),
      });

      if (!res.ok) {
        throw new Error();
      }

      toast.success("Pengaturan berhasil disimpan");
    } catch {
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // UPLOAD FILE
  // =========================================================

  const uploadFile = (field) => async (e) => {
    const f = e.target.files?.[0];

    if (!f) return;

    const fd = new FormData();

    fd.append("file", f);
    fd.append("kind", "image");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: fd,
    });

    const data = await res.json();

    if (!res.ok) {
      e.target.value = "";

      return toast.error(data.error || "Gagal mengunggah");
    }

    update({
      [field]: data.url,
    });

    // Simpan otomatis
    try {
      const saveRes = await fetch(`/api/tv/${selectedId}/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [field]: data.url,
        }),
      });

      if (!saveRes.ok) {
        throw new Error();
      }

      toast.success("Berhasil diunggah dan disimpan");
    } catch {
      toast.error(
        "Berhasil diunggah, tetapi gagal menyimpan otomatis — klik Simpan Pengaturan",
      );
    }

    e.target.value = "";
  };

  // =========================================================
  // BELUM ADA UNDANGAN
  // =========================================================

  if (!invitations.length) {
    return (
      <div className="rounded-2xl bg-white border p-12 text-center">
        <p className="text-muted-foreground">Buat undangan terlebih dahulu.</p>
      </div>
    );
  }

  if (!selected) {
    return null;
  }

  // =========================================================
  // DATA PREVIEW
  // =========================================================

  const previewCat =
    categories.find((c) => c.id === previewCatId) || categories[0] || null;

  const accent = previewCat?.color || DEFAULT_CATEGORY_COLOR;

  const fontPx = PREVIEW_FONT[selected.tvFontSize] || PREVIEW_FONT.large;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      {/* =====================================================
          DAFTAR UNDANGAN
      ===================================================== */}

      <div className="lg:col-span-1 rounded-2xl bg-white border p-4 space-y-1 h-fit">
        <p className="text-xs uppercase tracking-widest text-muted-foreground px-2 pb-2">
          Undangan Anda
        </p>

        {invs.map((i) => (
          <button
            key={i.id}
            onClick={() => {
              setSelectedId(i.id);
              setPreviewCatId("");
            }}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${
              selectedId === i.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            <p className="font-medium">
              {i.brideName} & {i.groomName}
            </p>

            <p className="text-xs opacity-70">
              {i.tvEnabled ? "◉ TV Aktif" : "TV Nonaktif"}
            </p>
          </button>
        ))}
      </div>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <div className="lg:col-span-3 space-y-4">
        <div className="rounded-2xl bg-white border p-6 space-y-5">
          {/* =================================================
              TV ENABLE
          ================================================= */}

          <div className="flex items-start gap-3 border-b pb-4">
            <input
              type="checkbox"
              checked={!!selected.tvEnabled}
              onChange={(e) =>
                update({
                  tvEnabled: e.target.checked,
                })
              }
              className="mt-1 h-4 w-4"
              id="tv-en"
            />

            <label htmlFor="tv-en" className="flex-1 cursor-pointer">
              <span className="font-medium">Aktifkan TV Sapaan</span>

              <p className="text-xs text-muted-foreground">
                Jika aktif, kedatangan tamu (check-in) akan langsung ditampilkan
                secara real-time di halaman TV.
              </p>
            </label>
          </div>

          {/* =================================================
              BASIC SETTINGS
          ================================================= */}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Durasi Tampil (detik)</Label>

              <Input
                type="number"
                min={3}
                max={60}
                value={selected.tvDuration}
                onChange={(e) =>
                  update({
                    tvDuration: parseInt(e.target.value, 10) || 7,
                  })
                }
              />
            </div>

            <div>
              <Label>Ukuran Huruf</Label>

              <select
                value={selected.tvFontSize}
                onChange={(e) =>
                  update({
                    tvFontSize: e.target.value,
                  })
                }
                className="w-full h-10 px-3 rounded-md border text-sm"
              >
                <option value="small">Kecil</option>

                <option value="medium">Sedang</option>

                <option value="large">Besar</option>

                <option value="xlarge">Sangat Besar</option>
              </select>
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={!!selected.tvSoundEnabled}
                onChange={(e) =>
                  update({
                    tvSoundEnabled: e.target.checked,
                  })
                }
                id="tv-sound"
              />

              <label htmlFor="tv-sound" className="text-sm">
                Aktifkan suara (denting saat tamu baru datang)
              </label>
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={!!selected.tvAnimationEnabled}
                onChange={(e) =>
                  update({
                    tvAnimationEnabled: e.target.checked,
                  })
                }
                id="tv-anim"
              />

              <label htmlFor="tv-anim" className="text-sm">
                Aktifkan animasi
              </label>
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={!!selected.tvFullscreen}
                onChange={(e) =>
                  update({
                    tvFullscreen: e.target.checked,
                  })
                }
                id="tv-fs"
              />

              <label htmlFor="tv-fs" className="text-sm">
                Otomatis minta mode layar penuh
              </label>
            </div>
          </div>

          {/* =================================================
              WARNA PER KATEGORI
          ================================================= */}

          <div
            className="border-t pt-5 space-y-3"
            data-testid="tv-category-colors"
          >
            <div>
              <p className="font-medium text-sm">
                Warna Sapaan per Kategori Tamu
              </p>

              <p className="text-xs text-muted-foreground">
                Daftar kategori diambil dari kategori tamu undangan ini, dan
                urutannya mengikuti antrian sapa di TV. Pilih warna untuk tiap
                kategori, misalnya <b>VIP</b> berwarna <b>emas</b>. Kategori
                yang belum diberi warna memakai warna bawaan.
              </p>
            </div>

            {categories.length === 0 && (
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
                Belum ada kategori tamu untuk undangan ini. Buat kategori
                terlebih dahulu di editor undangan → Kategori Tamu.
              </p>
            )}

            <div className="space-y-2">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border p-2.5"
                >
                  <div className="w-40 sm:w-48">
                    <p className="text-sm font-medium truncate">{c.name}</p>

                    {c.orphan && (
                      <p className="text-[10px] text-amber-600">
                        Tidak ada di kategori undangan ini
                      </p>
                    )}
                  </div>

                  {/* COLOR PICKER */}

                  <input
                    type="color"
                    value={c.color}
                    onChange={(e) => setColor(c.name, e.target.value)}
                    className="h-9 w-12 rounded-md border cursor-pointer bg-white p-0.5"
                    aria-label={`Pilih warna untuk ${c.name}`}
                  />

                  {/* HEX INPUT */}

                  <HexInput
                    value={c.color}
                    onCommit={(v) => setColor(c.name, v)}
                  />

                  {/* SWATCH */}

                  <div className="flex items-center gap-1">
                    {COLOR_SWATCHES.map((s) => (
                      <button
                        key={s.color}
                        type="button"
                        title={s.label}
                        onClick={() => setColor(c.name, s.color)}
                        className={`h-6 w-6 rounded-full border-2 transition ${
                          c.color.toLowerCase() === s.color.toLowerCase()
                            ? "border-gray-900 scale-110"
                            : "border-white ring-1 ring-gray-200"
                        }`}
                        style={{
                          backgroundColor: s.color,
                        }}
                      />
                    ))}
                  </div>

                  {/* PREVIEW COLOR */}

                  <span
                    className="ml-auto inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: c.color,
                      color: getContrastText(c.color),
                    }}
                  >
                    {c.name}
                  </span>

                  {/* RESET */}

                  {c.hasRule && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => resetColor(c.name)}
                      className="h-8 w-8 p-0"
                      title={
                        c.orphan ? "Hapus aturan" : "Kembalikan ke warna bawaan"
                      }
                    >
                      {c.orphan ? (
                        <Trash2 className="h-4 w-4" />
                      ) : (
                        <RotateCcw className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* =================================================
              GAMBAR
          ================================================= */}

          <div className="grid gap-4 sm:grid-cols-3 border-t pt-5">
            {[
              {
                field: "tvBackground",
                label: "Gambar Latar",
              },
              {
                field: "tvCouplePhoto",
                label: "Foto Pengantin / Banner",
              },
              {
                field: "tvLogo",
                label: "Logo Acara",
              },
            ].map(({ field, label }) => (
              <div key={field}>
                <Label>{label}</Label>

                <div className="flex gap-1">
                  <Input
                    value={selected[field] || ""}
                    onChange={(e) =>
                      update({
                        [field]: e.target.value,
                      })
                    }
                    placeholder="URL atau unggah"
                  />

                  <label>
                    <Button asChild size="sm" variant="outline">
                      <span>
                        <Upload className="h-3.5 w-3.5" />
                      </span>
                    </Button>

                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={uploadFile(field)}
                    />
                  </label>
                </div>

                {selected[field] && (
                  <img
                    src={selected[field]}
                    alt=""
                    className="mt-2 rounded h-20 object-cover w-full"
                  />
                )}
              </div>
            ))}
          </div>

          {/* =================================================
              URL TV + SAVE
          ================================================= */}

          <div className="flex items-center justify-between pt-4 border-t flex-wrap gap-3">
            <div className="space-y-2 text-sm">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                URL Layar TV
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {tvUrl}
                </code>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={!tvUrl}
                  onClick={() => {
                    if (!tvUrl) return;

                    navigator.clipboard.writeText(tvUrl);

                    toast.success("URL berhasil disalin");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>

                <a
                  href={tvUrl || "#"}
                  target="_blank"
                  rel="noopener"
                  onClick={(e) => {
                    if (!tvUrl) {
                      e.preventDefault();
                    }
                  }}
                >
                  <Button size="sm" variant="outline" disabled={!tvUrl}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Buka TV
                  </Button>
                </a>
              </div>
            </div>

            <Button onClick={save} disabled={saving} className="bg-primary">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Menyimpan…
                </>
              ) : (
                <>
                  <Tv className="h-4 w-4 mr-2" />
                  Simpan Pengaturan
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ===================================================
            LIVE PREVIEW
        =================================================== */}

        <div
          className="rounded-2xl bg-white border p-4"
          data-testid="tv-live-preview"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Pratinjau Langsung
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border overflow-hidden text-xs">
                {[
                  {
                    k: "idle",
                    l: "Layar Siaga",
                  },
                  {
                    k: "guest",
                    l: "Sapaan Tamu",
                  },
                ].map((m) => (
                  <button
                    key={m.k}
                    type="button"
                    onClick={() => setPreviewMode(m.k)}
                    className={`px-3 py-1.5 transition ${
                      previewMode === m.k
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    {m.l}
                  </button>
                ))}
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => setShowOffline((v) => !v)}
              >
                <WifiOff className="h-3.5 w-3.5 mr-1" />

                {showOffline
                  ? "Tutup Contoh Pop-up"
                  : "Lihat Pop-up Tanpa Internet"}
              </Button>
            </div>
          </div>

          {/* =================================================
              PREVIEW CATEGORY SELECTOR
          ================================================= */}

          {previewMode === "guest" && categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <span className="text-xs text-muted-foreground">
                Kategori contoh:
              </span>

              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setPreviewCatId(c.id)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold border-2 transition ${
                    previewCat?.id === c.id
                      ? "border-gray-900"
                      : "border-transparent"
                  }`}
                  style={{
                    backgroundColor: c.color,
                    color: getContrastText(c.color),
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {/* =================================================
              TV PREVIEW
          ================================================= */}

          <div
            className="relative rounded-xl overflow-hidden aspect-video bg-cover bg-center flex items-center justify-center text-center text-white"
            style={
              selected.tvBackground
                ? {
                    backgroundImage: `url(${selected.tvBackground})`,
                  }
                : {
                    background:
                      "linear-gradient(135deg,#1a0f08,#3a2418,#5a3820)",
                  }
            }
          >
            {selected.tvBackground && (
              <div className="absolute inset-0 bg-black/40" />
            )}

            {selected.tvLogo && (
              <img
                src={selected.tvLogo}
                alt=""
                className="absolute top-3 left-3 h-8 z-10"
              />
            )}

            {/* ===============================================
                IDLE
            =============================================== */}

            {previewMode === "idle" ? (
              <div className="relative z-10 px-6 py-4">
                {selected.tvCouplePhoto && (
                  <img
                    src={selected.tvCouplePhoto}
                    alt=""
                    className="mx-auto max-h-28 rounded-xl mb-3 shadow-2xl"
                  />
                )}

                <p
                  style={{
                    fontFamily: "Great Vibes, cursive",
                  }}
                  className="text-2xl text-amber-200"
                >
                  Pernikahan
                </p>

                <p
                  style={{
                    fontFamily: "Playfair Display, serif",
                    fontSize: fontPx,
                  }}
                  className="tracking-widest font-bold leading-tight"
                >
                  {selected.brideName || "Mempelai Wanita"} &amp;{" "}
                  {selected.groomName || "Mempelai Pria"}
                </p>

                <div className="mt-3 inline-flex items-center gap-3 text-[11px] text-amber-100/80">
                  <span>⏱ {selected.tvDuration || 7} dtk / tamu</span>

                  <span>
                    {selected.tvSoundEnabled ? "🔊 Suara aktif" : "🔇 Senyap"}
                  </span>

                  <span>
                    {selected.tvAnimationEnabled ? "✨ Beranimasi" : "Statis"}
                  </span>
                </div>
              </div>
            ) : (
              /* =============================================
                 GUEST
              ============================================= */

              <div
                className="relative z-10 mx-6 px-8 py-5 rounded-2xl bg-black/55 backdrop-blur-sm"
                style={{
                  border: `3px solid ${accent}`,
                  boxShadow: `0 0 40px ${accent}88`,
                }}
              >
                <p
                  style={{
                    fontFamily: "Great Vibes, cursive",
                    color: accent,
                  }}
                  className="text-2xl"
                >
                  Selamat Datang
                </p>

                <p
                  style={{
                    fontFamily: "Playfair Display, serif",
                    fontSize: fontPx,
                  }}
                  className="font-bold leading-tight my-1"
                >
                  Budi Santoso
                </p>

                <span
                  className="inline-block rounded-full px-4 py-1 text-xs font-bold tracking-widest uppercase"
                  style={{
                    backgroundColor: accent,
                    color: getContrastText(accent),
                  }}
                >
                  {previewCat?.name || "Umum"}
                </span>
              </div>
            )}

            {/* =================================================
                OFFLINE PREVIEW
            =================================================== */}

            {showOffline && <TvOfflineOverlay reason="offline" inline />}
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            Pratinjau ini meniru tampilan TV. Sapaan tamu muncul secara langsung
            saat tamu check-in, dengan warna sesuai kategorinya. Jika internet
            terputus atau lambat, sapaan berhenti dan pop-up peringatan muncul.
          </p>

          <style jsx global>{`
            @import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Great+Vibes&display=swap");
          `}</style>
        </div>
      </div>
    </div>
  );
}
