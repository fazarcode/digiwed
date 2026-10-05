"use client";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Camera,
  CheckCircle2,
  Users as UsersIcon,
  User,
  RefreshCw,
  StopCircle,
} from "lucide-react";

const extractToken = (text) => {
  let tok = String(text || "").trim();
  const m = tok.match(/[?&]guest=([\w-]+)/);
  if (m) return m[1];
  try {
    const t = new URL(tok).searchParams.get("guest");
    if (t) return t;
  } catch {}
  return tok;
};

// Sisa kuota + mode kuota untuk satu tamu
const quotaInfo = (g) => {
  const strict = g?.invitation?.quotaMode === "STRICT";
  const used = g?.checkedInCount || 0;
  const remaining = (g?.quota || 1) - used;
  return { strict, used, remaining };
};

export default function CheckInClient({
  operator = "",
  deviceId = "",
  tableName = "",
  paused = false, // true selama ada popup terbuka → scanner berhenti sementara
  onCheckedIn,
  onNotice, // ({ type, title, message, guestName }) → popup hasil di komponen induk
}) {
  const [pending, setPending] = useState(null); // hanya dipakai bila undangan wajib selfie
  const [scanning, setScanning] = useState(false);
  const [count, setCount] = useState(1);
  const [selfieDataUrl, setSelfieDataUrl] = useState(null);
  const [selfieCamOn, setSelfieCamOn] = useState(false);

  const html5QrRef = useRef(null);
  const scanLockRef = useRef(false);
  const pendingRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const lastScanRef = useRef({ token: "", at: 0 });
  // simpan nilai terbaru agar callback scanner tidak memakai state lama
  const ctx = useRef({});
  ctx.current = {
    operator,
    deviceId,
    tableName,
    paused,
    onCheckedIn,
    onNotice,
  };

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  // Setelah popup ditutup, beri jeda agar QR yang masih di depan kamera tidak terbaca ulang
  useEffect(() => {
    if (!paused) lastScanRef.current.at = Date.now();
  }, [paused]);

  const notify = (n) => {
    if (ctx.current.onNotice) ctx.current.onNotice(n);
    else (n.type === "success" ? toast.success : toast.error)(n.title);
  };

  const postCheckin = async (body) => {
    const { operator, deviceId, tableName } = ctx.current;
    const res = await fetch("/api/guests/lookup/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        deviceId: deviceId || null,
        operatorName: operator.trim(),
        tableName: tableName || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  };

  // ---- Check-in otomatis (dipanggil scanner kamera) ----
  const autoCheckin = async (token) => {
    if (!ctx.current.operator.trim()) {
      notify({
        type: "error",
        title: "Operator belum diisi",
        message: "Isi nama operator terlebih dahulu sebelum melakukan scan.",
      });
      return;
    }
    const info = await fetch(
      `/api/guests/lookup/checkin?token=${encodeURIComponent(token)}`,
    )
      .then((r) => r.json())
      .catch(() => null);
    if (!info?.guest) {
      notify({
        type: "error",
        title: "Tamu tidak ditemukan",
        message: info?.error || "QR tidak dikenali atau tamu tidak terdaftar.",
      });
      return;
    }
    const g = info.guest;
    const { strict, used, remaining } = quotaInfo(g);

    // Mode ketat: kuota penuh → tolak
    if (strict && remaining <= 0) {
      notify({
        type: "error",
        title: "Kuota penuh",
        guestName: g.name,
        message: `Sudah check-in ${used} dari kuota ${g.quota || 1} orang. Mode kuota ketat tidak mengizinkan check-in tambahan.`,
      });
      return;
    }

    if (g.invitation?.selfieVerification) {
      const base = g.guestType === "GROUP" ? Math.min(g.quota || 2, 2) : 1;
      setCount(strict ? Math.max(1, Math.min(base, remaining)) : base);
      setPending(g);
      toast.info("Selfie diperlukan — konfirmasi di bawah");
      return;
    }
    if (g.guestType === "INDIVIDUAL" && g.checkedInAt) {
      notify({
        type: "warning",
        title: "Sudah check-in",
        guestName: g.name,
        message: "Tamu ini sudah check-in sebelumnya.",
      });
      return;
    }
    const c = Math.max(1, Math.min(strict ? remaining : g.quota || 1, 50));
    const { res, data } = await postCheckin({ token: g.token, count: c });
    if (!res.ok) {
      notify({
        type: "error",
        title: "Check-in gagal",
        guestName: data.guest?.name || g.name,
        message: data.error || "Terjadi kesalahan saat check-in.",
      });
      return;
    }
    // Berhasil → popup "Sudah Check-in" dibuka oleh komponen induk
    ctx.current.onCheckedIn?.(data.guest, c, data.checkInId);
  };

  // ---- Konfirmasi (khusus tamu yang butuh selfie) ----
  const confirmCheckin = async () => {
    if (!pending) return;
    if (!selfieDataUrl) {
      notify({
        type: "error",
        title: "Selfie wajib",
        guestName: pending.name,
        message: "Ambil foto selfie tamu terlebih dahulu untuk acara ini.",
      });
      return;
    }
    const { strict, remaining } = quotaInfo(pending);
    const c = Math.max(1, Math.min(count, strict ? remaining : 50));
    const { res, data } = await postCheckin({
      token: pending.token,
      count: c,
      selfieDataUrl,
    });
    if (!res.ok) {
      notify({
        type: "error",
        title: "Check-in gagal",
        guestName: data.guest?.name || pending.name,
        message: data.error || "Terjadi kesalahan saat check-in.",
      });
      return;
    }
    setPending(null);
    setSelfieDataUrl(null);
    ctx.current.onCheckedIn?.(data.guest, c, data.checkInId);
  };

  const startScanner = async () => {
    if (!operator.trim()) {
      notify({
        type: "error",
        title: "Operator belum diisi",
        message: "Isi nama operator terlebih dahulu sebelum membuka kamera.",
      });
      return;
    }
    setScanning(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      html5QrRef.current = new Html5Qrcode("qr-reader");
      await html5QrRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async (text) => {
          if (scanLockRef.current || pendingRef.current || ctx.current.paused)
            return;
          const token = extractToken(text);
          const now = Date.now();
          // cegah scan ganda dari QR yang sama (3 detik)
          if (
            lastScanRef.current.token === token &&
            now - lastScanRef.current.at < 3000
          )
            return;
          lastScanRef.current = { token, at: now };
          scanLockRef.current = true;
          try {
            await autoCheckin(token);
          } finally {
            setTimeout(() => {
              scanLockRef.current = false;
            }, 1000);
          }
        },
      );
    } catch {
      notify({
        type: "error",
        title: "Kamera tidak bisa dibuka",
        message:
          "Akses kamera ditolak atau kamera tidak tersedia di perangkat ini.",
      });
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrRef.current) {
      try {
        await html5QrRef.current.stop();
      } catch {}
      try {
        html5QrRef.current.clear();
      } catch {}
      html5QrRef.current = null;
    }
    scanLockRef.current = false;
    setScanning(false);
  };

  const stopSelfieStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setSelfieCamOn(false);
  };
  const startSelfieCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      setSelfieCamOn(true);
      setTimeout(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {}
        }
      }, 0);
    } catch {
      notify({
        type: "error",
        title: "Kamera selfie tidak bisa dibuka",
        message: "Izinkan akses kamera depan pada browser lalu coba lagi.",
      });
    }
  };
  const captureSelfie = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    setSelfieDataUrl(canvas.toDataURL("image/jpeg", 0.7));
    stopSelfieStream();
  };
  const cancelPending = () => {
    setPending(null);
    setSelfieDataUrl(null);
    stopSelfieStream();
  };

  useEffect(() => {
    const cleanup = () => {
      stopScanner();
      stopSelfieStream();
    };
    window.addEventListener("beforeunload", cleanup);
    return () => {
      cleanup();
      window.removeEventListener("beforeunload", cleanup);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingQuota = pending ? quotaInfo(pending) : null;
  const pendingMax = pendingQuota?.strict
    ? Math.max(1, pendingQuota.remaining)
    : 50;

  return (
    <div className="max-w-2xl mx-auto rounded-2xl bg-white border p-6">
      <div className="space-y-3">
        {!scanning ? (
          <div className="text-center py-10">
            <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-xs text-muted-foreground mb-4">
              Kamera tetap menyala sampai kamu menekan Matikan Kamera. Scan
              berhenti sementara saat popup terbuka dan lanjut setelah popup
              ditutup.
            </p>
            <Button onClick={startScanner} className="bg-primary">
              Buka Kamera
            </Button>
          </div>
        ) : (
          <div>
            <div
              id="qr-reader"
              className="w-full max-w-xl mx-auto rounded-lg overflow-hidden"
            />
            <div className="text-center">
              <Button variant="outline" onClick={stopScanner} className="mt-3">
                <StopCircle className="h-4 w-4 mr-1" />
                Matikan Kamera
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Scan berhenti sementara saat popup hasil terbuka.
              </p>
            </div>
          </div>
        )}
      </div>

      {pending && (
        <div className="space-y-4 mt-4">
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-2">
              {pending.guestType === "GROUP" ? (
                <UsersIcon className="h-5 w-5 text-primary" />
              ) : (
                <User className="h-5 w-5 text-primary" />
              )}
              <p className="font-serif text-xl font-bold">{pending.name}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary text-white">
                {pending.guestType === "GROUP" ? "Grup" : "Individu"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {(pending.category && typeof pending.category === "object"
                ? pending.category.name
                : pending.category) || "Tanpa kategori"}{" "}
              • Kuota: {pending.quota}
              {pendingQuota?.strict
                ? ` • Sisa: ${Math.max(0, pendingQuota.remaining)}`
                : ""}
            </p>
          </div>

          <div>
            <Label>Jumlah hadir</Label>
            <Input
              type="number"
              min={1}
              max={pendingMax}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
            />
            {pendingQuota?.strict && (
              <p className="text-xs text-muted-foreground mt-1">
                Mode kuota ketat: maksimal {pendingMax} orang.
              </p>
            )}
          </div>

          <div>
            <Label>Verifikasi Selfie (wajib)</Label>
            {!selfieDataUrl ? (
              <div className="space-y-2">
                {!selfieCamOn && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={startSelfieCamera}
                  >
                    <Camera className="h-4 w-4 mr-1" />
                    Nyalakan Kamera
                  </Button>
                )}
                {selfieCamOn && (
                  <>
                    <video
                      ref={videoRef}
                      className="w-full max-w-xs rounded-lg"
                      autoPlay
                      muted
                      playsInline
                    />
                    <Button
                      size="sm"
                      onClick={captureSelfie}
                      className="bg-primary"
                    >
                      Ambil Selfie
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <img
                  src={selfieDataUrl}
                  alt="Selfie"
                  className="max-w-xs rounded-lg border"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelfieDataUrl(null);
                    startSelfieCamera();
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Ulangi
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={cancelPending}>
              Batal
            </Button>
            <Button onClick={confirmCheckin} className="bg-emerald-600">
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Konfirmasi Check-in
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
