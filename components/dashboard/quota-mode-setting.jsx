"use client";
import { Label } from "@/components/ui/label";

// Tempel komponen ini di form pengaturan undangan.
// Pakai: <QuotaModeSetting value={form.quotaMode} onChange={(v) => setForm((f) => ({ ...f, quotaMode: v }))} />
const OPTIONS = [
  [
    "STRICT",
    "Ketat",
    "Grup yang sudah hadir sesuai kuota tidak bisa check-in lagi / melebihi kuota.",
  ],
  ["FLEXIBLE", "Fleksibel", "Jumlah hadir boleh melebihi kuota."],
];

export default function QuotaModeSetting({ value = "FLEXIBLE", onChange }) {
  return (
    <div className="space-y-2">
      <Label>Aturan Kuota Kehadiran</Label>
      {OPTIONS.map(([val, title, desc]) => (
        <label
          key={val}
          className="flex items-start gap-2 rounded-lg border p-3 cursor-pointer"
        >
          <input
            type="radio"
            name="quotaMode"
            checked={value === val}
            onChange={() => onChange?.(val)}
          />
          <span>
            <span className="font-medium text-sm">{title}</span>
            <span className="block text-xs text-muted-foreground">{desc}</span>
          </span>
        </label>
      ))}
    </div>
  );
}
