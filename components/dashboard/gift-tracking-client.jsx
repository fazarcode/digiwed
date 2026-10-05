"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  FileText,
  Wallet,
  Package,
  Gift,
  Coins,
  Box,
  SearchX,
  Loader2,
  Download,
  X,
} from "lucide-react";

const formatRupiah = (n) => `Rp ${Number(n || 0).toLocaleString("id-ID")}`;

export default function GiftTrackingClient({ invitations }) {
  const [invId, setInvId] = useState(invitations[0]?.id || "");
  const [entries, setEntries] = useState([]);
  const [totals, setTotals] = useState({ totalMoney: 0, goodsCount: 0 });

  // State form
  const [form, setForm] = useState({
    kind: "MONEY",
    giverName: "",
    amount: "",
    itemName: "",
    notes: "",
  });

  const [busy, setBusy] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // State modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  const load = useCallback(async () => {
    if (!invId) return;
    setIsLoading(true);
    try {
      const a = await fetch(`/api/invitations/${invId}/gift-entries`).then(
        (r) => r.json(),
      );
      setEntries(a.items || []);
      setTotals({
        totalMoney: a.totalMoney || 0,
        goodsCount: a.goodsCount || 0,
      });
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setIsLoading(false);
    }
  }, [invId]);

  useEffect(() => {
    load();
  }, [load]);

  const addEntry = async () => {
    setBusy(true);
    try {
      const body = {
        kind: form.kind,
        giverName: form.giverName || null,
        notes: form.notes || null,
      };

      if (form.kind === "MONEY") {
        body.amount = form.amount || null;
      } else {
        body.itemName = form.itemName || null;
      }

      const r = await fetch(`/api/invitations/${invId}/gift-entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();

      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");

      toast.success("Catatan hadiah berhasil disimpan");
      setForm({
        kind: "MONEY",
        giverName: "",
        amount: "",
        itemName: "",
        notes: "",
      });
      setIsModalOpen(false);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const delEntry = async (id) => {
    if (!confirm("Hapus catatan hadiah ini?")) return;
    await fetch(`/api/invitations/${invId}/gift-entries/${id}`, {
      method: "DELETE",
    });
    load();
  };

  // Ekspor ke Excel (.xlsx asli dengan format rapi)
  const exportToExcel = async () => {
    if (entries.length === 0) {
      toast.error("Tidak ada data untuk diekspor");
      return;
    }

    setIsExporting(true);
    try {
      const ExcelJS = (await import("exceljs")).default;

      const currentInv = invitations.find((i) => i.id === invId);
      const invName = currentInv ? currentInv.name : "Undangan";

      const BROWN = "FF8B4513";
      const BORDER = {
        top: { style: "thin", color: { argb: "FFD1D5DB" } },
        left: { style: "thin", color: { argb: "FFD1D5DB" } },
        bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
        right: { style: "thin", color: { argb: "FFD1D5DB" } },
      };

      const wb = new ExcelJS.Workbook();
      wb.creator = "Sistem Undangan";
      wb.created = new Date();

      const ws = wb.addWorksheet("Hadiah Diterima", {
        views: [{ state: "frozen", ySplit: 7 }],
      });

      ws.columns = [
        { key: "no", width: 6 },
        { key: "giver", width: 28 },
        { key: "kind", width: 12 },
        { key: "amount", width: 20 },
        { key: "item", width: 30 },
        { key: "notes", width: 36 },
        { key: "proof", width: 14 },
        { key: "date", width: 22 },
      ];

      // Judul
      ws.mergeCells("A1:H1");
      const title = ws.getCell("A1");
      title.value = `LAPORAN HADIAH & ANGPAO - ${invName.toUpperCase()}`;
      title.font = {
        name: "Arial",
        size: 14,
        bold: true,
        color: { argb: BROWN },
      };
      title.alignment = { vertical: "middle" };
      ws.getRow(1).height = 26;

      ws.mergeCells("A2:H2");
      const sub = ws.getCell("A2");
      sub.value = `Dicetak pada: ${new Date().toLocaleString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`;
      sub.font = {
        name: "Arial",
        size: 10,
        italic: true,
        color: { argb: "FF6B7280" },
      };

      // Ringkasan
      ws.getCell("A4").value = "Total Uang / Angpao";
      ws.mergeCells("A4:C4");
      ws.getCell("D4").value = Number(totals.totalMoney) || 0;
      ws.getCell("D4").numFmt = '"Rp" #,##0';
      ws.getCell("D4").alignment = { horizontal: "left" };

      ws.getCell("A5").value = "Total Catatan Barang";
      ws.mergeCells("A5:C5");
      ws.getCell("D5").value = Number(totals.goodsCount) || 0;
      ws.getCell("D5").alignment = { horizontal: "left" };

      ["A4", "D4", "A5", "D5"].forEach((addr) => {
        ws.getCell(addr).font = { name: "Arial", size: 11, bold: true };
      });

      // Header tabel (baris 7)
      const headerRow = ws.getRow(7);
      headerRow.values = [
        "No",
        "Nama Pemberi",
        "Jenis",
        "Nominal (Rp)",
        "Nama Barang",
        "Catatan",
        "Bukti",
        "Tanggal",
      ];
      headerRow.height = 24;
      headerRow.eachCell((cell) => {
        cell.font = { name: "Arial", bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: BROWN },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = BORDER;
      });

      // Isi data
      entries.forEach((e, idx) => {
        const isMoney = e.kind === "MONEY";
        const itemText = isMoney
          ? ""
          : `${e.itemName || ""}${e.quantity ? ` ×${e.quantity}` : ""}`;

        const row = ws.addRow({
          no: idx + 1,
          giver: e.giverName || e.guestName || "Anonim",
          kind: isMoney ? "Uang" : "Barang",
          amount: isMoney && e.amount != null ? Number(e.amount) : "",
          item: itemText || "",
          notes: e.notes || "",
          proof: e.hasProof ? "Ada" : "Tidak ada",
          date: e.createdAt ? new Date(e.createdAt) : "",
        });

        row.eachCell({ includeEmpty: true }, (cell, col) => {
          cell.font = { name: "Arial", size: 10 };
          cell.border = BORDER;
          cell.alignment = { vertical: "middle", wrapText: true };
          if (col === 1 || col === 3 || col === 7)
            cell.alignment = { vertical: "middle", horizontal: "center" };
          if (idx % 2 === 1)
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFAF5F0" },
            };
        });
        row.getCell(4).numFmt = '"Rp" #,##0';
        row.getCell(4).alignment = { vertical: "middle", horizontal: "right" };
        row.getCell(8).numFmt = "dd mmm yyyy hh:mm";
      });

      // Filter otomatis pada header
      ws.autoFilter = {
        from: { row: 7, column: 1 },
        to: { row: 7 + entries.length, column: 8 },
      };

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Laporan_Hadiah_${invName.replace(/[^\w-]+/g, "_")}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Berhasil mengekspor data ke Excel");
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengekspor data ke Excel");
    } finally {
      setIsExporting(false);
    }
  };

  if (invitations.length === 0) {
    return (
      <div className="rounded-2xl bg-white border border-dashed border-gray-300 p-12 text-center flex flex-col items-center justify-center space-y-3">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <SearchX className="h-6 w-6 text-primary" />
        </div>
        <p className="text-muted-foreground font-medium">
          Buat undangan terlebih dahulu untuk mulai melacak hadiah.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      {/* Header, Filter & Tombol Aksi */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Pelacakan Hadiah & Angpao
          </h2>
          <p className="text-sm text-gray-500">
            Kelola catatan hadiah dan angpao untuk acara Anda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={invId}
            onChange={(e) => setInvId(e.target.value)}
            className="h-10 px-4 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:ring-2 focus:ring-primary/20 flex-1 md:w-56 transition-all"
            data-testid="gt-invitation-select"
          >
            {invitations.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>

          {/* Tombol Ekspor Excel */}
          <Button
            variant="outline"
            onClick={exportToExcel}
            disabled={isExporting}
            className="flex items-center gap-2 h-10 rounded-xl"
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>Ekspor Excel</span>
          </Button>

          {/* Tombol Tambah */}
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 h-10 rounded-xl bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Data</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Kartu Statistik */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-white border p-6 shadow-sm relative overflow-hidden group">
              <div className="absolute right-0 top-0 opacity-5 transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110">
                <Wallet className="h-32 w-32" />
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Coins className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  Total Uang / Angpao
                </p>
              </div>
              <p
                className="font-serif text-3xl font-bold mt-2"
                data-testid="gt-total-money"
              >
                {formatRupiah(totals.totalMoney)}
              </p>
            </div>

            <div className="rounded-2xl bg-white border p-6 shadow-sm relative overflow-hidden group">
              <div className="absolute right-0 top-0 opacity-5 transform translate-x-4 -translate-y-4 transition-transform group-hover:scale-110">
                <Package className="h-32 w-32" />
              </div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Box className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                  Catatan Barang
                </p>
              </div>
              <p className="font-serif text-3xl font-bold mt-2">
                {totals.goodsCount}{" "}
                <span className="text-lg text-muted-foreground font-sans font-normal">
                  barang
                </span>
              </p>
            </div>
          </div>

          {/* Tabel Hadiah Diterima */}
          <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
            <div className="bg-gray-50/50 px-6 py-4 border-b">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                Daftar Hadiah Diterima
              </p>
            </div>
            <div className="p-0 overflow-x-auto">
              {entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <Gift className="h-10 w-10 text-gray-300 mb-3" />
                  <p className="text-sm">Belum ada catatan hadiah.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b bg-gray-50/30">
                      <th className="py-4 px-6 font-medium">Pemberi</th>
                      <th className="py-4 px-6 font-medium">Jenis</th>
                      <th className="py-4 px-6 font-medium">
                        Jumlah / Nama Barang
                      </th>
                      <th className="py-4 px-6 font-medium">Bukti</th>
                      <th className="py-4 px-6 font-medium">Tanggal</th>
                      <th className="py-4 px-6 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e) => (
                      <tr
                        key={e.id}
                        className="border-b last:border-0 hover:bg-gray-50/50 transition-colors"
                        data-testid={`gt-entry-${e.id}`}
                      >
                        <td className="py-3 px-6 font-medium text-gray-900">
                          {e.giverName || e.guestName || "Anonim"}
                        </td>
                        <td className="py-3 px-6">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                              e.kind === "MONEY"
                                ? "bg-green-50 text-green-700"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {e.kind === "MONEY" ? "Uang" : "Barang"}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-gray-700">
                          {e.kind === "MONEY"
                            ? e.amount != null
                              ? formatRupiah(e.amount)
                              : "—"
                            : `${e.itemName || ""}${e.quantity ? ` ×${e.quantity}` : ""}`}
                        </td>
                        <td className="py-3 px-6">
                          {e.hasProof ? (
                            <a
                              href={`/api/invitations/${invId}/gift-entries/${e.id}/proof`}
                              target="_blank"
                              rel="noopener"
                              className="text-primary hover:text-primary/80 inline-flex items-center gap-1.5 font-medium transition-colors"
                            >
                              <FileText className="h-3.5 w-3.5" /> Lihat
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-6 text-gray-500">
                          {new Date(e.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-6 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => delEntry(e.id)}
                            className="hover:bg-red-50 hover:text-red-600 h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* MODAL TAMBAH CATATAN HADIAH */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative space-y-5 border">
            {/* Header Modal */}
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-semibold text-gray-900 text-base">
                Tambah Catatan Hadiah
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Catatan Hadiah */}
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-xs">Jenis Hadiah</Label>
                <select
                  value={form.kind}
                  onChange={(e) => setForm({ ...form, kind: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 text-sm bg-white focus:ring-2 focus:ring-primary/20"
                  data-testid="gt-kind"
                >
                  <option value="MONEY">Uang / Angpao</option>
                  <option value="GOODS">Barang</option>
                </select>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs">Nama Pemberi</Label>
                <Input
                  placeholder="Nama tamu / pemberi..."
                  value={form.giverName}
                  onChange={(e) =>
                    setForm({ ...form, giverName: e.target.value })
                  }
                  data-testid="gt-giver"
                />
              </div>

              {form.kind === "MONEY" ? (
                <div>
                  <Label className="mb-1.5 block text-xs">
                    Jumlah Nominal (Rp)
                  </Label>
                  <Input
                    type="number"
                    placeholder="Contoh: 500000"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    data-testid="gt-amount"
                  />
                </div>
              ) : (
                <div>
                  <Label className="mb-1.5 block text-xs">Nama Barang</Label>
                  <Input
                    placeholder="Contoh: Rice Cooker Philips"
                    value={form.itemName}
                    onChange={(e) =>
                      setForm({ ...form, itemName: e.target.value })
                    }
                    data-testid="gt-item"
                  />
                </div>
              )}

              <div>
                <Label className="mb-1.5 block text-xs">
                  Catatan Tambahan (Opsional)
                </Label>
                <Input
                  placeholder="Keterangan ucapan atau info lainnya..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>

              <div className="pt-2">
                <Button
                  onClick={addEntry}
                  disabled={busy}
                  className="w-full h-10 rounded-xl"
                  data-testid="gt-add"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Simpan Hadiah
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
