"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Camera, Upload, CheckCircle2, RefreshCw, X } from "lucide-react";
import MomentsHero from "./moments-hero";

// Req 9B — pengambilan foto hanya lewat kamera.
// Req 9C — galeri publik foto yang sudah dikirim.
export default function PublicMomentsUpload({ invitation }) {
  const [captures, setCaptures] = useState([]);
  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(0);

  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState("");

  const [gallery, setGallery] = useState([]);
  const [galLoading, setGalLoading] = useState(false);

  const [showCamera, setShowCamera] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const cameraOpenRef = useRef(false); // mencegah kamera menyala setelah modal ditutup
  const capturesRef = useRef([]);

  useEffect(() => {
    capturesRef.current = captures;
  }, [captures]);

  // =========================================================
  // KAMERA
  // =========================================================

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCamError("");

    // Hentikan stream lama jika ada
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError(
        "Kamera tidak didukung. Gunakan browser terbaru dan pastikan halaman dibuka lewat HTTPS.",
      );
      return;
    }

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch (err) {
        if (err?.name === "NotAllowedError") throw err;
        // Fallback: kamera apa pun yang tersedia
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      // Modal sudah ditutup saat izin kamera diproses
      if (!cameraOpenRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCamOn(true);
    } catch (e) {
      setCamError(
        e?.name === "NotAllowedError"
          ? "Izin kamera ditolak. Aktifkan izin kamera di pengaturan browser lalu coba lagi."
          : "Tidak dapat mengakses kamera. Pastikan perangkat Anda memiliki kamera.",
      );
    }
  }, []);

  // Nyalakan kamera saat modal dibuka, matikan saat ditutup / unmount
  useEffect(() => {
    cameraOpenRef.current = showCamera;
    if (showCamera) startCamera();
    return () => {
      cameraOpenRef.current = false;
      stopCamera();
    };
  }, [showCamera, startCamera, stopCamera]);

  // Bersihkan object URL saat komponen unmount
  useEffect(() => {
    return () => {
      capturesRef.current.forEach((c) => URL.revokeObjectURL(c.url));
    };
  }, []);

  // =========================================================
  // AMBIL FOTO
  // =========================================================

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      toast.error("Kamera belum siap, coba lagi sebentar.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error("Gagal mengambil foto");
          return;
        }
        const url = URL.createObjectURL(blob);
        setCaptures((prev) => [...prev, { blob, url }]);
      },
      "image/jpeg",
      0.9,
    );
  };

  const removeCapture = (index) => {
    setCaptures((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  // =========================================================
  // GALERI
  // =========================================================

  const loadGallery = useCallback(async () => {
    setGalLoading(true);
    try {
      const res = await fetch(`/api/moments/${invitation.slug}?gallery=1`);
      const data = await res.json().catch(() => ({}));
      if (res.ok) setGallery(data.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setGalLoading(false);
    }
  }, [invitation.slug]);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  // =========================================================
  // UNGGAH
  // =========================================================

  const upload = async () => {
    if (!captures.length) {
      toast.error("Ambil minimal satu foto");
      return;
    }

    setUploading(true);

    try {
      const fd = new FormData();
      captures.forEach((item, i) => {
        fd.append("files", item.blob, `capture-${Date.now()}-${i}.jpg`);
      });
      fd.append("capture", "1");
      if (senderName.trim()) fd.append("senderName", senderName.trim());
      if (message.trim()) fd.append("message", message.trim());

      const res = await fetch(`/api/moments/${invitation.slug}`, {
        method: "POST",
        body: fd,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "Gagal mengunggah foto");
      }

      const count = data.count || captures.length;
      setDone(count);

      captures.forEach((item) => URL.revokeObjectURL(item.url));
      setCaptures([]);

      toast.success(`${count} foto berhasil dibagikan!`);

      // Tutup modal (kamera otomatis mati lewat useEffect)
      setShowCamera(false);

      await loadGallery();
    } catch (e) {
      toast.error(e.message || "Terjadi kesalahan");
    } finally {
      setUploading(false);
    }
  };

  // =========================================================
  // BUKA / TUTUP KAMERA
  // =========================================================

  const openCamera = () => {
    setDone(0);
    setShowCamera(true);
  };

  const closeCamera = () => {
    setShowCamera(false);
  };

  const shareLabel = uploading
    ? "Membagikan…"
    : captures.length > 0
      ? `Bagikan ${captures.length} Foto`
      : "Bagikan Foto";

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <MomentsHero invitation={invitation} />

      <main className="relative">
        {/* Header Galeri */}
        <div className="sticky top-0 z-30 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-primary/10">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <div>
              <p className="font-serif text-xl font-semibold">Momen Tamu</p>
              <p className="text-xs text-muted-foreground">
                {gallery.length} foto
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={loadGallery}
              disabled={galLoading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1.5 ${galLoading ? "animate-spin" : ""}`}
              />
              Muat Ulang
            </Button>
          </div>
        </div>

        {/* Grid Foto */}
        {galLoading && gallery.length === 0 ? (
          <div className="flex items-center justify-center py-32">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-primary" />
              <p className="text-sm text-muted-foreground">Memuat momen...</p>
            </div>
          </div>
        ) : gallery.length === 0 ? (
          <div className="flex items-center justify-center py-32 px-6">
            <div className="text-center max-w-sm">
              <div className="mx-auto mb-5 h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="h-9 w-9 text-primary" />
              </div>

              <h2 className="font-serif text-2xl font-semibold">
                Belum ada momen
              </h2>

              <p className="text-sm text-muted-foreground mt-2">
                Jadilah yang pertama mengabadikan momen dan bagikan kepada semua
                orang.
              </p>

              <Button onClick={openCamera} className="mt-6 bg-primary">
                <Camera className="h-4 w-4 mr-2" />
                Ambil Foto
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-1 bg-black/5 pb-28"
            data-testid="moments-gallery-grid"
          >
            {gallery.map((m, i) => (
              <button
                key={m.id || i}
                type="button"
                onClick={() => setLightbox(m)}
                className="group relative aspect-square overflow-hidden bg-black focus:outline-none"
              >
                <img
                  src={m.url}
                  alt={m.senderName || "Momen tamu"}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />

                {m.senderName && (
                  <div className="absolute left-0 right-0 bottom-0 p-3 text-left bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs font-medium truncate">
                      {m.senderName}
                    </p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Tombol Kamera Mengambang */}
      <button
        type="button"
        onClick={openCamera}
        className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50 h-16 w-16 rounded-full bg-primary text-primary-foreground shadow-[0_10px_35px_rgba(0,0,0,0.25)] border-4 border-white flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary/30"
        aria-label="Ambil foto"
        data-testid="floating-camera-button"
      >
        <Camera className="h-7 w-7" />
        <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 border-2 border-white animate-pulse" />
      </button>

      {/* Modal Kamera */}
      {showCamera && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[95vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="font-serif text-lg font-semibold">
                  Abadikan Momen
                </h2>
                <p className="text-xs text-muted-foreground">
                  Ambil foto dan bagikan
                </p>
              </div>

              <button
                type="button"
                onClick={closeCamera}
                aria-label="Tutup"
                className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {done > 0 && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-emerald-800">
                      Terima kasih!
                    </p>
                    <p className="text-sm text-emerald-700">
                      {done} foto berhasil dibagikan.
                    </p>
                  </div>
                </div>
              )}

              {/* KAMERA */}
              <div>
                <Label>Kamera</Label>

                <div className="mt-2 rounded-xl overflow-hidden border-2 border-primary/20 bg-black aspect-video flex items-center justify-center relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                    data-testid="moments-video"
                  />

                  {!camOn && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-white bg-black">
                      <Camera className="h-10 w-10 mx-auto mb-3 opacity-70" />
                      <p className="text-sm opacity-70">Kamera nonaktif.</p>
                    </div>
                  )}
                </div>

                {camError && (
                  <p
                    className="text-xs text-red-600 mt-2"
                    data-testid="moments-cam-error"
                  >
                    {camError}
                  </p>
                )}

                <div className="flex gap-2 mt-3">
                  {!camOn ? (
                    <Button
                      type="button"
                      className="flex-1 bg-primary"
                      onClick={startCamera}
                      data-testid="moments-start-camera"
                    >
                      <Camera className="h-4 w-4 mr-1" />
                      Nyalakan Kamera
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        className="flex-1 bg-primary h-12 text-base"
                        onClick={capture}
                        data-testid="moments-capture-btn"
                      >
                        <Camera className="h-5 w-5 mr-2" />
                        Ambil Foto
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={stopCamera}
                        data-testid="moments-stop-camera"
                      >
                        Matikan
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* PRATINJAU FOTO */}
              {captures.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Foto Anda</p>
                    <p className="text-xs text-muted-foreground">
                      {captures.length} foto
                    </p>
                  </div>

                  <div
                    className="grid grid-cols-3 gap-2"
                    data-testid="moments-captures"
                  >
                    {captures.map((c, i) => (
                      <div
                        key={c.url}
                        className="relative aspect-square rounded-lg overflow-hidden border"
                      >
                        <img
                          src={c.url}
                          alt={`Foto ${i + 1}`}
                          className="w-full h-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={() => removeCapture(i)}
                          aria-label={`Hapus foto ${i + 1}`}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NAMA */}
              <div>
                <Label>Nama Anda (opsional)</Label>
                <Input
                  data-testid="sender-name-input"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Budi"
                />
              </div>

              {/* PESAN */}
              <div>
                <Label>Tinggalkan Pesan (opsional)</Label>
                <Textarea
                  data-testid="sender-message-input"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Selamat berbahagia dan semoga menjadi keluarga yang sakinah!"
                />
              </div>

              {/* UNGGAH */}
              <Button
                className="w-full bg-primary h-12 text-base"
                onClick={upload}
                disabled={uploading || !captures.length}
                data-testid="upload-submit-btn"
              >
                <Upload className="h-4 w-4 mr-2" />
                {shareLabel}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Tanpa akun atau login. Foto diambil langsung dari kamera.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
          data-testid="moments-lightbox"
        >
          <button
            type="button"
            aria-label="Tutup"
            className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
            onClick={() => setLightbox(null)}
          >
            <X className="h-6 w-6" />
          </button>

          <div
            className="max-w-5xl w-full max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.url}
              alt={lightbox.senderName || "Momen tamu"}
              className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"
            />

            {(lightbox.senderName || lightbox.message) && (
              <div className="mt-4 text-center text-white">
                {lightbox.senderName && (
                  <p className="font-semibold">{lightbox.senderName}</p>
                )}
                {lightbox.message && (
                  <p className="text-sm text-white/80 mt-1">
                    {lightbox.message}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
