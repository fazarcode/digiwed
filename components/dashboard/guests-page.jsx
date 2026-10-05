"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Trash2,
  QrCode as QrIcon,
  Plus,
  Search,
  Upload,
  Download,
  Users as UsersIcon,
  User,
  Pencil,
  MessageSquare,
  CheckSquare,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import ImportPreviewDialog from "@/components/dashboard/import-preview-dialog";
import {
  renderTemplate,
  buildContext,
  buildInvitationUrl,
} from "@/lib/whatsapp";

// --- ICON WHATSAPP SVG (Resmi & Clean) ---
const WhatsAppIcon = ({ className = "h-4 w-4" }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const TYPE_LABEL = {
  INDIVIDUAL: "Individu",
  GROUP: "Grup",
};

export default function GuestsPageClient({ invitations, messageTemplate }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedId, setSelectedId] = useState(
    searchParams.get("invitation") || invitations[0]?.id || "",
  );
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [filterType, setFilterType] = useState(
    searchParams.get("type") || "ALL",
  );
  const [filterCategory, setFilterCategory] = useState(
    searchParams.get("category") || "ALL",
  );
  const [filterSide, setFilterSide] = useState(
    searchParams.get("side") || "ALL",
  );

  const [selectedGuestIds, setSelectedGuestIds] = useState([]);
  const [sides, setSides] = useState([]);

  // --- STATE PAGINATION ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    guestType: "INDIVIDUAL",
    quota: 1,
    gender: "",
    guestSide: "",
    sideId: "",
    categoryId: "",
  });

  const [importing, setImporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState(null);
  const [editing, setEditing] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // --- POPUP PILIH TEMPLATE PESAN (untuk Salin Pesan & Kirim WhatsApp) ---
  const [tplOpen, setTplOpen] = useState(false);
  const [tplAction, setTplAction] = useState("copy"); // "copy" | "wa"
  const [tplGuest, setTplGuest] = useState(null);
  const [tplList, setTplList] = useState([]);
  const [tplId, setTplId] = useState("");
  const [tplLoading, setTplLoading] = useState(false);

  const selected = invitations.find((i) => i.id === selectedId);
  // Kategori milik undangan yang sedang dipilih
  const categories = selected?.categories || [];
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Req 5 — load DB-driven Guest Sides for the selected invitation.
  useEffect(() => {
    if (!selectedId) {
      setSides([]);
      return;
    }
    fetch(`/api/invitations/${selectedId}/sides`)
      .then((r) => r.json())
      .then((d) => setSides(d.items || []))
      .catch(() => setSides([]));
  }, [selectedId]);

  // Reset pilihan & kembali ke halaman 1 jika filter/undangan berubah
  useEffect(() => {
    setSelectedGuestIds([]);
    setCurrentPage(1);
  }, [selectedId, q, filterType, filterCategory, filterSide]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedId) params.set("invitation", selectedId);
    if (q) params.set("q", q);
    if (filterType !== "ALL") params.set("type", filterType);
    if (filterCategory !== "ALL") params.set("category", filterCategory);
    if (filterSide !== "ALL") params.set("side", filterSide);

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [selectedId, q, filterType, filterCategory, filterSide, pathname, router]);

  // Ganti undangan: reset filter & form yang bergantung pada kategori/pihak
  const handleInvitationChange = (id) => {
    setSelectedId(id);
    setFilterCategory("ALL");
    setFilterSide("ALL");
    setForm((f) => ({ ...f, categoryId: "", sideId: "" }));
  };

  const filtered = (selected?.guests || []).filter((g) => {
    if (q && !g.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (filterType !== "ALL" && g.guestType !== filterType) return false;
    if (filterCategory !== "ALL" && g.categoryId !== filterCategory)
      return false;
    if (filterSide !== "ALL" && g.sideId !== filterSide) return false;
    return true;
  });

  // --- LOGIKA PENGIRISAN DATA UNTUK PAGINATION ---
  // "ALL" = satu halaman berisi semua data (pakai angka terbatas, bukan Infinity, agar tidak jadi NaN)
  const pageSize =
    itemsPerPage === "ALL" ? Math.max(filtered.length, 1) : itemsPerPage;
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedGuests = filtered.slice(startIndex, startIndex + pageSize);

  const handleRowsPerPageChange = (e) => {
    setItemsPerPage(e.target.value === "ALL" ? "ALL" : Number(e.target.value));
    setCurrentPage(1); // Reset ke halaman 1 setiap kali jumlah baris diubah
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedGuestIds(filtered.map((g) => g.id));
    } else {
      setSelectedGuestIds([]);
    }
  };

  const handleSelectOne = (id) => {
    if (selectedGuestIds.includes(id)) {
      setSelectedGuestIds(selectedGuestIds.filter((gid) => gid !== id));
    } else {
      setSelectedGuestIds([...selectedGuestIds, id]);
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Yakin ingin menghapus ${selectedGuestIds.length} tamu?`))
      return;
    setIsDeletingBulk(true);

    try {
      await Promise.all(
        selectedGuestIds.map((gid) =>
          fetch(`/api/invitations/${selected.id}/guests/${gid}`, {
            method: "DELETE",
          }),
        ),
      );
      toast.success(`${selectedGuestIds.length} tamu berhasil dihapus`);
      setSelectedGuestIds([]);
      router.refresh();
    } catch (error) {
      toast.error("Gagal menghapus sebagian tamu");
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleBulkDownloadQR = () => {
    const idsParam = selectedGuestIds.join(",");
    window.open(`/api/guests/export-qr-pdf?ids=${idsParam}`, "_blank");
  };

  const add = async (e) => {
    if (e) e.preventDefault();
    if (!form.name || !selected) return;
    const payload = {
      ...form,
      gender: form.gender || null,
      guestSide: form.guestSide || null,
      categoryId: form.categoryId || null,
    };
    const res = await fetch(`/api/invitations/${selected.id}/guests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return toast.error("Gagal menambahkan tamu");
    toast.success("Tamu berhasil ditambahkan");
    setForm({
      name: "",
      phone: "",
      guestType: "INDIVIDUAL",
      quota: 1,
      gender: "",
      guestSide: "",
      sideId: "",
      categoryId: "",
    });
    setIsAddOpen(false);
    router.refresh();
  };

  const remove = async (gid) => {
    if (!confirm("Hapus tamu ini?")) return;
    await fetch(`/api/invitations/${selected.id}/guests/${gid}`, {
      method: "DELETE",
    });
    router.refresh();
  };

  const copyLink = (g) => {
    navigator.clipboard.writeText(buildInvitationUrl(baseUrl, selected, g));
    toast.success("Tautan tamu disalin");
  };

  // Render pesan untuk satu tamu memakai isi template tertentu (default: template bawaan user).
  const buildMessage = (g, body = messageTemplate) => {
    const ctx = buildContext({
      invitation: selected,
      guest: g,
      origin: baseUrl,
    });
    return renderTemplate(body, ctx);
  };

  // Buka popup pilih template, lalu muat daftar template dari API.
  const openTemplatePicker = async (g, action) => {
    setTplGuest(g);
    setTplAction(action);
    setTplOpen(true);
    setTplLoading(true);
    try {
      const r = await fetch("/api/message-templates");
      const d = await r.json();
      const list = (d.items || d.templates || []).filter(
        (t) => t.active !== false,
      );
      setTplList(list);
      setTplId(list[0]?.id || "");
    } catch {
      setTplList([]);
      setTplId("");
      toast.error("Gagal memuat template pesan");
    } finally {
      setTplLoading(false);
    }
  };

  const tplBody = tplList.find((t) => t.id === tplId)?.body || messageTemplate;
  const tplPreview = tplGuest ? buildMessage(tplGuest, tplBody) : "";

  const confirmTemplate = () => {
    if (!tplGuest) return;
    const text = buildMessage(tplGuest, tplBody);
    if (tplAction === "copy") {
      navigator.clipboard.writeText(text);
      toast.success("Pesan undangan disalin");
    } else {
      const phone = String(tplGuest.phone || "").replace(/\D/g, "");
      const msg = encodeURIComponent(text);
      window.open(
        phone
          ? `https://wa.me/${phone}?text=${msg}`
          : `https://wa.me/?text=${msg}`,
        "_blank",
      );
    }
    setTplOpen(false);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: fd.get("name"),
      phone: fd.get("phone"),
      guestType: fd.get("guestType"),
      quota: parseInt(fd.get("quota"), 10) || 1,
      gender: fd.get("gender") || null,
      sideId: fd.get("sideId") || null,
      categoryId: fd.get("categoryId") || null,
    };
    const res = await fetch(
      `/api/invitations/${selected.id}/guests/${editing.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return toast.error(err.error || "Gagal menyimpan perubahan");
    }
    toast.success("Data tamu diperbarui");
    setEditing(null);
    router.refresh();
  };

  const doImport = async (e) => {
    const f = e.target.files?.[0];
    if (!f || !selected) return;
    setImporting(true);
    const fd = new FormData();
    fd.append("file", f);
    // Feature I: PARSE only (no DB insert). Opens a preview dialog for selection/mapping.
    const res = await fetch(`/api/invitations/${selected.id}/guests/parse`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    setImporting(false);
    e.target.value = "";
    if (!res.ok) return toast.error(data.error || "Tidak dapat membaca file");
    setImportData(data);
    setImportOpen(true);
  };

  if (invitations.length === 0)
    return (
      <div className="rounded-2xl bg-white border p-12 text-center">
        <p className="text-muted-foreground">
          Buat undangan terlebih dahulu untuk mengelola tamu.
        </p>
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Header Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-white border p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm font-semibold">Manajemen Tamu</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline-block">
              untuk
            </span>
            <select
              value={selectedId}
              onChange={(e) => handleInvitationChange(e.target.value)}
              className="h-9 px-3 py-1 rounded-md border text-sm font-medium bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px]"
            >
              {invitations.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.brideName} & {i.groomName} ({i.guests.length} tamu)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/invitations/${selected?.id}/guests/import-template`}
            target="_blank"
          >
            <Button size="sm" variant="outline">
              <Download className="h-3.5 w-3.5 mr-1" />
              Template
            </Button>
          </a>
          <label>
            <Button asChild size="sm" variant="outline" disabled={importing}>
              <span>
                <Upload className="h-3.5 w-3.5 mr-1" />
                {importing ? "Mengimpor…" : "Impor Excel"}
              </span>
            </Button>
            <input type="file" hidden accept=".xlsx,.xls" onChange={doImport} />
          </label>
          <Button
            onClick={() => setIsAddOpen(true)}
            size="sm"
            className="bg-primary"
          >
            <Plus className="h-4 w-4 mr-1" />
            Tambah Tamu
          </Button>
        </div>
      </div>

      {/* Area Tabel */}
      <div className="rounded-2xl bg-white border">
        {/* Filter Bar */}
        <div className="p-4 border-b flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari tamu…"
              className="pl-9"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-9 px-2 rounded-md border text-sm"
          >
            <option value="ALL">Semua Tipe</option>
            <option value="INDIVIDUAL">Individu</option>
            <option value="GROUP">Grup</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 px-2 rounded-md border text-sm"
          >
            <option value="ALL">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={filterSide}
            onChange={(e) => setFilterSide(e.target.value)}
            className="h-9 px-2 rounded-md border text-sm"
            data-testid="filter-side"
          >
            <option value="ALL">Semua Pihak</option>
            {sides.map((sd) => (
              <option key={sd.id} value={sd.id}>
                {sd.name}
              </option>
            ))}
          </select>
          <p className="text-sm text-muted-foreground ml-auto">
            {filtered.length} dari {selected?.guests.length || 0}
          </p>
        </div>

        {/* BULK ACTION BAR */}
        {selectedGuestIds.length > 0 && (
          <div className="p-3 bg-primary/5 border-b flex items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <CheckSquare className="h-4 w-4" />
              {selectedGuestIds.length} Tamu Dipilih
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-white"
                onClick={handleBulkDownloadQR}
              >
                <Download className="h-3.5 w-3.5 mr-2" /> Unduh QR (PDF)
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isDeletingBulk}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />{" "}
                {isDeletingBulk ? "Menghapus..." : "Hapus yang Dipilih"}
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              onClick={() => setSelectedGuestIds([])}
            >
              Batalkan Pilihan
            </Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs uppercase tracking-widest text-muted-foreground text-left">
              <tr>
                <th className="px-4 py-2 w-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-primary"
                    checked={
                      selectedGuestIds.length === filtered.length &&
                      filtered.length > 0
                    }
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-2">Nama</th>
                <th className="px-4 py-2">Tipe</th>
                <th className="px-4 py-2">Kategori</th>
                <th className="px-4 py-2">Pihak</th>
                <th className="px-4 py-2 text-center">Bagikan</th>
                <th className="px-4 py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedGuests.map((g) => (
                <tr
                  key={g.id}
                  className={`border-t transition-colors ${selectedGuestIds.includes(g.id) ? "bg-primary/5" : "hover:bg-muted/30"}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-primary"
                      checked={selectedGuestIds.includes(g.id)}
                      onChange={() => handleSelectOne(g.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {g.guestType === "GROUP" ? (
                        <UsersIcon className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">{g.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {g.phone || "—"}
                        </p>
                        {g.trackingCode && (
                          <p
                            className="text-[10px] font-mono text-primary/70 mt-0.5"
                            data-testid={`guest-code-${g.id}`}
                          >
                            {g.trackingCode}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${g.guestType === "GROUP" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                    >
                      {TYPE_LABEL[g.guestType] || g.guestType}
                    </span>
                  </td>
                  <td className="px-4 py-3">{g.category || "—"}</td>
                  <td className="px-4 py-3">
                    {g.sideName ||
                      sides.find((sd) => sd.id === g.sideId)?.name ||
                      "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyLink(g)}
                        title="Salin Tautan"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openTemplatePicker(g, "copy")}
                        title="Salin Pesan"
                        data-testid={`copy-message-${g.id}`}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openTemplatePicker(g, "wa")}
                        title="Kirim WhatsApp"
                        data-testid={`send-whatsapp-${g.id}`}
                      >
                        <WhatsAppIcon className="h-4 w-4 text-emerald-600" />
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditing(g)}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <a href={`/api/guests/${g.id}/qr`} target="_blank">
                        <Button size="sm" variant="ghost" title="Lihat QR">
                          <QrIcon className="h-4 w-4" />
                        </Button>
                      </a>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(g.id)}
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedGuests.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Tamu tidak ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* --- KONTROL PAGINATION --- */}
        {filtered.length > 0 && (
          <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            {/* Bagian Kiri: Baris per halaman & Menampilkan X sampai Y */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-foreground">Baris per halaman:</span>
                <select
                  value={itemsPerPage}
                  onChange={handleRowsPerPageChange}
                  className="h-8 px-2 rounded-md border bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value="ALL">Semua</option>
                </select>
              </div>
              <span className="text-border">|</span>
              <span>
                Menampilkan{" "}
                <span className="font-semibold text-foreground">
                  {startIndex + 1}
                </span>{" "}
                sampai{" "}
                <span className="font-semibold text-foreground">
                  {Math.min(startIndex + pageSize, filtered.length)}
                </span>{" "}
                dari{" "}
                <span className="font-semibold text-foreground">
                  {filtered.length}
                </span>{" "}
                data
              </span>
            </div>

            {/* Bagian Kanan: Sebelumnya [1] [2] Berikutnya */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-muted-foreground"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Sebelumnya
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (pageNum) => (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className={`h-8 w-8 p-0 ${currentPage !== pageNum ? "text-muted-foreground" : ""}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                ),
              )}

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-muted-foreground"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* POPUP PILIH TEMPLATE PESAN */}
      <Dialog open={tplOpen} onOpenChange={setTplOpen}>
        <DialogContent
          className="max-w-lg"
          data-testid="template-picker-dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {tplAction === "wa" ? "Kirim WhatsApp" : "Salin Pesan"}
              {tplGuest ? ` — ${tplGuest.name}` : ""}
            </DialogTitle>
            <DialogDescription>
              Pilih template pesan yang ingin digunakan.
            </DialogDescription>
          </DialogHeader>

          {tplLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Memuat template…
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>Template Pesan</Label>
                <select
                  value={tplId}
                  onChange={(e) => setTplId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border text-sm bg-white"
                  data-testid="template-picker-select"
                >
                  {tplList.length === 0 && (
                    <option value="">Template default</option>
                  )}
                  {tplList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {tplList.length === 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Belum ada template pesan. Memakai template default.
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs">Pratinjau</Label>
                <div className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs">
                  {tplPreview || "—"}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTplOpen(false)}>
              Batal
            </Button>
            <Button
              className={
                tplAction === "wa"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-primary"
              }
              onClick={confirmTemplate}
              disabled={tplLoading}
              data-testid="template-picker-confirm"
            >
              {tplAction === "wa" ? "Buka WhatsApp" : "Salin Pesan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL TAMBAH TAMU */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Tamu Baru</DialogTitle>
            <DialogDescription>
              Isi detail tamu untuk mengundang mereka.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={add} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Nama*</Label>
                <Input
                  placeholder="mis. Budi Santoso"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Telepon</Label>
                <Input
                  placeholder="mis. 0812..."
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Tipe Tamu</Label>
                <select
                  value={form.guestType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      guestType: e.target.value,
                      quota:
                        e.target.value === "GROUP"
                          ? Math.max(form.quota, 2)
                          : 1,
                    })
                  }
                  className="w-full h-10 px-3 rounded-md border text-sm"
                >
                  <option value="INDIVIDUAL">Individu</option>
                  <option value="GROUP">Grup</option>
                </select>
              </div>
              <div>
                <Label>Kuota</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={form.quota}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      quota: parseInt(e.target.value, 10) || 1,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Kategori</Label>
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm({ ...form, categoryId: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-md border text-sm"
                >
                  <option value="">— Tidak ada —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {categories.length === 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Tambahkan Kategori di editor undangan → Kategori Tamu.
                  </p>
                )}
              </div>
              <div>
                <Label>Pihak Tamu</Label>
                <select
                  value={form.sideId}
                  onChange={(e) => setForm({ ...form, sideId: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border text-sm"
                  data-testid="add-guest-side"
                >
                  <option value="">— Tidak ada —</option>
                  {sides.map((sd) => (
                    <option key={sd.id} value={sd.id}>
                      {sd.name}
                    </option>
                  ))}
                </select>
                {sides.length === 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Tambahkan Pihak di editor undangan → Pihak Tamu.
                  </p>
                )}
              </div>
            </div>
            <div>
              <Label>Jenis Kelamin</Label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full h-10 px-3 rounded-md border text-sm"
              >
                <option value="">— Tidak ada —</option>
                <option value="MALE">Laki-laki</option>
                <option value="FEMALE">Perempuan</option>
                <option value="OTHER">Lainnya</option>
              </select>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" className="bg-primary">
                Tambah Tamu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL EDIT TAMU */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Tamu</DialogTitle>
            <DialogDescription>
              Perbarui detail tamu. Token & QR tetap sama.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={saveEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Nama</Label>
                  <Input name="name" defaultValue={editing.name} required />
                </div>
                <div>
                  <Label>Telepon</Label>
                  <Input name="phone" defaultValue={editing.phone || ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Tipe Tamu</Label>
                  <select
                    name="guestType"
                    defaultValue={editing.guestType}
                    className="w-full h-10 px-3 rounded-md border text-sm"
                  >
                    <option value="INDIVIDUAL">Individu</option>
                    <option value="GROUP">Grup</option>
                  </select>
                </div>
                <div>
                  <Label>Kuota</Label>
                  <Input
                    name="quota"
                    type="number"
                    min={1}
                    max={100}
                    defaultValue={editing.quota || 1}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Kategori</Label>
                  <select
                    name="categoryId"
                    defaultValue={editing.categoryId || ""}
                    className="w-full h-10 px-3 rounded-md border text-sm"
                  >
                    <option value="">— Tidak ada —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Pihak Tamu</Label>
                  <select
                    name="sideId"
                    defaultValue={editing.sideId || ""}
                    className="w-full h-10 px-3 rounded-md border text-sm"
                    data-testid="edit-guest-side"
                  >
                    <option value="">— Tidak ada —</option>
                    {sides.map((sd) => (
                      <option key={sd.id} value={sd.id}>
                        {sd.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label>Jenis Kelamin</Label>
                <select
                  name="gender"
                  defaultValue={editing.gender || ""}
                  className="w-full h-10 px-3 rounded-md border text-sm"
                >
                  <option value="">— Tidak ada —</option>
                  <option value="MALE">Laki-laki</option>
                  <option value="FEMALE">Perempuan</option>
                  <option value="OTHER">Lainnya</option>
                </select>
              </div>
              <div className="rounded-md bg-muted/40 border p-2 text-xs text-muted-foreground">
                Token Undangan:{" "}
                <code className="font-mono">{editing.token}</code> (hanya baca)
              </div>
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
                >
                  Batal
                </Button>
                <Button type="submit" className="bg-primary">
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <ImportPreviewDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        invitationId={selected?.id}
        data={importData}
        onDone={() => router.refresh()}
      />
    </div>
  );
}
