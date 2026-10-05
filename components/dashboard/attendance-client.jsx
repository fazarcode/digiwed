"use client";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  User,
  Users as UsersIcon,
  FileDown,
  UserCheck,
  Trash2,
  X,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import AttendanceExtras from "@/components/dashboard/attendance-extras";

const FILTER_STORAGE_KEY = "attendance.filters";
const STATUS_OPTIONS = ["all", "CHECKED_IN", "NOT_CHECKED_IN"];
const LIMIT_OPTIONS = [10, 20, 50, 100];

// ISO -> nilai untuk <input type="datetime-local"> dalam waktu lokal (bukan UTC)
const toLocalInput = (iso) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};

export default function AttendanceClient({
  invitations,
  devices,
  categories = [],
  operator = "",
  tableName = "",
  deviceId: operatorDeviceId = "", // device milik operator (dari setup)
  refreshKey = 0, // dinaikkan parent setiap ada tamu baru / check-in baru
}) {
  const [items, setItems] = useState([]);
  const [totals, setTotals] = useState({
    totalAttendees: 0,
    totalCheckedIn: 0,
    totalNotCheckedIn: 0,
  });
  const [loading, setLoading] = useState(false);
  const [invitationId, setInvitationId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [preview, setPreview] = useState(null);
  const [editing, setEditing] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const extrasRef = useRef(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filter baru dipulihkan dari localStorage setelah mount (hindari hydration mismatch)
  const [hydrated, setHydrated] = useState(false);

  // Mengabaikan respons lama kalau ada request yang lebih baru
  const reqRef = useRef(0);

  // ========================================
  // PULIHKAN FILTER SAAT HALAMAN DIBUKA / DI-REFRESH
  // ========================================
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FILTER_STORAGE_KEY);
      if (raw) {
        const f = JSON.parse(raw);

        // Pastikan nilai yang dipulihkan masih valid
        const inv =
          f.invitationId && invitations.some((i) => i.id === f.invitationId)
            ? f.invitationId
            : "";
        const catOk =
          f.categoryId &&
          categories.some(
            (c) => c.id === f.categoryId && (!inv || c.invitationId === inv),
          );
        const devOk = f.deviceId && devices.some((d) => d.id === f.deviceId);

        setInvitationId(inv);
        setCategoryId(catOk ? f.categoryId : "");
        setDeviceId(devOk ? f.deviceId : "");
        setStatusFilter(
          STATUS_OPTIONS.includes(f.statusFilter) ? f.statusFilter : "all",
        );
        if (typeof f.q === "string") {
          setQ(f.q);
          setDebouncedQ(f.q);
        }
        if (LIMIT_OPTIONS.includes(f.limit)) setLimit(f.limit);
      }
    } catch {}
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========================================
  // SIMPAN FILTER SETIAP BERUBAH
  // ========================================
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify({
          invitationId,
          deviceId,
          categoryId,
          statusFilter,
          q,
          limit,
        }),
      );
    } catch {}
  }, [hydrated, invitationId, deviceId, categoryId, statusFilter, q, limit]);

  // Pencarian otomatis dengan debounce (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [q]);

  const load = async () => {
    const myReq = ++reqRef.current;
    setLoading(true);
    const params = new URLSearchParams();
    if (invitationId) params.set("invitationId", invitationId);
    if (deviceId) params.set("deviceId", deviceId);
    if (categoryId) params.set("categoryId", categoryId);
    if (debouncedQ) params.set("q", debouncedQ);
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("page", page);
    params.set("limit", limit);

    try {
      const res = await fetch(`/api/attendance?${params.toString()}`);
      const data = await res.json();

      // Ada request yang lebih baru, abaikan respons ini
      if (myReq !== reqRef.current) return;

      setItems(data.items || []);
      setTotals({
        totalAttendees: data.totalAttendees || 0,
        totalCheckedIn: data.totalCheckedIn || 0,
        totalNotCheckedIn: data.totalNotCheckedIn || 0,
      });
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.total || data.totalItems || data.items?.length || 0);
    } catch (error) {
      if (myReq !== reqRef.current) return;
      console.error("Gagal memuat data kehadiran:", error);
      toast.error("Gagal memuat data kehadiran");
    } finally {
      if (myReq === reqRef.current) setLoading(false);
    }
  };

  // Dipakai untuk SEMUA tamu (sudah maupun belum hadir)
  const openAttendance = async (x) => {
    const isIn = x.status === "CHECKED_IN";
    setEditing({
      checkInId: isIn ? x.id.replace(/^ci-/, "") : null, // null = belum ada check-in → dibuat baru
      guestToken: x.guestToken,
      guestName: x.guestName,
      guestId: x.guestId || null,
      invitationId: x.invitationId || null,
      attendees: isIn ? x.attendees || 1 : 1,
      operatorName: x.operatorName || operator || "",
      tableName: x.tableName || tableName || "",
      checkedInAt: isIn && x.checkedInAt ? toLocalInput(x.checkedInAt) : "",
    });

    // Ambil id tamu & id undangan (dibutuhkan untuk suvenir/hadiah) bila belum ada di data tabel
    if (!x.guestId || !x.invitationId) {
      try {
        const r = await fetch(
          `/api/guests/lookup/checkin?token=${encodeURIComponent(x.guestToken)}`,
        );
        const d = await r.json();
        if (d?.guest) {
          setEditing((s) =>
            s && s.guestToken === x.guestToken
              ? {
                  ...s,
                  guestId: d.guest.id,
                  invitationId: d.guest.invitation?.id || s.invitationId,
                }
              : s,
          );
        }
      } catch {}
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    try {
      let res;
      if (editing.checkInId) {
        // sudah hadir → koreksi data
        res = await fetch(`/api/attendance/${editing.checkInId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            count: editing.attendees,
            operatorName: editing.operatorName,
            tableName: editing.tableName || null,
            createdAt: editing.checkedInAt
              ? new Date(editing.checkedInAt).toISOString()
              : undefined,
          }),
        });
      } else {
        // belum hadir → tandai hadir
        res = await fetch("/api/guests/lookup/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token: editing.guestToken,
            count: editing.attendees || 1,
            operatorName: editing.operatorName || operator || null,
            tableName: editing.tableName || null,
            deviceId: operatorDeviceId || null,
          }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");

      // Simpan suvenir / hadiah yang diisi (jika ada)
      await extrasRef.current?.saveAll({
        guestId: editing.guestId || data.guest?.id || null,
        guestName: editing.guestName,
        checkInId: editing.checkInId || data.checkInId || null,
      });

      toast.success("Kehadiran disimpan");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteCheckIn = async (checkInId) => {
    if (!confirm("Hapus catatan check-in ini?")) return;
    const res = await fetch(`/api/attendance/${checkInId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return toast.error(d.error || "Gagal menghapus");
    }
    toast.success("Check-in dihapus");
    load();
  };

  // Muat ulang setiap kali filter, pagination, atau refreshKey berubah.
  // Menunggu filter dipulihkan dulu supaya tidak memuat data dengan filter kosong.
  useEffect(() => {
    if (!hydrated) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hydrated,
    refreshKey,
    invitationId,
    deviceId,
    categoryId,
    statusFilter,
    page,
    limit,
    debouncedQ,
  ]);

  const hasActiveFilter =
    !!invitationId ||
    !!deviceId ||
    !!categoryId ||
    statusFilter !== "all" ||
    !!q;

  const resetFilters = () => {
    setInvitationId("");
    setDeviceId("");
    setCategoryId("");
    setStatusFilter("all");
    setQ("");
    setDebouncedQ("");
    setPage(1);
  };

  const exportXlsx = async () => {
    if (totalItems === 0) {
      alert("Tidak ada data kehadiran untuk diekspor!");
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (invitationId) params.set("invitationId", invitationId);
      if (deviceId) params.set("deviceId", deviceId);
      if (categoryId) params.set("categoryId", categoryId);
      if (debouncedQ) params.set("q", debouncedQ);
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("limit", "10000");

      const res = await fetch(`/api/attendance?${params.toString()}`);
      const data = await res.json();
      const exportItems = data.items || [];

      if (exportItems.length === 0) {
        alert("Tidak ada data kehadiran untuk diekspor!");
        setLoading(false);
        return;
      }

      const excelData = exportItems.map((x, index) => ({
        "No.": index + 1,
        "Nama Tamu": x.guestName || "-",
        "Tipe Tamu": x.guestType === "GROUP" ? "Grup" : "Individu",
        Kategori: x.category || "-",
        "Jumlah Hadir":
          x.status === "CHECKED_IN" ? Number(x.attendees || 0) : 0,
        "Status Kehadiran":
          x.status === "CHECKED_IN" ? "Sudah Check-in" : "Belum Check-in",
        "Waktu Check-in": x.checkedInAt
          ? new Date(x.checkedInAt).toLocaleString("id-ID")
          : "-",
        Operator: x.operatorName || "-",
        Meja: x.tableName || "-",
        "Perangkat / Device": x.deviceName || "-",
      }));

      excelData.push({});
      excelData.push({});

      excelData.push({
        "No.": "",
        "Nama Tamu": "RINGKASAN STATISTIK KEHADIRAN",
        "Tipe Tamu": "",
        Kategori: "",
        "Jumlah Hadir": "",
        "Status Kehadiran": "",
        "Waktu Check-in": "",
        Operator: "",
        Meja: "",
        "Perangkat / Device": "",
      });

      excelData.push({
        "No.": "",
        "Nama Tamu": "- Total Data Ditampilkan",
        "Tipe Tamu": exportItems.length,
        Kategori: "Data",
      });
      excelData.push({
        "No.": "",
        "Nama Tamu": "- Total Kehadiran (Orang Hadir)",
        "Tipe Tamu": totals.totalAttendees,
        Kategori: "Orang",
      });
      excelData.push({
        "No.": "",
        "Nama Tamu": "- Total Sudah Check-in",
        "Tipe Tamu": totals.totalCheckedIn,
        Kategori: "Kejadian",
      });
      excelData.push({
        "No.": "",
        "Nama Tamu": "- Total Belum Check-in",
        "Tipe Tamu": totals.totalNotCheckedIn,
        Kategori: "Kejadian",
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);

      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 32 },
        { wch: 15 },
        { wch: 22 },
        { wch: 15 },
        { wch: 18 },
        { wch: 25 },
        { wch: 20 },
        { wch: 14 },
        { wch: 22 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Kehadiran");

      const dateStr = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `Laporan_Kehadiran_${dateStr}.xlsx`);
    } catch (error) {
      console.error("Gagal mengekspor file:", error);
      alert("Terjadi kesalahan saat mengekspor data.");
    } finally {
      setLoading(false);
    }
  };

  const skip = (page - 1) * limit;
  const startEntry = totalItems > 0 ? skip + 1 : 0;
  const endEntry = Math.min(skip + limit, totalItems);

  // Kategori yang tampil mengikuti filter undangan
  const categoriesByInvitation = invitations
    .map((inv) => ({
      inv,
      cats: categories.filter((c) => c.invitationId === inv.id),
    }))
    .filter((g) => g.cats.length > 0);

  const visibleCategories = invitationId
    ? categories.filter((c) => c.invitationId === invitationId)
    : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-white border p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Total Kehadiran (Orang)
          </p>
          <p className="font-serif text-3xl font-bold mt-1 text-foreground">
            {totals.totalAttendees}
          </p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-white border p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Sudah Check-in
          </p>
          <p className="font-serif text-3xl font-bold mt-1 text-foreground">
            {totals.totalCheckedIn}
          </p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-white border p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Belum Check-in
          </p>
          <p className="font-serif text-3xl font-bold mt-1 text-foreground">
            {totals.totalNotCheckedIn}
          </p>
        </div>
        <div className="rounded-2xl bg-white border p-4 flex items-center gap-2 shadow-sm">
          <Button
            onClick={exportXlsx}
            disabled={loading || totalItems === 0}
            className="bg-primary flex-1 h-11 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Ekspor ke Excel ({totalItems})
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="rounded-2xl bg-white border p-4 shadow-sm flex flex-wrap items-center gap-3">
        {/* Undangan di paling awal */}

        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari nama tamu..."
            className="pl-10 h-10 text-sm rounded-xl"
          />
        </div>
        <select
          value={invitationId}
          onChange={(e) => {
            setInvitationId(e.target.value);
            setCategoryId(""); // kategori milik undangan lain tidak boleh terbawa
            setPage(1);
          }}
          className="h-10 px-3 rounded-xl border text-sm bg-background cursor-pointer"
        >
          <option value="">Semua Undangan</option>
          {invitations.map((i) => (
            <option key={i.id} value={i.id}>
              {i.brideName} & {i.groomName}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 rounded-xl border text-sm bg-background cursor-pointer"
        >
          <option value="all">Semua Status</option>
          <option value="CHECKED_IN">Sudah Check-in</option>
          <option value="NOT_CHECKED_IN">Belum Check-in</option>
        </select>

        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 rounded-xl border text-sm bg-background cursor-pointer"
        >
          <option value="">Semua Kategori</option>
          {invitationId
            ? visibleCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))
            : categoriesByInvitation.map(({ inv, cats }) => (
                <optgroup
                  key={inv.id}
                  label={`${inv.brideName} & ${inv.groomName}`}
                >
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              ))}
        </select>

        <select
          value={deviceId}
          onChange={(e) => {
            setDeviceId(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 rounded-xl border text-sm bg-background cursor-pointer"
        >
          <option value="">Semua Device</option>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        {hasActiveFilter && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-10 text-muted-foreground"
            title="Hapus semua filter"
          >
            <X className="h-4 w-4 mr-1" />
            Reset Filter
          </Button>
        )}
      </div>

      {/* Tabel */}
      <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-b">
            <thead className="bg-muted/40 text-xs uppercase tracking-widest text-muted-foreground text-left">
              <tr>
                <th className="px-5 py-4 font-semibold">Tamu</th>
                <th className="px-5 py-4 font-semibold">Kategori</th>
                <th className="px-5 py-4 font-semibold">Jumlah Hadir</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Waktu Check-in</th>
                <th className="px-5 py-4 font-semibold">Operator</th>
                <th className="px-5 py-4 font-semibold">Meja</th>
                <th className="px-5 py-4 font-semibold">Device</th>
                <th className="px-5 py-4 font-semibold">Foto Selfie</th>
                <th className="px-5 py-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading && items.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-16 text-center text-muted-foreground animate-pulse text-sm"
                  >
                    Memuat data...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-16 text-center text-muted-foreground text-sm"
                  >
                    Data tidak ditemukan
                  </td>
                </tr>
              ) : (
                items.map((x) => (
                  <tr
                    key={x.id}
                    className={`hover:bg-muted/30 transition-colors ${
                      x.status === "NOT_CHECKED_IN" ? "bg-amber-50/30" : ""
                    }`}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        {x.guestType === "GROUP" ? (
                          <UsersIcon className="h-4 w-4 text-primary shrink-0" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <p className="font-medium text-foreground">
                          {x.guestName}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {x.category || "-"}
                    </td>
                    <td className="px-5 py-4 font-medium text-foreground">
                      {x.status === "CHECKED_IN" ? x.attendees : "-"}
                    </td>
                    <td className="px-5 py-4">
                      {x.status === "CHECKED_IN" ? (
                        <span className="text-xs px-3 py-1 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                          Sudah Check-in
                        </span>
                      ) : (
                        <span className="text-xs px-3 py-1 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200/50">
                          Belum Check-in
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {x.checkedInAt
                        ? new Date(x.checkedInAt).toLocaleString("id-ID")
                        : "-"}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {x.operatorName || "-"}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {x.tableName || "-"}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {x.deviceName || "-"}
                    </td>
                    <td className="px-5 py-4">
                      {x.selfieUrl ? (
                        <button
                          onClick={() => setPreview(x.selfieUrl)}
                          className="h-10 w-10 rounded-lg overflow-hidden border shadow-sm hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          <img
                            src={x.selfieUrl}
                            alt="Selfie"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant={
                            x.status === "CHECKED_IN" ? "outline" : "default"
                          }
                          size="sm"
                          title="Edit kehadiran"
                          onClick={() => openAttendance(x)}
                          data-testid={`attendance-hadir-${x.id}`}
                        >
                          <UserCheck className="h-3.5 w-3.5 mr-1" />
                          Hadir
                        </Button>
                        {x.status === "CHECKED_IN" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Hapus check-in"
                            onClick={() =>
                              deleteCheckIn(x.id.replace(/^ci-/, ""))
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 px-6 py-4 bg-muted/20 border-t">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2.5">
              <label htmlFor="limit" className="font-medium text-foreground">
                Baris per halaman:
              </label>
              <select
                id="limit"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="h-8 px-2 py-1 rounded-lg border text-sm bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer text-foreground"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <span className="hidden sm:inline-block w-px h-4 bg-border" />

            <p className="text-sm">
              Menampilkan{" "}
              <span className="font-semibold text-foreground">
                {startEntry}
              </span>{" "}
              sampai{" "}
              <span className="font-semibold text-foreground">{endEntry}</span>{" "}
              dari{" "}
              <span className="font-semibold text-foreground">
                {totalItems}
              </span>{" "}
              data
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="rounded-lg px-3 text-sm text-muted-foreground bg-white border-gray-200 hover:bg-gray-50 h-8 font-medium cursor-pointer"
            >
              Sebelumnya
            </Button>

            {(() => {
              const pages = [];
              const numPages = totalPages === 0 ? 1 : totalPages;

              for (let i = 1; i <= numPages; i++) {
                if (
                  i === 1 ||
                  i === numPages ||
                  (i >= page - 1 && i <= page + 1)
                ) {
                  pages.push(
                    <Button
                      key={`page-${i}`}
                      variant={page === i ? "default" : "outline"}
                      onClick={() => setPage(i)}
                      className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        page === i
                          ? "bg-[#9A7254] hover:bg-[#866145] text-white border-0 shadow-sm"
                          : "bg-white text-muted-foreground border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {i}
                    </Button>,
                  );
                } else if (i === page - 2 || i === page + 2) {
                  pages.push(
                    <span
                      key={`ellipsis-${i}`}
                      className="px-1 text-sm text-muted-foreground"
                    >
                      ...
                    </span>,
                  );
                }
              }
              return pages;
            })()}

            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="rounded-lg px-3 text-sm text-muted-foreground bg-white border-gray-200 hover:bg-gray-50 h-8 font-medium cursor-pointer"
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </div>

      {/* Pratinjau Selfie */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-8 cursor-pointer backdrop-blur-sm"
        >
          <img
            src={preview}
            alt="Pratinjau Selfie"
            className="max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* Edit kehadiran (semua tamu) + suvenir + hadiah */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Kehadiran</DialogTitle>
            <DialogDescription>{editing?.guestName}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Jumlah hadir</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={editing.attendees}
                  onChange={(e) =>
                    setEditing((s) => ({
                      ...s,
                      attendees: parseInt(e.target.value, 10) || 1,
                    }))
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Operator</Label>
                  <Input
                    value={editing.operatorName}
                    onChange={(e) =>
                      setEditing((s) => ({
                        ...s,
                        operatorName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div>
                  <Label>Meja</Label>
                  <Input
                    value={editing.tableName}
                    placeholder="mis. Meja 1"
                    onChange={(e) =>
                      setEditing((s) => ({ ...s, tableName: e.target.value }))
                    }
                  />
                </div>
              </div>
              {editing.checkInId && (
                <div>
                  <Label>Waktu Check-in</Label>
                  <Input
                    type="datetime-local"
                    value={editing.checkedInAt}
                    onChange={(e) =>
                      setEditing((s) => ({ ...s, checkedInAt: e.target.value }))
                    }
                  />
                </div>
              )}

              {editing.invitationId && (
                <AttendanceExtras
                  ref={extrasRef}
                  key={editing.guestToken}
                  invitationId={editing.invitationId}
                  guestId={editing.guestId}
                  guestName={editing.guestName}
                  checkInId={editing.checkInId}
                  operatorName={editing.operatorName}
                />
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button
              onClick={saveEdit}
              disabled={savingEdit}
              className="bg-primary"
            >
              {savingEdit ? "Menyimpan…" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
