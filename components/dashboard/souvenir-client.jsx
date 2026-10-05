"use client";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Package,
  Gift,
  Archive,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
} from "lucide-react";

export default function SouvenirClient({ invitations }) {
  const [invId, setInvId] = useState(invitations[0]?.id || "");
  const [items, setItems] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // State untuk form & modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", quota: 100 });
  const [busy, setBusy] = useState(false);

  // State untuk pencarian dan paginasi riwayat distribusi
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const load = useCallback(async () => {
    if (!invId) return;
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        fetch(`/api/invitations/${invId}/souvenirs`).then((r) => r.json()),
        fetch(`/api/invitations/${invId}/souvenir-distributions`).then((r) =>
          r.json(),
        ),
      ]);
      setItems(a.items || []);
      setHistory(b.items || []);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [invId]);

  useEffect(() => {
    load();
  }, [load]);

  // Kembali ke halaman 1 saat pencarian / jumlah baris berubah
  // (hook ditempatkan sebelum return dini agar urutan hooks selalu konsisten)
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, rowsPerPage]);

  const add = async () => {
    if (!form.name.trim()) return toast.error("Nama wajib diisi");
    setBusy(true);
    try {
      const r = await fetch(`/api/invitations/${invId}/souvenirs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menambahkan");

      toast.success("Souvenir berhasil ditambahkan");
      setForm({ name: "", description: "", quota: 100 });
      setIsAddModalOpen(false);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const patch = async (id, body) => {
    const r = await fetch(`/api/invitations/${invId}/souvenirs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const d = await r.json();
    if (!r.ok) return toast.error(d.error || "Gagal memperbarui");
    load();
  };

  const del = async (id) => {
    if (!confirm("Hapus souvenir ini? Riwayat pembagian juga akan terhapus."))
      return;
    await fetch(`/api/invitations/${invId}/souvenirs/${id}`, {
      method: "DELETE",
    });
    load();
  };

  // Data turunan
  const totalQuota = items.reduce((acc, item) => acc + (item.quota || 0), 0);
  const totalDistributed = items.reduce(
    (acc, item) => acc + (item.distributed || 0),
    0,
  );
  const totalRemaining = items.reduce(
    (acc, item) => acc + (item.remaining || 0),
    0,
  );

  const filteredHistory = history.filter((h) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (h.guestName || "anonim").toLowerCase().includes(searchLower) ||
      (h.souvenirName || "").toLowerCase().includes(searchLower) ||
      (h.operatorName || "").toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredHistory.length / rowsPerPage);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );

  // Ekspor ke Excel (.xlsx asli dengan format rapi)
  const exportToExcel = async () => {
    if (filteredHistory.length === 0) return;

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

      const ws = wb.addWorksheet("Riwayat Distribusi", {
        views: [{ state: "frozen", ySplit: 4 }],
      });

      ws.columns = [
        { key: "no", width: 6 },
        { key: "guest", width: 28 },
        { key: "souvenir", width: 28 },
        { key: "qty", width: 10 },
        { key: "operator", width: 22 },
        { key: "date", width: 24 },
      ];

      // Judul
      ws.mergeCells("A1:F1");
      const title = ws.getCell("A1");
      title.value = `LAPORAN RIWAYAT DISTRIBUSI SOUVENIR - ${invName.toUpperCase()}`;
      title.font = {
        name: "Arial",
        size: 14,
        bold: true,
        color: { argb: BROWN },
      };
      title.alignment = { vertical: "middle" };
      ws.getRow(1).height = 26;

      ws.mergeCells("A2:F2");
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

      // Header tabel (baris 4)
      const headerRow = ws.getRow(4);
      headerRow.values = [
        "No",
        "Nama Tamu",
        "Nama Souvenir",
        "Jumlah",
        "Operator",
        "Tanggal & Waktu",
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
      filteredHistory.forEach((h, idx) => {
        const row = ws.addRow({
          no: idx + 1,
          guest: h.guestName || "Anonim",
          souvenir: h.souvenirName || "",
          qty: Number(h.quantity) || 0,
          operator: h.operatorName || "-",
          date: h.updatedAt ? new Date(h.updatedAt) : "",
        });

        row.eachCell({ includeEmpty: true }, (cell, col) => {
          cell.font = { name: "Arial", size: 10 };
          cell.border = BORDER;
          cell.alignment = { vertical: "middle", wrapText: true };
          if (col === 1 || col === 4)
            cell.alignment = { vertical: "middle", horizontal: "center" };
          if (idx % 2 === 1)
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFFAF5F0" },
            };
        });
        row.getCell(6).numFmt = "dd mmm yyyy hh:mm";
      });

      // Filter otomatis pada header
      ws.autoFilter = {
        from: { row: 4, column: 1 },
        to: { row: 4 + filteredHistory.length, column: 6 },
      };

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Riwayat_Distribusi_${invName.replace(/[^\w-]+/g, "_")}.xlsx`;
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
      <div className="rounded-2xl bg-white border p-12 text-center text-muted-foreground shadow-sm">
        Buat undangan terlebih dahulu.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* HEADER & KONTROL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Label className="text-sm font-semibold">Pilih Undangan:</Label>
          <select
            value={invId}
            onChange={(e) => setInvId(e.target.value)}
            className="h-10 px-3 rounded-md border text-sm bg-white shadow-sm focus:ring-2 focus:ring-primary/20 outline-none"
          >
            {invitations.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>

        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 shadow-sm">
              <Plus className="h-4 w-4 mr-2" /> Tambah Souvenir
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tambah Souvenir Baru</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Nama</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Contoh: Mug, Tas Kain"
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label>Kuota (Total Stok)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.quota}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      quota: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Deskripsi (Opsional)</Label>
                <Textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Detail tambahan tentang item ini..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
              >
                Batal
              </Button>
              <Button onClick={add} disabled={busy || !form.name.trim()}>
                Simpan Souvenir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* KARTU RINGKASAN */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Archive className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">
              Total Kuota
            </p>
            <h3 className="text-2xl font-bold">{totalQuota}</h3>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <Gift className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">
              Total Dibagikan
            </p>
            <h3 className="text-2xl font-bold">{totalDistributed}</h3>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">
              Total Tersedia
            </p>
            <h3 className="text-2xl font-bold">{totalRemaining}</h3>
          </div>
        </div>
      </div>

      {/* TABEL SOUVENIR */}
      <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-muted/10">
          <h2 className="text-lg font-semibold">Daftar Souvenir</h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              Memuat data...
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              Belum ada souvenir yang ditambahkan.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-muted-foreground">
                <tr className="text-left">
                  <th className="px-5 py-3 font-medium">Nama</th>
                  <th className="px-5 py-3 font-medium">Kuota</th>
                  <th className="px-5 py-3 font-medium">Dibagikan</th>
                  <th className="px-5 py-3 font-medium">Tersisa</th>
                  <th className="px-5 py-3 font-medium">Aktif</th>
                  <th className="px-5 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((x) => (
                  <tr
                    key={x.id}
                    className="hover:bg-muted/10 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {x.name}
                    </td>
                    <td className="px-5 py-3">
                      <Input
                        type="number"
                        min={x.distributed}
                        defaultValue={x.quota}
                        className="h-8 w-24 bg-white"
                        onBlur={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (v !== x.quota && v >= x.distributed)
                            patch(x.id, { quota: v });
                        }}
                      />
                    </td>
                    <td className="px-5 py-3 font-medium text-green-600">
                      {x.distributed}
                    </td>
                    <td className="px-5 py-3 font-semibold text-amber-600">
                      {x.remaining}
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={x.active}
                        onChange={(e) =>
                          patch(x.id, { active: e.target.checked })
                        }
                      />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => del(x.id)}
                        className="hover:bg-red-50 hover:text-red-600"
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

      {/* TABEL RIWAYAT DISTRIBUSI */}
      <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-muted/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h2 className="text-lg font-semibold">Riwayat Distribusi</h2>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari tamu / souvenir..."
                className="pl-8 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Tombol Ekspor (warna coklat) */}
            <Button
              className="h-9 w-full sm:w-auto whitespace-nowrap bg-[#8B4513] hover:bg-[#6b3410] text-white shadow-sm transition-colors"
              disabled={filteredHistory.length === 0 || isExporting}
              onClick={exportToExcel}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Ekspor Excel ({filteredHistory.length})
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              Belum ada riwayat distribusi.
            </p>
          ) : filteredHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">
              Data tidak ditemukan.
            </p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr className="text-left">
                    <th className="px-5 py-3 font-medium">Tamu</th>
                    <th className="px-5 py-3 font-medium">Souvenir</th>
                    <th className="px-5 py-3 font-medium">Jumlah</th>
                    <th className="px-5 py-3 font-medium">Operator</th>
                    <th className="px-5 py-3 font-medium">Tanggal & Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedHistory.map((h) => (
                    <tr
                      key={h.id}
                      className="hover:bg-muted/10 transition-colors"
                    >
                      <td className="px-5 py-3 font-medium">
                        {h.guestName || (
                          <span className="text-muted-foreground italic">
                            Anonim
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">{h.souvenirName}</td>
                      <td className="px-5 py-3 font-medium">{h.quantity}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {h.operatorName || "—"}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {new Date(h.updatedAt).toLocaleDateString("id-ID", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* PAGINASI */}
              <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/5">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Tampilkan
                  </span>
                  <select
                    className="h-8 border rounded-md text-sm px-2 outline-none"
                    value={rowsPerPage}
                    onChange={(e) => setRowsPerPage(Number(e.target.value))}
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                  <span className="text-sm text-muted-foreground">baris</span>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    Halaman {currentPage} dari {totalPages || 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages || totalPages === 0}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
