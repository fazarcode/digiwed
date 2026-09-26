import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");

    if (!idsParam) {
      return NextResponse.json(
        { error: "No guest IDs provided" },
        { status: 400 },
      );
    }

    const guestIds = idsParam.split(",");

    const guests = await prisma.guest.findMany({
      where: {
        id: { in: guestIds },
      },
      include: {
        invitation: true,
      },
    });

    if (guests.length === 0) {
      return NextResponse.json({ error: "Guests not found" }, { status: 404 });
    }

    const firstInvitation = guests[0]?.invitation;
    const coupleTitle = firstInvitation
      ? `Wedding Guest QR Codes — ${firstInvitation.brideName} & ${firstInvitation.groomName}`
      : "Wedding Guest QR Codes";

    const doc = new PDFDocument({ size: "A4", margin: 20 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));

    const pdfBuffer = new Promise((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });

    const pageWidth = doc.page.width; // ~595.28 pt untuk A4
    const pageHeight = doc.page.height; // ~841.89 pt untuk A4
    const margin = 15; // Margin diperkecil sedikit agar muat 4 kolom dengan baik

    // --- UBAH MENJADI 4 KOLOM ---
    const cols = 4;
    const rows = 5; // Total 20 kartu per halaman (4 kolom x 5 baris)

    const printableWidth = pageWidth - margin * 2;
    const topOffset = 40;
    const printableHeight = pageHeight - margin - topOffset;

    const cellWidth = printableWidth / cols;
    const cellHeight = printableHeight / rows;

    // Ukuran QR disesuaikan untuk 4 kolom
    const qrSize = 85;

    for (let i = 0; i < guests.length; i++) {
      const guest = guests[i];
      const currentIndexInPage = i % (cols * rows);

      if (currentIndexInPage === 0) {
        if (i > 0) {
          doc.addPage();
        }

        // Header Judul Halaman
        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .fillColor("#1e293b")
          .text(coupleTitle, margin, 15, {
            width: printableWidth,
            align: "center",
          });

        doc.save();
        doc.restore();
      }

      const colIndex = currentIndexInPage % cols;
      const rowIndex = Math.floor(currentIndexInPage / cols);

      const xStart = margin + colIndex * cellWidth;
      const yStart = topOffset + rowIndex * cellHeight;

      // --- KOTAK GARIS PUTUS-PUTUS YANG LEBIH PAS & RAMPING ---
      // Dibuat pas mengikuti ukuran konten di dalam sel
      const cardWidth = cellWidth - 4;
      const cardHeight = cellHeight - 4;
      const cardX = xStart + 2;
      const cardY = yStart + 2;

      doc.save();
      doc.dash(2, { space: 2 });
      doc.strokeColor("#94a3b8");
      doc.lineWidth(0.6);
      doc.rect(cardX, cardY, cardWidth, cardHeight);
      doc.stroke();
      doc.restore();

      // --- GENERATE & GAMBAR QR CODE ---
      const qrImageBuffer = await QRCode.toBuffer(guest.token, {
        type: "png",
        width: 300,
        margin: 1,
      });

      const qrX = xStart + (cellWidth - qrSize) / 2;
      const qrY = yStart + 8; // Posisi atas disesuaikan

      doc.image(qrImageBuffer, qrX, qrY, { width: qrSize, height: qrSize });

      // --- TEKS NAMA, KATEGORI, & GENDER DI BAWAH QR ---
      const textY = qrY + qrSize + 4;

      // Nama Tamu
      doc
        .fontSize(8.5)
        .font("Helvetica-Bold")
        .fillColor("#0f172a")
        .text(guest.name, xStart + 4, textY, {
          width: cellWidth - 8,
          align: "center",
          lineBreak: true,
          height: 20,
        });

      // Kategori & Gender Tamu
      const categoryText = guest.categoryText || "General";
      const genderText = guest.gender ? `(${guest.gender})` : "";
      const subtitle = `${categoryText} ${genderText}`.trim();

      doc
        .fontSize(6.5)
        .font("Helvetica")
        .fillColor("#475569")
        .text(subtitle, xStart + 4, textY + 17, {
          width: cellWidth - 8,
          align: "center",
        });
    }

    doc.end();

    const buffer = await pdfBuffer;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="guests-qr-4cols.pdf"',
      },
    });
  } catch (error) {
    console.error("Error generating PDF Grid:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
