"use client";
import { WifiOff, Loader2 } from "lucide-react";

/**
 * Pop-up saat internet hilang / lambat.
 * inline=true -> menutupi kontainer induk (untuk pratinjau di dashboard)
 * inline=false -> menutupi seluruh layar (untuk halaman TV)
 */
export default function TvOfflineOverlay({
  reason = "offline",
  inline = false,
}) {
  const isSlow = reason === "slow";
  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      className={`${inline ? "absolute" : "fixed"} inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4`}
      data-testid="tv-offline-overlay"
    >
      <div className="max-w-md w-full rounded-2xl bg-white text-gray-900 p-6 text-center shadow-2xl space-y-3">
        <div className="mx-auto h-14 w-14 rounded-full bg-red-100 flex items-center justify-center">
          <WifiOff className="h-7 w-7 text-red-600" />
        </div>
        <h3 className="text-lg font-bold">
          {isSlow ? "Koneksi Internet Lambat" : "Tidak Ada Koneksi Internet"}
        </h3>
        <p className="text-sm text-gray-600">
          Sapaan tamu dihentikan sementara. Sapaan akan berlanjut otomatis
          setelah koneksi kembali stabil.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Mencoba menyambung kembali…
        </div>
      </div>
    </div>
  );
}
