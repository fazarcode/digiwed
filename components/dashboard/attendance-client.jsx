"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  RefreshCw,
  User,
  Users as UsersIcon,
  FileDown,
  Pencil,
  Trash2,
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

export default function AttendanceClient({
  invitations,
  devices,
  categories = [],
  operator = "",
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
  const [debouncedQ, setDebouncedQ] = useState(""); // <-- State baru untuk auto-search

  const [statusFilter, setStatusFilter] = useState("all");
  const [preview, setPreview] = useState(null);
  const [editing, setEditing] = useState(null); // { checkInId, attendees, operatorName, checkedInAt }
  const [savingEdit, setSavingEdit] = useState(false);
  const [adding, setAdding] = useState(null); // { guestToken, count, operatorName, deviceId }

  // Pagination states
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // ==========================================
  // FITUR: Auto-fetch Search dengan Debounce (500ms)
  // ==========================================
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1); // Reset ke halaman 1 tiap kali pencarian berubah
    }, 500);
    return () => clearTimeout(timer);
  }, [q]);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (invitationId) params.set("invitationId", invitationId);
    if (deviceId) params.set("deviceId", deviceId);
    if (categoryId) params.set("categoryId", categoryId);
    if (debouncedQ) params.set("q", debouncedQ); // <-- Gunakan debouncedQ
    if (statusFilter !== "all") params.set("status", statusFilter);

    // Append pagination params
    params.set("page", page);
    params.set("limit", limit);

    try {
      const res = await fetch(`/api/attendance?${params.toString()}`);
      const data = await res.json();

      setItems(data.items || []);
      setTotals({
        totalAttendees: data.totalAttendees || 0,
        totalCheckedIn: data.totalCheckedIn || 0,
        totalNotCheckedIn: data.totalNotCheckedIn || 0,
      });
      setTotalPages(data.totalPages || 1);
      setTotalItems(data.total || data.totalItems || data.items?.length || 0);
    } catch (error) {
      console.error("Gagal memuat data kehadiran:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/attendance/${editing.checkInId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: editing.attendees,
          operatorName: editing.operatorName,
          createdAt: editing.checkedInAt ? new Date(editing.checkedInAt).toISOString() : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      toast.success("Attendance updated");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteCheckIn = async (checkInId) => {
    if (!confirm("Delete this check-in record?")) return;
    const res = await fetch(`/api/attendance/${checkInId}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return toast.error(d.error || "Delete failed");
    }
    toast.success("Check-in deleted");
    load();
  };

  const addCheckIn = async () => {
    if (!adding?.guestToken) return toast.error("Select a guest");
    setSavingEdit(true);
    try {
      const res = await fetch("/api/guests/lookup/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: adding.guestToken,
          count: adding.count || 1,
          operatorName: adding.operatorName || operator || null,
          deviceId: adding.deviceId || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to add attendance");
      toast.success("Attendance added");
      setAdding(null);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSavingEdit(false);
    }
  };
  const notCheckedInOptions = items.filter((x) => x.status === "NOT_CHECKED_IN");

  // Panggil load setiap kali filter atau pagination berubah
  useEffect(() => {
    load();
  }, [
    invitationId,
    deviceId,
    categoryId,
    statusFilter,
    page,
    limit,
    debouncedQ,
  ]); // <-- debouncedQ masuk ke dependencies

  const handleSearch = () => {
    if (page !== 1) {
      setPage(1);
    } else {
      load();
    }
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
          x.status === "CHECKED_IN" ? "Checked-in" : "Not Checked-in",
        "Waktu Check-in": x.checkedInAt
          ? new Date(x.checkedInAt).toLocaleString("id-ID")
          : "-",
        Operator: x.operatorName || "-",
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
        "Perangkat / Device": "",
      });

      excelData.push({
        "No.": "",
        "Nama Tamu": "- Total Data Ditampilkan",
        "Tipe Tamu": exportItems.length,
        Kategori: "Records",
      });
      excelData.push({
        "No.": "",
        "Nama Tamu": "- Total Attendees (Orang Hadir)",
        "Tipe Tamu": totals.totalAttendees,
        Kategori: "Orang",
      });
      excelData.push({
        "No.": "",
        "Nama Tamu": "- Total Checked-in",
        "Tipe Tamu": totals.totalCheckedIn,
        Kategori: "Event",
      });
      excelData.push({
        "No.": "",
        "Nama Tamu": "- Total Not Checked-in",
        "Tipe Tamu": totals.totalNotCheckedIn,
        Kategori: "Event",
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
        { wch: 22 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Kehadiran");

      const dateStr = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `Laporan_Kehadiran_${dateStr}.xlsx`);
    } catch (error) {
      console.error("Gagal mengexport file:", error);
      alert("Terjadi kesalahan saat mengexport data.");
    } finally {
      setLoading(false);
    }
  };

  const skip = (page - 1) * limit;
  const startEntry = totalItems > 0 ? skip + 1 : 0;
  const endEntry = Math.min(skip + limit, totalItems);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-white border p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Total Attendees
          </p>
          <p className="font-serif text-3xl font-bold mt-1 text-foreground">
            {totals.totalAttendees}
          </p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-white border p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Checked-in Events
          </p>
          <p className="font-serif text-3xl font-bold mt-1 text-foreground">
            {totals.totalCheckedIn}
          </p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-white border p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
            Not Checked-in
          </p>
          <p className="font-serif text-3xl font-bold mt-1 text-foreground">
            {totals.totalNotCheckedIn}
          </p>
        </div>
        <div className="rounded-2xl bg-white border p-4 flex items-center gap-2 shadow-sm">
          <Button
            onClick={() => setAdding({ guestToken: "", count: 1, operatorName: operator || "", deviceId: "" })}
            variant="outline"
            className="flex-1 h-11 text-sm font-medium"
            data-testid="add-attendance-btn"
          >
            <User className="h-4 w-4 mr-2" />
            Add Attendance
          </Button>
        </div>
        <div className="rounded-2xl bg-white border p-4 flex items-center gap-2 shadow-sm">
          <Button
            onClick={exportXlsx}
            disabled={loading || totalItems === 0}
            className="bg-primary flex-1 h-11 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export to Excel ({totalItems})
          </Button>
        </div>
      </div>

      {/* Filter Section */}
      <div className="rounded-2xl bg-white border p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            // onKeyDown dihapus karena fitur search sudah otomatis fetch via debounce
            placeholder="Search guest name..."
            className="pl-10 h-10 text-sm rounded-xl"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 rounded-xl border text-sm bg-background cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="CHECKED_IN">Checked-in</option>
          <option value="NOT_CHECKED_IN">Not Checked-in</option>
        </select>
        <select
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 rounded-xl border text-sm bg-background cursor-pointer"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={invitationId}
          onChange={(e) => {
            setInvitationId(e.target.value);
            setPage(1);
          }}
          className="h-10 px-3 rounded-xl border text-sm bg-background cursor-pointer"
        >
          <option value="">All Invitations</option>
          {invitations.map((i) => (
            <option key={i.id} value={i.id}>
              {i.brideName} & {i.groomName}
            </option>
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
          <option value="">All Devices</option>
          {devices.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        {/* Tombol refresh tetap dibiarkan untuk "force manual pull" jika user ingin reload manual */}
        {/* <Button
          variant="outline"
          size="default"
          onClick={handleSearch}
          disabled={loading}
          className="h-10 px-4 rounded-xl cursor-pointer"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button> */}
      </div>

      {/* Tabel */}
      <div className="rounded-2xl bg-white border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-b">
            <thead className="bg-muted/40 text-xs uppercase tracking-widest text-muted-foreground text-left">
              <tr>
                <th className="px-5 py-4 font-semibold">Guest</th>
                <th className="px-5 py-4 font-semibold">Category</th>
                <th className="px-5 py-4 font-semibold">Attendees</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold">Check-in Time</th>
                <th className="px-5 py-4 font-semibold">Operator</th>
                <th className="px-5 py-4 font-semibold">iPad Code</th>
                <th className="px-5 py-4 font-semibold">Selfie Photo</th>
                <th className="px-5 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading && items.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-16 text-center text-muted-foreground animate-pulse text-sm"
                  >
                    Loading data...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-16 text-center text-muted-foreground text-sm"
                  >
                    No records found
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
                          Checked-in
                        </span>
                      ) : (
                        <span className="text-xs px-3 py-1 rounded-full font-medium bg-amber-50 text-amber-700 border border-amber-200/50">
                          Not Checked In
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {x.checkedInAt
                        ? new Date(x.checkedInAt).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {x.operatorName || "-"}
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
                      {x.status === "CHECKED_IN" ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Edit attendance"
                            onClick={() =>
                              setEditing({
                                checkInId: x.id.replace(/^ci-/, ""),
                                guestName: x.guestName,
                                attendees: x.attendees || 1,
                                operatorName: x.operatorName || operator || "",
                                checkedInAt: x.checkedInAt
                                  ? new Date(x.checkedInAt).toISOString().slice(0, 16)
                                  : "",
                              })
                            }
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Delete check-in"
                            onClick={() => deleteCheckIn(x.id.replace(/^ci-/, ""))}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-600" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* ========================================== */}
        {/* FOOTER: PAGINATION TAMPILAN BARU SESUAI FOTO */}
        {/* ========================================== */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 px-6 py-4 bg-muted/20 border-t">
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2.5">
              <label htmlFor="limit" className="font-medium text-foreground">
                Rows per page:
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
              Showing{" "}
              <span className="font-semibold text-foreground">
                {startEntry}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-foreground">{endEntry}</span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">
                {totalItems}
              </span>{" "}
              entries
            </p>
          </div>

          {/* PERUBAHAN UKURAN PAGINATION DI SINI */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="rounded-lg px-3 text-sm text-muted-foreground bg-white border-gray-200 hover:bg-gray-50 h-8 font-medium cursor-pointer"
            >
              Previous
            </Button>

            {/* Render Deretan Angka Halaman Dinamis */}
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
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* Selfie Preview Modal */}
      {preview && (
        <div
          onClick={() => setPreview(null)}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-8 cursor-pointer backdrop-blur-sm"
        >
          <img
            src={preview}
            alt="Selfie Preview"
            className="max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* Edit attendance (check-in correction) */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Attendance</DialogTitle>
            <DialogDescription>{editing?.guestName}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Attendees (count)</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={editing.attendees}
                  onChange={(e) => setEditing((s) => ({ ...s, attendees: parseInt(e.target.value, 10) || 1 }))}
                />
              </div>
              <div>
                <Label>Operator</Label>
                <Input
                  value={editing.operatorName}
                  onChange={(e) => setEditing((s) => ({ ...s, operatorName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Check-in Time</Label>
                <Input
                  type="datetime-local"
                  value={editing.checkedInAt}
                  onChange={(e) => setEditing((s) => ({ ...s, checkedInAt: e.target.value }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={savingEdit} className="bg-primary">
              {savingEdit ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!adding} onOpenChange={(o) => !o && setAdding(null)}>
        <DialogContent data-testid="add-attendance-dialog">
          <DialogHeader>
            <DialogTitle>Add Attendance</DialogTitle>
            <DialogDescription>Manually check in a guest who hasn't been checked in yet.</DialogDescription>
          </DialogHeader>
          {adding && (
            <div className="space-y-3">
              <div>
                <Label>Guest (not checked in)</Label>
                <select
                  value={adding.guestToken}
                  onChange={(e) => setAdding((s) => ({ ...s, guestToken: e.target.value }))}
                  className="w-full h-10 px-3 rounded-md border text-sm bg-white"
                  data-testid="add-attendance-guest"
                >
                  <option value="">Select a guest…</option>
                  {notCheckedInOptions.map((x) => (
                    <option key={x.id} value={x.guestToken}>{x.guestName}{x.category ? ` — ${x.category}` : ""}</option>
                  ))}
                </select>
                {notCheckedInOptions.length === 0 && <p className="text-xs text-muted-foreground mt-1">All visible guests are already checked in. Adjust filters to see more.</p>}
              </div>
              <div>
                <Label>Attendees (count)</Label>
                <Input type="number" min={1} max={50} value={adding.count} onChange={(e) => setAdding((s) => ({ ...s, count: parseInt(e.target.value, 10) || 1 }))} data-testid="add-attendance-count" />
              </div>
              <div>
                <Label>Operator</Label>
                <Input value={adding.operatorName} onChange={(e) => setAdding((s) => ({ ...s, operatorName: e.target.value }))} placeholder="Operator name" />
              </div>
              <div>
                <Label>Device</Label>
                <select value={adding.deviceId} onChange={(e) => setAdding((s) => ({ ...s, deviceId: e.target.value }))} className="w-full h-10 px-3 rounded-md border text-sm bg-white">
                  <option value="">No device</option>
                  {devices.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(null)}>Cancel</Button>
            <Button onClick={addCheckIn} disabled={savingEdit || !adding?.guestToken} className="bg-primary" data-testid="add-attendance-submit">
              {savingEdit ? "Adding…" : "Add Attendance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
