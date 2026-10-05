"use client";

import { useEffect, useRef, useState } from "react";
import TvOfflineOverlay from "@/components/dashboard/tv-offline-overlay";
import {
  DEFAULT_CATEGORY_COLOR,
  findCategoryColor,
  getContrastText,
} from "@/lib/tv-colors";

const FONT_SIZES = {
  small: 32,
  medium: 44,
  large: 60,
  xlarge: 84,
};

// Tamu tanpa kategori disapa paling akhir
const NO_PRIORITY = 9999;

// ========================================
// TV CLIENT
// ========================================

export default function TVClient({ settings }) {
  const [current, setCurrent] = useState(null);
  const [connected, setConnected] = useState(false);

  // Status internet
  const [net, setNet] = useState({
    isOnline: true,
    reason: null,
  });

  const { isOnline, reason } = net;

  const queueRef = useRef([]);
  const currentRef = useRef(null);

  // Sumber kebenaran status online
  const onlineRef = useRef(true);

  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const settingsRef = useRef(settings);
  const showNextRef = useRef(() => {});

  settingsRef.current = settings;

  // ========================================
  // ANTREAN CHECK-IN
  // Urut berdasarkan priority (kecil = lebih dulu).
  // Priority sama = urutan datang (FIFO).
  // ========================================

  const insertQueue = (item) => {
    const q = queueRef.current;

    let idx = q.length;

    for (let i = 0; i < q.length; i++) {
      if ((item.priority ?? NO_PRIORITY) < (q[i].priority ?? NO_PRIORITY)) {
        idx = i;
        break;
      }
    }

    q.splice(idx, 0, item);
  };

  // ========================================
  // TAMPILKAN SAPAAN BERIKUTNYA
  // ========================================

  showNextRef.current = () => {
    // Jangan menimpa sapaan yang sedang tampil
    // dan jangan menjalankan antrean ketika offline
    if (currentRef.current || !onlineRef.current) return;

    const next = queueRef.current.shift();

    if (!next) return;

    currentRef.current = next;
    setCurrent(next);

    const s = settingsRef.current;

    // Suara
    if (s.tvSoundEnabled && audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      } catch {}
    }

    // Durasi tampilan
    const dur = Math.max(3, Math.min(60, s.tvDuration || 7)) * 1000;

    timerRef.current = setTimeout(() => {
      currentRef.current = null;
      setCurrent(null);

      timerRef.current = setTimeout(() => {
        showNextRef.current();
      }, 350);
    }, dur);
  };

  // ========================================
  // PANTAU KONEKSI INTERNET
  // TANPA /api/health
  // TANPA fetch()
  // ========================================

  useEffect(() => {
    if (!settings.tvEnabled) return;

    // Update status berdasarkan navigator.onLine
    const updateOnlineStatus = () => {
      const online = navigator.onLine;

      setNet({
        isOnline: online,
        reason: online ? null : "offline",
      });
    };

    // Browser mendeteksi koneksi terputus
    const handleOffline = () => {
      setNet({
        isOnline: false,
        reason: "offline",
      });
    };

    // Browser mendeteksi koneksi kembali
    const handleOnline = () => {
      setNet({
        isOnline: true,
        reason: null,
      });
    };

    // Cek status awal
    updateOnlineStatus();

    // Dengarkan perubahan koneksi
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [settings.tvEnabled]);

  // ========================================
  // JEDA ANTREAN SAAT OFFLINE
  // ========================================

  useEffect(() => {
    onlineRef.current = isOnline;

    if (isOnline) {
      showNextRef.current();
    }
  }, [isOnline]);

  // ========================================
  // KONEKSI SSE
  // ========================================

  useEffect(() => {
    if (!settings.tvEnabled) return;

    const es = new EventSource(`/api/tv/${settings.id}/stream`);

    es.addEventListener("hello", () => {
      setConnected(true);
    });

    es.addEventListener("checkin", (ev) => {
      console.log("[TV] checkin diterima:", ev.data);
      try {
        insertQueue(JSON.parse(ev.data));
        showNextRef.current();
      } catch (err) {
        console.error("[TV] gagal memproses checkin:", err);
      }
    });

    es.onerror = (err) => {
      console.error("[TV] SSE error:", err);
      setConnected(false);
    };

    return () => {
      es.close();

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };

    // eslint-disable-next-line
  }, [settings.tvEnabled, settings.id]);

  // ========================================
  // LAYAR PENUH
  // ========================================

  useEffect(() => {
    if (!settings.tvFullscreen) return;

    const trigger = () => {
      const el = document.documentElement;

      if (el.requestFullscreen && !document.fullscreenElement) {
        el.requestFullscreen().catch(() => {});
      }
    };

    document.addEventListener("click", trigger, {
      once: true,
    });

    return () => {
      document.removeEventListener("click", trigger);
    };
  }, [settings.tvFullscreen]);

  // ========================================
  // BACKGROUND
  // ========================================

  const bgStyle = settings.tvBackground
    ? {
        backgroundImage: `url(${settings.tvBackground})`,
      }
    : {};

  const nameSize = FONT_SIZES[settings.tvFontSize] || FONT_SIZES.large;

  const anim = settings.tvAnimationEnabled ? "tv-anim" : "";

  // ========================================
  // WARNA KATEGORI TAMU
  // ========================================

  const matchedColor = findCategoryColor(
    settings.tvCategoryColors,
    current?.category,
  );

  const accent = matchedColor?.color || DEFAULT_CATEGORY_COLOR;

  // ========================================
  // TV BELUM DIAKTIFKAN
  // ========================================

  if (!settings.tvEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a0f08] text-white/70">
        TV Sapaan belum diaktifkan.
      </div>
    );
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <div
      className="min-h-screen w-full bg-cover bg-center relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg,#1a0f08,#3a2418,#5a3820)",
        ...bgStyle,
      }}
    >
      {/* Overlay background */}
      {settings.tvBackground && (
        <div className="absolute inset-0 bg-black/40" />
      )}

      {/* Status */}
      <div className="absolute top-6 right-8 text-xs text-white/50 font-mono z-10">
        {connected && isOnline ? "● LIVE" : "○ offline"}
      </div>

      {/* Logo */}
      {settings.tvLogo && (
        <img
          src={settings.tvLogo}
          alt="Logo"
          className="absolute top-6 left-8 h-16 z-10"
        />
      )}

      {/* ========================================
          KONTEN UTAMA
          ======================================== */}

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-12 text-white">
        {current ? (
          <div
            key={current.checkInId}
            className={`${anim} space-y-6 max-w-6xl rounded-3xl bg-black/55 backdrop-blur-sm px-16 py-10`}
            style={{
              border: `4px solid ${accent}`,
              boxShadow: `0 0 60px ${accent}88`,
            }}
          >
            {/* Foto selfie */}
            {current.selfieUrl && (
              <img
                src={current.selfieUrl}
                alt="Selfie tamu"
                className="mx-auto h-40 w-40 rounded-full object-cover border-4 shadow-2xl"
                style={{
                  borderColor: accent,
                }}
              />
            )}

            {/* Selamat Datang */}
            <p
              style={{
                fontFamily: "Great Vibes, cursive",
                color: accent,
              }}
              className="text-6xl md:text-8xl"
            >
              Selamat Datang
            </p>

            {/* Nama tamu */}
            <p
              style={{
                fontFamily: "Playfair Display, serif",
                fontSize: nameSize,
              }}
              className="font-bold leading-tight text-white break-words"
            >
              {current.guestName}
            </p>

            {/* Kategori + jumlah */}
            <div className="flex items-center justify-center gap-6 pt-4">
              <span
                className="inline-block rounded-full px-8 py-2 text-2xl font-bold tracking-widest uppercase"
                style={{
                  backgroundColor: accent,
                  color: getContrastText(accent),
                }}
              >
                {current.category || "Umum"}
              </span>

              <span className="text-3xl font-serif">{current.count} Orang</span>
            </div>
          </div>
        ) : (
          <div className={`${anim} text-center`}>
            {/* Foto pasangan */}
            {settings.tvCouplePhoto && (
              <img
                src={settings.tvCouplePhoto}
                alt=""
                className="mx-auto max-h-[50vh] rounded-3xl mb-8 shadow-2xl"
              />
            )}

            {/* Pernikahan */}
            <p
              style={{
                fontFamily: "Great Vibes, cursive",
              }}
              className="text-6xl md:text-8xl text-amber-200 mb-4"
            >
              Pernikahan
            </p>

            {/* Nama pasangan */}
            <p
              style={{
                fontFamily: "Playfair Display, serif",
              }}
              className="text-4xl md:text-6xl tracking-widest"
            >
              {settings.brideName} &amp; {settings.groomName}
            </p>

            {/* Venue */}
            {settings.venue && (
              <p className="mt-6 text-xl text-white/70">{settings.venue}</p>
            )}

            {/* Tanggal */}
            {settings.weddingDate && (
              <p className="mt-2 text-lg text-white/60">
                {new Date(settings.weddingDate).toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ========================================
          TV OFFLINE
          ======================================== */}

      {!isOnline && <TvOfflineOverlay reason={reason} />}

      {/* ========================================
          AUDIO
          ======================================== */}

      {settings.tvSoundEnabled && (
        <audio
          ref={audioRef}
          src="data:audio/wav;base64,UklGRoQCAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YWACAABmZmZmZmZmZg=="
          preload="auto"
        />
      )}

      {/* ========================================
          STYLE
          ======================================== */}

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Great+Vibes&display=swap");

        html,
        body {
          background: #1a0f08;
          margin: 0;
        }

        .tv-anim {
          animation: tvIn 900ms cubic-bezier(0.2, 0.9, 0.2, 1);
        }

        @keyframes tvIn {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
