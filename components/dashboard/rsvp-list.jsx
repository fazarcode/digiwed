"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";

export default function RsvpList({
  rsvps,
  messages = [],
  stats,
  userInvitations,
  currentPage,
  totalPages,
  totalRsvpsCount,
  attendanceFilter,
  invitationFilter,
  searchQuery,
  skip,
  limit = 10,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Membaca limit langsung dari URL agar sinkron dengan dropdown
  const currentLimit = searchParams.get("limit") || limit || 10;

  // State untuk mengatasi hydration mismatch pada tanggal
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // State lokal khusus untuk input teks search
  const [searchTerm, setSearchTerm] = useState(searchQuery || "");

  // Phase 2 — messages/wishes (independent from RSVP). Delete via /api/messages/[id].
  const [msgs, setMsgs] = useState(messages || []);
  useEffect(() => {
    setMsgs(messages || []);
  }, [messages]);

  // Total pesan yang masuk (ikut berkurang saat ada pesan dihapus)
  const totalMessages = msgs.length;
  const messageOnlyCount = msgs.filter((m) => m.isMessageOnly).length;
  const withRsvpCount = totalMessages - messageOnlyCount;

  const deleteMessage = async (id) => {
    if (
      !confirm("Hapus pesan ini? Tamu dan RSVP-nya TIDAK akan ikut terhapus.")
    )
      return;
    const res = await fetch(`/api/messages/${id}`, { method: "DELETE" });
    if (!res.ok) return;
    setMsgs((l) => l.filter((m) => m.id !== id));
    router.refresh();
  };

  // ==========================================
  // FUNGSI EXPORT EXCEL
  // ==========================================
  const handleExportToExcel = () => {
    if (!rsvps || rsvps.length === 0) {
      alert("Tidak ada data RSVP untuk diekspor!");
      return;
    }

    const excelData = rsvps.map((r, index) => ({
      "No.": skip + index + 1,
      "Nama Tamu": r.name || "-",
      "Undangan (Mempelai)": `${r.invitation?.brideName || ""} & ${
        r.invitation?.groomName || ""
      }`,
      "Status Kehadiran":
        r.attendance === "ATTENDING"
          ? "Hadir (Attending)"
          : r.attendance === "NOT_ATTENDING"
            ? "Tidak Hadir (Not Attending)"
            : "Ragu-ragu (Maybe)",
      "Tipe RSVP": r.rsvpType === "GROUP" ? "Grup" : "Individu",
      "Jumlah Tamu (Orang)":
        r.rsvpType === "GROUP" ? Number(r.guestCount || 1) : 1,
      "Pesan / Ucapan": r.message || "-",
      "Tanggal RSVP": new Date(r.createdAt).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      "Waktu RSVP": new Date(r.createdAt).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));

    const totalGuestsInSheet = rsvps.reduce((acc, r) => {
      return acc + (r.rsvpType === "GROUP" ? Number(r.guestCount || 1) : 1);
    }, 0);

    // Baris ringkasan: label di kolom "Nama Tamu", nilai di "Undangan (Mempelai)", satuan di "Status Kehadiran".
    const summaryRow = (label, value, unit) => ({
      "No.": "",
      "Nama Tamu": label,
      "Undangan (Mempelai)": value,
      "Status Kehadiran": unit,
      "Tipe RSVP": "",
      "Jumlah Tamu (Orang)": "",
      "Pesan / Ucapan": "",
      "Tanggal RSVP": "",
      "Waktu RSVP": "",
    });

    excelData.push({});
    excelData.push({});
    excelData.push(summaryRow("RINGKASAN STATISTIK", "", ""));
    excelData.push(
      summaryRow("- Total Tamu (Tabel Ini)", totalGuestsInSheet, "Orang"),
    );
    excelData.push(
      summaryRow(
        "- Total Perkiraan Tamu (Keseluruhan)",
        stats.totalGuests,
        "Orang",
      ),
    );
    excelData.push(
      summaryRow("- Total Seluruh RSVP Masuk", stats.total, "Respon"),
    );
    excelData.push(
      summaryRow("- Hadir (Attending)", stats.attending, "Respon"),
    );
    excelData.push(
      summaryRow("- Tidak Hadir (Not Attending)", stats.notAttending, "Respon"),
    );
    excelData.push(summaryRow("- Ragu-ragu (Maybe)", stats.maybe, "Respon"));
    excelData.push(
      summaryRow("- Total Pesan & Ucapan Masuk", totalMessages, "Pesan"),
    );

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    worksheet["!cols"] = [
      { wch: 5 },
      { wch: 35 },
      { wch: 30 },
      { wch: 22 },
      { wch: 12 },
      { wch: 22 },
      { wch: 45 },
      { wch: 18 },
      { wch: 12 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Daftar & Ringkasan RSVP",
    );

    const dateStr = new Date().toISOString().split("T")[0];
    const fileName = `Laporan_RSVP_${dateStr}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Helper Pagination
  const getPaginationUrl = (page) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page);
    return `${pathname}?${params.toString()}`;
  };

  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      let start = Math.max(1, currentPage - 1);
      let end = Math.min(totalPages, currentPage + 1);

      if (currentPage <= 2) {
        end = 4;
      } else if (currentPage >= totalPages - 1) {
        start = totalPages - 3;
      }

      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }
    }
    return pageNumbers;
  };

  const handleFilterChange = (key, value) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "ALL" || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Debounce Search
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentSearchParam = searchParams.get("search") || "";

      if (searchTerm !== currentSearchParam) {
        const params = new URLSearchParams(searchParams.toString());
        if (searchTerm) {
          params.set("search", searchTerm);
        } else {
          params.delete("search");
        }
        params.set("page", "1");
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, pathname, router, searchParams]);

  return (
    <div className="space-y-6">
      {/* Header & Tombol Export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-foreground">
            RSVP
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Semua RSVP dari seluruh undangan Anda
          </p>
        </div>

        <button
          onClick={handleExportToExcel}
          disabled={!rsvps || rsvps.length === 0}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 font-medium text-sm transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Ekspor ke Excel ({rsvps?.length || 0})
        </button>
      </div>

      {/* Statistik Dashboard (5 Card) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          {
            label: "Total",
            value: stats.total,
            color: "from-primary/10 border-primary/20",
          },
          {
            label: "Hadir",
            value: stats.attending,
            color: "from-emerald-500/10 border-emerald-500/20",
          },
          {
            label: "Tidak Hadir",
            value: stats.notAttending,
            color: "from-rose-500/10 border-rose-500/20",
          },
          {
            label: "Ragu-ragu",
            value: stats.maybe,
            color: "from-amber-500/10 border-amber-500/20",
          },
          {
            label: "Total Pesan",
            value: totalMessages,
            color: "from-violet-500/10 border-violet-500/20",
            testId: "stat-total-messages",
          },
        ].map((s) => (
          <div
            key={s.label}
            data-testid={s.testId}
            className={`rounded-2xl bg-gradient-to-br ${s.color} to-background border p-5 shadow-sm`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {s.label}
            </p>
            <p className="font-serif text-3xl font-bold mt-1 text-foreground">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Form Filter & Search */}
      <div className="rounded-2xl bg-card border shadow-sm p-4 flex flex-col md:flex-row flex-wrap gap-4 items-end">
        {/* Kolom Pencarian dengan Icon */}
        <div className="flex flex-col gap-1.5 w-full md:flex-1 md:min-w-[220px]">
          <label
            htmlFor="search"
            className="text-xs font-medium text-muted-foreground"
          >
            Cari Nama Tamu
          </label>
          <div className="relative">
            <svg
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              id="search"
              placeholder="Ketik nama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 pl-9 pr-3 w-full rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Dropdown Invitation */}
        <div className="flex flex-col gap-1.5 w-full md:w-64">
          <label
            htmlFor="invitationId"
            className="text-xs font-medium text-muted-foreground"
          >
            Filter Undangan
          </label>
          <select
            id="invitationId"
            value={invitationFilter}
            onChange={(e) => handleFilterChange("invitationId", e.target.value)}
            className="h-10 px-3 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
          >
            <option value="ALL">Semua Undangan</option>
            {userInvitations.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.brideName} & {inv.groomName}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown Attendance */}
        <div className="flex flex-col gap-1.5 w-full md:w-48">
          <label
            htmlFor="attendance"
            className="text-xs font-medium text-muted-foreground"
          >
            Filter Kehadiran
          </label>
          <select
            id="attendance"
            value={attendanceFilter}
            onChange={(e) => handleFilterChange("attendance", e.target.value)}
            className="h-10 px-3 rounded-xl border border-input text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="ATTENDING">Hadir</option>
            <option value="MAYBE">Ragu-ragu</option>
            <option value="NOT_ATTENDING">Tidak Hadir</option>
          </select>
        </div>
      </div>

      {/* Tabel Data & Pagination Card */}
      <div className="rounded-2xl bg-card border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground border-b">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Tamu</th>
                <th className="px-5 py-3.5 font-semibold">Undangan</th>
                <th className="px-5 py-3.5 font-semibold">Kehadiran</th>
                <th className="px-5 py-3.5 font-semibold">Tipe</th>
                <th className="px-5 py-3.5 font-semibold">Pesan</th>
                <th className="px-5 py-3.5 font-semibold">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rsvps.map((r) => (
                <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4 font-medium text-foreground">
                    {r.name}
                  </td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">
                    {r.invitation.brideName} & {r.invitation.groomName}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                        r.attendance === "ATTENDING"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                          : r.attendance === "NOT_ATTENDING"
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          r.attendance === "ATTENDING"
                            ? "bg-emerald-500"
                            : r.attendance === "NOT_ATTENDING"
                              ? "bg-rose-500"
                              : "bg-amber-500"
                        }`}
                      />
                      {r.attendance === "ATTENDING"
                        ? "Hadir"
                        : r.attendance === "NOT_ATTENDING"
                          ? "Tidak Hadir"
                          : "Ragu-ragu"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs">
                    {r.rsvpType === "GROUP"
                      ? `Grup (${r.guestCount} tamu)`
                      : "Individu"}
                  </td>
                  <td className="px-5 py-4 text-xs italic max-w-xs truncate text-muted-foreground">
                    {r.message || "—"}
                  </td>
                  <td className="px-5 py-4 text-xs text-muted-foreground">
                    {isMounted
                      ? new Date(r.createdAt).toLocaleString("id-ID")
                      : new Date(r.createdAt).toISOString()}
                  </td>
                </tr>
              ))}
              {rsvps.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-16 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg
                        className="w-8 h-8 opacity-40"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                        />
                      </svg>
                      <p className="text-sm">
                        {searchQuery
                          ? `Tidak ada RSVP yang cocok dengan "${searchQuery}"`
                          : "Tidak ada RSVP yang sesuai dengan filter Anda."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* FOOTER: PAGINATION & BARIS PER HALAMAN */}
        {totalRsvpsCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t bg-muted/20">
            {/* SISI KIRI: Dropdown baris per halaman & teks penghitung */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <label htmlFor="limit" className="font-medium text-foreground">
                  Baris per halaman:
                </label>
                <select
                  id="limit"
                  value={currentLimit}
                  onChange={(e) => handleFilterChange("limit", e.target.value)}
                  className="h-8 px-2 py-1 rounded-lg border border-input text-xs bg-background font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer text-foreground"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>

              <span className="hidden sm:inline-block w-px h-4 bg-border" />

              <p>
                Menampilkan{" "}
                <span className="font-semibold text-foreground">
                  {skip + 1}
                </span>{" "}
                sampai{" "}
                <span className="font-semibold text-foreground">
                  {Math.min(skip + Number(currentLimit), totalRsvpsCount)}
                </span>{" "}
                dari{" "}
                <span className="font-semibold text-foreground">
                  {totalRsvpsCount}
                </span>{" "}
                data
              </p>
            </div>

            {/* SISI KANAN: Navigasi Tombol Halaman */}
            <div className="flex items-center gap-1.5">
              {/* Tombol Sebelumnya */}
              {currentPage > 1 ? (
                <Link
                  href={getPaginationUrl(currentPage - 1)}
                  className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium border rounded-lg bg-background hover:bg-muted transition-colors"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  ></svg>
                  Sebelumnya
                </Link>
              ) : (
                <span className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium border rounded-lg opacity-40 cursor-not-allowed bg-muted/40">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  ></svg>
                  Sebelumnya
                </span>
              )}

              {/* Nomor Halaman */}
              <div className="hidden sm:flex items-center gap-1">
                {getPageNumbers().map((page) => {
                  const isCurrent = page === currentPage;
                  return (
                    <Link
                      key={page}
                      href={getPaginationUrl(page)}
                      className={`inline-flex items-center justify-center w-8 h-8 text-xs font-medium rounded-lg border transition-all ${
                        isCurrent
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background hover:bg-muted border-input"
                      }`}
                    >
                      {page}
                    </Link>
                  );
                })}
              </div>

              {/* Tombol Berikutnya */}
              {currentPage < totalPages ? (
                <Link
                  href={getPaginationUrl(currentPage + 1)}
                  className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium border rounded-lg bg-background hover:bg-muted transition-colors"
                >
                  Berikutnya
                  <svg
                    className="w-4 h-4 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  ></svg>
                </Link>
              ) : (
                <span className="inline-flex items-center justify-center h-8 px-3 text-xs font-medium border rounded-lg opacity-40 cursor-not-allowed bg-muted/40">
                  Berikutnya
                  <svg
                    className="w-4 h-4 ml-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  ></svg>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Phase 2 — Pesan & Ucapan */}
      <div
        className="rounded-2xl bg-card border shadow-sm overflow-hidden"
        data-testid="messages-section"
      >
        <div className="px-5 py-4 border-b bg-muted/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="font-serif text-xl font-bold text-foreground">
              Pesan &amp; Ucapan
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pesan dari tamu (dengan atau tanpa RSVP). Menghapus pesan tidak
              akan menghapus tamu maupun RSVP-nya.
            </p>
          </div>
          <div
            className="text-xs text-muted-foreground sm:text-right"
            data-testid="messages-total"
          >
            <p>
              Total:{" "}
              <span className="font-semibold text-foreground">
                {totalMessages}
              </span>{" "}
              pesan
            </p>
            <p>
              {withRsvpCount} dengan RSVP · {messageOnlyCount} hanya pesan
            </p>
          </div>
        </div>
        <div className="divide-y divide-border/60">
          {msgs.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              Belum ada pesan.
            </p>
          ) : (
            msgs.map((m) => (
              <div
                key={m.id}
                className="flex items-start justify-between gap-4 px-5 py-4"
                data-testid={`message-row-${m.id}`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">
                      {m.name}
                    </span>
                    {m.isMessageOnly ? (
                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/50">
                        Hanya pesan
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Dengan RSVP
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      · {m.invitation?.brideName} &amp;{" "}
                      {m.invitation?.groomName}
                    </span>
                  </div>
                  <p className="text-sm italic text-muted-foreground mt-1 break-words">
                    &ldquo;{m.message}&rdquo;
                  </p>
                </div>
                <button
                  onClick={() => deleteMessage(m.id)}
                  className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border text-rose-600 border-rose-200 hover:bg-rose-50 transition-colors"
                  data-testid={`message-delete-${m.id}`}
                >
                  Hapus
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
