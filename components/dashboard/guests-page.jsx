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

const SIDE_LABEL = {
  GROOM: "Groom",
  BRIDE: "Bride",
  BOTH: "Both",
  PARENTS: "Parents",
};

export default function GuestsPageClient({
  invitations,
  categories,
  messageTemplate,
}) {
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

  // Req 4 — bulk WhatsApp with template selection + "Fix Message" toggle.
  const [waOpen, setWaOpen] = useState(false);
  const [waTemplates, setWaTemplates] = useState([]);
  const [waTemplateId, setWaTemplateId] = useState("");
  const [waFix, setWaFix] = useState(false);

  const selected = invitations.find((i) => i.id === selectedId);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  // Req 5 — load DB-driven Guest Sides for the selected invitation.
  useEffect(() => {
    if (!selectedId) { setSides([]); return; }
    fetch(`/api/invitations/${selectedId}/sides`).then((r) => r.json()).then((d) => setSides(d.items || [])).catch(() => setSides([]));
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

  const filtered = (selected?.guests || []).filter((g) => {
    if (q && !g.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (filterType !== "ALL" && g.guestType !== filterType) return false;
    if (filterCategory !== "ALL" && g.categoryId !== filterCategory)
      return false;
    if (filterSide !== "ALL" && g.sideId !== filterSide) return false;
    return true;
  });

  // --- LOGIKA PENGIRISAN DATA UNTUK PAGINATION ---
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedGuests = filtered.slice(startIndex, startIndex + itemsPerPage);

  const handleRowsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
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
    if (
      !confirm(
        `Are you sure you want to delete ${selectedGuestIds.length} guests?`,
      )
    )
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
      toast.success(`${selectedGuestIds.length} guests deleted`);
      setSelectedGuestIds([]);
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete some guests");
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
    if (!res.ok) return toast.error("Failed");
    toast.success("Guest added successfully");
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
    if (!confirm("Delete this guest?")) return;
    await fetch(`/api/invitations/${selected.id}/guests/${gid}`, {
      method: "DELETE",
    });
    router.refresh();
  };

  const copyLink = (g) => {
    navigator.clipboard.writeText(
      buildInvitationUrl(baseUrl, selected, g.token),
    );
    toast.success("Guest link copied");
  };
  const buildMessage = (g) => {
    const ctx = buildContext({
      invitation: selected,
      guest: g,
      origin: baseUrl,
    });
    return renderTemplate(messageTemplate, ctx);
  };
  const copyMessage = (g) => {
    navigator.clipboard.writeText(buildMessage(g));
    toast.success("Invitation message copied");
  };
  const sendWhatsApp = (g) => {
    const msg = encodeURIComponent(buildMessage(g));
    const phone = String(g.phone || "").replace(/\D/g, "");
    window.open(
      phone
        ? `https://wa.me/${phone}?text=${msg}`
        : `https://wa.me/?text=${msg}`,
      "_blank",
    );
  };

  const openWaDialog = async () => {
    try {
      const r = await fetch("/api/message-templates");
      const d = await r.json();
      const list = (d.items || d.templates || []).filter((t) => t.active !== false);
      setWaTemplates(list);
      setWaTemplateId(list[0]?.id || "");
    } catch { setWaTemplates([]); }
    setWaOpen(true);
  };

  const sendBulkWhatsApp = () => {
    const chosen = waTemplates.find((t) => t.id === waTemplateId);
    const body = chosen?.body || messageTemplate;
    const guests = (selected?.guests || []).filter((g) => selectedGuestIds.includes(g.id));
    if (!guests.length) return;
    // Fix ON: render once (first guest context) and send the exact same text to everyone.
    // Fix OFF: personalize per guest.
    const fixedText = waFix
      ? renderTemplate(body, buildContext({ invitation: selected, guest: guests[0], origin: baseUrl }))
      : null;
    guests.forEach((g) => {
      const text = waFix ? fixedText : renderTemplate(body, buildContext({ invitation: selected, guest: g, origin: baseUrl }));
      const phone = String(g.phone || "").replace(/\D/g, "");
      window.open(phone ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    });
    toast.success(`Opened WhatsApp for ${guests.length} guest(s)`);
    setWaOpen(false);
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
      return toast.error(err.error || "Failed");
    }
    toast.success("Guest updated");
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
    if (!res.ok) return toast.error(data.error || "Could not read file");
    setImportData(data);
    setImportOpen(true);
  };

  if (invitations.length === 0)
    return (
      <div className="rounded-2xl bg-white border p-12 text-center">
        <p className="text-muted-foreground">
          Create an invitation first to manage guests.
        </p>
      </div>
    );

  return (
    <div className="space-y-4">
      {/* Header Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-white border p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <p className="text-sm font-semibold">Guest Management</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline-block">
              for
            </span>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="h-9 px-3 py-1 rounded-md border text-sm font-medium bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px]"
            >
              {invitations.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.brideName} & {i.groomName} ({i.guests.length} guests)
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
                {importing ? "Importing…" : "Import Excel"}
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
            Add Guest
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
              placeholder="Search guests…"
              className="pl-9"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-9 px-2 rounded-md border text-sm"
          >
            <option value="ALL">All Types</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="GROUP">Group</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 px-2 rounded-md border text-sm"
          >
            <option value="ALL">All Categories</option>
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
            <option value="ALL">All Sides</option>
            {sides.map((sd) => (
              <option key={sd.id} value={sd.id}>{sd.name}</option>
            ))}
          </select>
          <p className="text-sm text-muted-foreground ml-auto">
            {filtered.length} of {selected?.guests.length || 0}
          </p>
        </div>

        {/* BULK ACTION BAR */}
        {selectedGuestIds.length > 0 && (
          <div className="p-3 bg-primary/5 border-b flex items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <CheckSquare className="h-4 w-4" />
              {selectedGuestIds.length} Guests Selected
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-white"
                onClick={handleBulkDownloadQR}
              >
                <Download className="h-3.5 w-3.5 mr-2" /> Download QR (PDF)
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={openWaDialog}
                data-testid="bulk-whatsapp-btn"
              >
                <WhatsAppIcon className="h-3.5 w-3.5 mr-2" /> Send WhatsApp
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkDelete}
                disabled={isDeletingBulk}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />{" "}
                {isDeletingBulk ? "Deleting..." : "Delete Selected"}
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              onClick={() => setSelectedGuestIds([])}
            >
              Clear Selection
            </Button>
          </div>
        )}

        <Dialog open={waOpen} onOpenChange={setWaOpen}>
          <DialogContent data-testid="bulk-whatsapp-dialog">
            <DialogHeader>
              <DialogTitle>Send WhatsApp to {selectedGuestIds.length} guest(s)</DialogTitle>
              <DialogDescription>Choose a message template and how it should be personalized.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Template</Label>
                <select
                  value={waTemplateId}
                  onChange={(e) => setWaTemplateId(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border text-sm bg-white"
                  data-testid="wa-template-select"
                >
                  {waTemplates.length === 0 && <option value="">Default template</option>}
                  {waTemplates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={waFix} onChange={(e) => setWaFix(e.target.checked)} className="mt-1" data-testid="wa-fix-checkbox" />
                <span>
                  <span className="font-medium">Fix Message</span>
                  <span className="block text-xs text-muted-foreground">All selected guests get this exact message (no per-guest personalization).</span>
                </span>
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWaOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={sendBulkWhatsApp} data-testid="wa-send-confirm">Open WhatsApp</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Side</th>
                <th className="px-4 py-2 text-center">Share</th>
                <th className="px-4 py-2 text-right">Actions</th>
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
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${g.guestType === "GROUP" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                    >
                      {g.guestType}
                    </span>
                  </td>
                  <td className="px-4 py-3">{g.category || "—"}</td>
                  <td className="px-4 py-3">
                    {g.sideName || (g.guestSide ? SIDE_LABEL[g.guestSide] : "—")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyLink(g)}
                        title="Copy Link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyMessage(g)}
                        title="Copy Message"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => sendWhatsApp(g)}
                        title="Send WhatsApp"
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
                        <Button size="sm" variant="ghost" title="View QR">
                          <QrIcon className="h-4 w-4" />
                        </Button>
                      </a>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => remove(g.id)}
                        title="Delete"
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
                    No guests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* --- KONTROL PAGINATION DIPERBARUI SESUAI GAMBAR --- */}
        {filtered.length > 0 && (
          <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            {/* Bagian Kiri: Rows per page & Showing X to Y */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-foreground">Rows per page:</span>
                <select
                  value={itemsPerPage}
                  onChange={handleRowsPerPageChange}
                  className="h-8 px-2 rounded-md border bg-transparent text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <span className="text-border">|</span>
              <span>
                Showing{" "}
                <span className="font-semibold text-foreground">
                  {startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-foreground">
                  {Math.min(startIndex + itemsPerPage, filtered.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-foreground">
                  {filtered.length}
                </span>{" "}
                entries
              </span>
            </div>

            {/* Bagian Kanan: Previous [1] [2] Next */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-muted-foreground"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
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
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL ADD GUEST */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Guest</DialogTitle>
            <DialogDescription>
              Fill in the guest details to invite them.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={add} className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Name*</Label>
                <Input
                  placeholder="E.g. John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  placeholder="E.g. 0812..."
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Guest Type</Label>
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
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="GROUP">Group</option>
                </select>
              </div>
              <div>
                <Label>Quota</Label>
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
                <Label>Category</Label>
                <select
                  value={form.categoryId}
                  onChange={(e) =>
                    setForm({ ...form, categoryId: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-md border text-sm"
                >
                  <option value="">— None —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Guest Side</Label>
                <select
                  value={form.sideId}
                  onChange={(e) =>
                    setForm({ ...form, sideId: e.target.value })
                  }
                  className="w-full h-10 px-3 rounded-md border text-sm"
                  data-testid="add-guest-side"
                >
                  <option value="">— None —</option>
                  {sides.map((sd) => (
                    <option key={sd.id} value={sd.id}>{sd.name}</option>
                  ))}
                </select>
                {sides.length === 0 && <p className="text-[10px] text-muted-foreground mt-1">Add sides in the invitation editor → Guest Sides.</p>}
              </div>
            </div>
            <div>
              <Label>Gender</Label>
              <select
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="w-full h-10 px-3 rounded-md border text-sm"
              >
                <option value="">— None —</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-primary">
                Add Guest
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL EDIT GUEST */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Guest</DialogTitle>
            <DialogDescription>
              Update guest details. Token & QR remain the same.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={saveEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Name</Label>
                  <Input name="name" defaultValue={editing.name} required />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input name="phone" defaultValue={editing.phone || ""} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Guest Type</Label>
                  <select
                    name="guestType"
                    defaultValue={editing.guestType}
                    className="w-full h-10 px-3 rounded-md border text-sm"
                  >
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="GROUP">Group</option>
                  </select>
                </div>
                <div>
                  <Label>Quota</Label>
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
                  <Label>Category</Label>
                  <select
                    name="categoryId"
                    defaultValue={editing.categoryId || ""}
                    className="w-full h-10 px-3 rounded-md border text-sm"
                  >
                    <option value="">— None —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Guest Side</Label>
                  <select
                    name="sideId"
                    defaultValue={editing.sideId || ""}
                    className="w-full h-10 px-3 rounded-md border text-sm"
                    data-testid="edit-guest-side"
                  >
                    <option value="">— None —</option>
                    {sides.map((sd) => (
                      <option key={sd.id} value={sd.id}>{sd.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label>Gender</Label>
                <select
                  name="gender"
                  defaultValue={editing.gender || ""}
                  className="w-full h-10 px-3 rounded-md border text-sm"
                >
                  <option value="">— None —</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="rounded-md bg-muted/40 border p-2 text-xs text-muted-foreground">
                Invitation Token:{" "}
                <code className="font-mono">{editing.token}</code> (read-only)
              </div>
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary">
                  Save Changes
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
