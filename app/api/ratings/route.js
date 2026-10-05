import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// Rating milik user: maksimal SATU per user. Nama diambil dari undangan (server-side).
const schema = z.object({
  text: z.string().trim().min(1).max(500),
  rating: z.coerce.number().int().min(1).max(5),
});

export async function GET() {
  const s = await auth();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await prisma.testimonial.findMany({
    where: { userId: s.user.id },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ items });
}

export async function POST(request) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Rating dan testimoni wajib diisi" },
      { status: 400 },
    );

  const existing = await prisma.testimonial.findFirst({
    where: { userId: s.user.id },
    select: { id: true },
  });
  if (existing)
    return NextResponse.json(
      { error: "Anda sudah memberi rating" },
      { status: 409 },
    );

  const inv = await prisma.invitation.findFirst({
    where: { userId: s.user.id },
    orderBy: { updatedAt: "desc" },
    select: { brideName: true, groomName: true },
  });
  if (!inv)
    return NextResponse.json(
      { error: "Buat undangan terlebih dahulu" },
      { status: 400 },
    );

  const item = await prisma.testimonial.create({
    data: {
      userId: s.user.id,
      name: `${inv.brideName || "Mempelai Wanita"} & ${inv.groomName || "Mempelai Pria"}`,
      text: parsed.data.text,
      rating: parsed.data.rating,
      order: 0,
      active: false, // menunggu persetujuan admin; ubah ke true bila ingin langsung tayang
    },
  });
  return NextResponse.json({ item });
}
