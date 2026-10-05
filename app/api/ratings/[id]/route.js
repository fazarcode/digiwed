import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// User hanya boleh mengubah bintang & teks. name/active/order tidak bisa diubah user.
const schema = z.object({
  text: z.string().trim().min(1).max(500),
  rating: z.coerce.number().int().min(1).max(5),
});

async function ownRating(userId, id) {
  return prisma.testimonial.findFirst({
    where: { id, userId },
    select: { id: true },
  });
}

export async function PATCH(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const p = await params;
  if (!(await ownRating(s.user.id, p.id)))
    return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Rating dan testimoni wajib diisi" },
      { status: 400 },
    );

  const item = await prisma.testimonial.update({
    where: { id: p.id },
    data: { text: parsed.data.text, rating: parsed.data.rating },
  });
  return NextResponse.json({ item });
}

// DELETE dihapus untuk user agar rating tidak bisa dibuat ulang berkali-kali.
// Admin tetap bisa menghapus lewat endpoint admin (/api/admin/testimonials/[id]).
