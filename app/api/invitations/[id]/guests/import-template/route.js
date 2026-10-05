// app/api/invitations/[id]/guests/import-template/route.js
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const p = await params;

  // Pastikan undangan milik user, lalu ambil Guest Side & kategori miliknya untuk contoh/petunjuk.
  const inv = await prisma.invitation.findFirst({
    where: { id: p.id, userId: s.user.id },
    select: { id: true },
  });
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [sides, cats] = await Promise.all([
    prisma.guestSideOption.findMany({
      where: { invitationId: p.id, enabled: true },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
    prisma.guestCategory.findMany({
      where: {
        enabled: true,
        OR: [{ invitationId: null }, { invitationId: p.id }],
      },
      orderBy: [{ order: "asc" }, { name: "asc" }],
    }),
  ]);
  const sideNames = sides.map((x) => x.name);
  const catNames = cats.map((x) => x.name);

  // Contoh memakai nama sisi/kategori yang benar-benar ada; jika belum ada, pakai nama umum.
  const sideA = sideNames[0] || "Groom Side";
  const sideB = sideNames[1] || sideNames[0] || "Bride Side";
  const catA = catNames[0] || "Family";
  const catB = catNames[1] || catNames[0] || "Friend";

  // Header kolom sengaja tetap dalam bahasa Inggris agar terbaca oleh pemetaan otomatis di dialog impor.
  const headers = [
    "Name",
    "Phone",
    "GuestType",
    "GuestCount",
    "Gender",
    "GuestSide",
    "Category",
  ];
  const example = [
    ["John Doe", "+62 812-3456-7890", "INDIVIDUAL", 1, "MALE", sideA, catA],
    ["Jane Smith", "+62 812-1111-2222", "INDIVIDUAL", 1, "FEMALE", sideB, catB],
    ["Smith Family", "+62 812-3333-4444", "GROUP", 4, "OTHER", sideA, catA],
    ["Parents of Bride", "+62 812-5555-6666", "GROUP", 6, "OTHER", sideB, catA],
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...example]);
  ws["!cols"] = [
    { wch: 20 },
    { wch: 22 },
    { wch: 12 },
    { wch: 10 },
    { wch: 8 },
    { wch: 18 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Guests");

  // Sheet petunjuk dengan nilai yang diperbolehkan
  const notes = [
    ["Kolom", "Nilai yang Diperbolehkan"],
    ["GuestType", "INDIVIDUAL (perorangan), GROUP (kelompok/keluarga)"],
    ["Gender", "MALE (laki-laki), FEMALE (perempuan), OTHER (lainnya)"],
    [
      "GuestSide",
      "Teks bebas: nama Pihak Tamu (tidak peka huruf besar/kecil). Pihak yang sudah ada akan dicocokkan, sedangkan nama baru dibuat otomatis untuk undangan ini.",
    ],
    [
      "Category",
      "Nama kategori yang sudah ada (tidak peka huruf besar/kecil). Nama yang tidak dikenal disimpan sebagai teks bebas.",
    ],
    [
      "GuestCount",
      "Bilangan bulat positif. Untuk INDIVIDUAL, otomatis menjadi 1 saat check-in. Untuk GROUP, ini adalah jumlah orang yang diharapkan.",
    ],
    [],
    [
      "Pihak Tamu yang Ada",
      sideNames.length
        ? sideNames.join(", ")
        : "(belum ada - akan dibuat otomatis dari isi file)",
    ],
    [
      "Kategori yang Ada",
      catNames.length ? catNames.join(", ") : "(belum ada)",
    ],
  ];
  const nws = XLSX.utils.aoa_to_sheet(notes);
  nws["!cols"] = [{ wch: 22 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, nws, "Petunjuk");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="guest-import-template.xlsx"',
    },
  });
}
