// Helper warna kategori tamu untuk Greeting TV.
// Dipakai bersama oleh halaman pengaturan (dashboard) dan halaman TV (/tv/[id]).

export const DEFAULT_CATEGORY_COLOR = "#F59E0B";

// Pilihan warna cepat (bisa diganti bebas lewat pemilih warna)
export const COLOR_SWATCHES = [
  { label: "Emas", color: "#D4AF37" },
  { label: "Perak", color: "#C0C0C0" },
  { label: "Perunggu", color: "#CD7F32" },
  { label: "Merah", color: "#DC2626" },
  { label: "Merah Muda", color: "#EC4899" },
  { label: "Ungu", color: "#9333EA" },
  { label: "Biru", color: "#2563EB" },
  { label: "Hijau", color: "#16A34A" },
];

// Saran kategori umum (hanya tombol pintas, nama tetap bisa diketik sendiri)
export const CATEGORY_SUGGESTIONS = [
  { name: "VIP", color: "#D4AF37" },
  { name: "Keluarga", color: "#EC4899" },
  { name: "Rekan Kerja", color: "#2563EB" },
  { name: "Teman", color: "#16A34A" },
  { name: "Reguler", color: "#C0C0C0" },
];

const HEX_RE = /^#[0-9a-f]{6}$/i;

export const newCategoryId = () =>
  `cat_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

// Menerima array / string JSON / null, selalu mengembalikan array yang valid
export function normalizeCategoryColors(value) {
  let arr = value;
  if (typeof value === "string") {
    try {
      arr = JSON.parse(value);
    } catch {
      arr = [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((x) => x && typeof x.name === "string")
    .map((x) => ({
      id: x.id || newCategoryId(),
      name: x.name,
      color: HEX_RE.test(x.color) ? x.color : DEFAULT_CATEGORY_COLOR,
    }));
}

// Cari warna berdasarkan nama kategori tamu (tidak peka huruf besar/kecil)
export function findCategoryColor(list, category) {
  if (!category) return null;
  const key = String(category).trim().toLowerCase();
  return (
    normalizeCategoryColors(list).find(
      (c) => c.name.trim().toLowerCase() === key,
    ) || null
  );
}

// Warna teks (hitam/putih) yang terbaca di atas warna latar tertentu
export function getContrastText(hex) {
  const h = HEX_RE.test(hex) ? hex : DEFAULT_CATEGORY_COLOR;
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1a1a1a" : "#ffffff";
}
