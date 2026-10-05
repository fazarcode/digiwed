"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Cpu } from "lucide-react";

const MIN_TOKEN_LEN = 4; // kode lebih pendek dari ini dianggap bukan hasil scan
const MAX_KEY_GAP_MS = 100; // alat scan mengetik jauh lebih cepat daripada manusia

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

// Alat scan hardware bekerja seperti keyboard: mengetik isi QR dengan cepat lalu menekan Enter.
// Karena input dihapus, komponen ini memasang listener keydown global. Hasil ditampilkan
// lewat popup di komponen induk: onCheckedIn (berhasil) atau onNotice (gagal / validasi).
export default function DeviceScanClient({
  operator = "",
  deviceId = "",
  tableName = "",
  paused = false,
  onCheckedIn,
  onNotice,
}) {
  const [busy, setBusy] = useState(false);

  const bufferRef = useRef("");
  const lastKeyRef = useRef(0);
  const busyRef = useRef(false);
  const lastScanRef = useRef({ token: "", at: 0 });
  const ctx = useRef({});
  ctx.current = {
    operator,
    deviceId,
    tableName,
    paused,
    onCheckedIn,
    onNotice,
  };

  // Setelah popup ditutup, beri jeda agar QR yang sama tidak terbaca ulang
  useEffect(() => {
    if (!paused) lastScanRef.current.at = Date.now();
  }, [paused]);

  const notify = (n) => {
    if (ctx.current.onNotice) ctx.current.onNotice(n);
    else (n.type === "success" ? toast.success : toast.error)(n.title);
  };

  const processScan = async (raw) => {
    const token = extractToken(raw);
    if (!token || busyRef.current) return;

    // cegah scan ganda dari token yang sama (2 detik)
    const now = Date.now();
    if (
      lastScanRef.current.token === token &&
      now - lastScanRef.current.at < 2000
    )
      return;
    lastScanRef.current = { token, at: now };

    const { operator, deviceId, tableName, onCheckedIn } = ctx.current;
    if (!operator.trim()) {
      notify({
        type: "error",
        title: "Operator belum diisi",
        message: "Isi nama operator terlebih dahulu sebelum melakukan scan.",
      });
      return;
    }

    busyRef.current = true;
    setBusy(true);
    try {
      const info = await fetch(
        `/api/guests/lookup/checkin?token=${encodeURIComponent(token)}`,
      )
        .then((r) => r.json())
        .catch(() => null);
      const g = info?.guest;
      if (!g) {
        notify({
          type: "error",
          title: "Tamu tidak ditemukan",
          message:
            info?.error || "QR tidak dikenali atau tamu tidak terdaftar.",
        });
        return;
      }
      if (g.invitation?.selfieVerification) {
        notify({
          type: "error",
          title: "Butuh verifikasi selfie",
          guestName: g.name,
          message: "Undangan ini mewajibkan selfie. Gunakan tab Scan Kamera.",
        });
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

      // Mode kuota ketat: tolak jika kuota sudah penuh, batasi jumlah ke sisa kuota
      const strict = g.invitation?.quotaMode === "STRICT";
      const used = g.checkedInCount || 0;
      const remaining = (g.quota || 1) - used;
      if (strict && remaining <= 0) {
        notify({
          type: "error",
          title: "Kuota penuh",
          guestName: g.name,
          message: `Sudah check-in ${used} dari kuota ${g.quota || 1} orang. Mode kuota ketat tidak mengizinkan check-in tambahan.`,
        });
        return;
      }

      const count = Math.max(
        1,
        Math.min(strict ? remaining : g.quota || 1, 50),
      );
      const res = await fetch("/api/guests/lookup/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: g.token,
          deviceId: deviceId || null,
          operatorName: operator.trim(),
          tableName: tableName || null,
          count,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        notify({
          type: "error",
          title: "Check-in gagal",
          guestName: g.name,
          message: data?.error || "Terjadi kesalahan saat check-in.",
        });
        return;
      }
      // Berhasil → popup "Sudah Check-in" dibuka oleh komponen induk
      if (data.guest)
        onCheckedIn?.(data.guest, data.count || count, data.checkInId);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (e) => {
      if (ctx.current.paused) {
        bufferRef.current = "";
        return;
      }
      const t = e.target;
      const tag = t?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        t?.isContentEditable
      )
        return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const now = Date.now();
      if (now - lastKeyRef.current > MAX_KEY_GAP_MS) bufferRef.current = "";
      lastKeyRef.current = now;

      if (e.key === "Enter") {
        const code = bufferRef.current;
        bufferRef.current = "";
        if (code.length >= MIN_TOKEN_LEN) {
          e.preventDefault();
          processScan(code);
        }
        return;
      }
      if (e.key.length === 1) bufferRef.current += e.key;
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-2xl mx-auto rounded-2xl bg-white border border-primary/10 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Cpu className="h-5 w-5 text-primary" />
        <h3 className="font-serif text-xl font-semibold">Scanner Device</h3>
      </div>
      <div
        className={`rounded-xl border-2 border-dashed p-12 text-center ${paused ? "border-amber-300 bg-amber-50" : "border-emerald-300 bg-emerald-50"}`}
      >
        <p className="font-medium text-lg">
          {busy
            ? "Memproses…"
            : paused
              ? "Scan ditunda (tutup popup terlebih dulu)"
              : "Siap memindai — arahkan alat scan ke QR tamu"}
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          Tidak perlu klik apa pun. Setelah QR terbaca, popup hasil akan muncul
          otomatis.
        </p>
      </div>
    </div>
  );
}
