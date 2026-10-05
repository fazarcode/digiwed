import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// Kategori hanya bisa diubah/dihapus oleh pemilik undangan.
async function ownedCategory(userId, invitationId, catId) {
  return prisma.guestCategory.findFirst({
    where: { id: catId, invitationId, invitation: { userId } },
    include: { _count: { select: { guests: true } } },
  });
}

// Urutan tidak diubah di sini, gunakan PUT pada /categories.
const patchSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  enabled: z.boolean().optional(),
});

export async function PATCH(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const p = await params;
  const cat = await ownedCategory(s.user.id, p.id, p.catId);
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  try {
    const item = await prisma.guestCategory.update({
      where: { id: p.catId },
      data: parsed.data,
    });
    return NextResponse.json({ item });
  } catch (e) {
    if (e.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "A category with this name already exists for this invitation.",
        },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE -> diblokir jika masih dipakai tamu (kecuali ?reassignTo=<catId|null> diberikan).
export async function DELETE(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const p = await params;
  const cat = await ownedCategory(s.user.id, p.id, p.catId);
  if (!cat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const reassignTo = new URL(request.url).searchParams.get("reassignTo");
  if (cat._count.guests > 0) {
    if (reassignTo === null) {
      return NextResponse.json(
        {
          error: "Category is in use",
          guestCount: cat._count.guests,
          needsReassign: true,
        },
        { status: 409 },
      );
    }
    // reassignTo === 'null' berarti lepas kategori; selain itu target harus dari undangan yang sama.
    let newCatId = null;
    if (reassignTo && reassignTo !== "null") {
      const target = await prisma.guestCategory.findFirst({
        where: { id: reassignTo, invitationId: p.id },
        select: { id: true },
      });
      if (!target)
        return NextResponse.json(
          { error: "Invalid reassignment target" },
          { status: 400 },
        );
      newCatId = target.id;
    }
    await prisma.guest.updateMany({
      where: { invitationId: p.id, categoryId: p.catId },
      data: { categoryId: newCatId },
    });
  }
  await prisma.guestCategory.delete({ where: { id: p.catId } });
  return NextResponse.json({ ok: true });
}
