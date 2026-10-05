import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

async function ownerCheck(userId, invitationId) {
  return prisma.invitation.findFirst({
    where: { id: invitationId, userId },
    select: { id: true },
  });
}

const schema = z.object({
  name: z.string().min(1).max(80),
  enabled: z.boolean().optional(),
});

const reorderSchema = z.object({
  ids: z.array(z.string()).min(1),
});

// GET -> kategori milik undangan ini saja, urut sesuai antrian sapa TV.
export async function GET(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const p = await params;
  if (!(await ownerCheck(s.user.id, p.id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const items = await prisma.guestCategory.findMany({
    where: { invitationId: p.id },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { guests: true } } },
  });
  return NextResponse.json({
    items: items.map((c) => ({
      id: c.id,
      name: c.name,
      order: c.order,
      enabled: c.enabled,
      guestCount: c._count.guests,
    })),
  });
}

// POST -> buat kategori baru, otomatis masuk di urutan paling bawah.
export async function POST(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const p = await params;
  if (!(await ownerCheck(s.user.id, p.id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  try {
    const max = await prisma.guestCategory.aggregate({
      where: { invitationId: p.id },
      _max: { order: true },
    });
    const next = (max._max.order || 0) + 1;
    const item = await prisma.guestCategory.create({
      data: {
        invitationId: p.id,
        name: parsed.data.name,
        order: next,
        priority: next,
        enabled: parsed.data.enabled ?? true,
      },
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

// PUT -> simpan urutan baru: { ids: [id1, id2, ...] } dari atas ke bawah.
export async function PUT(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const p = await params;
  if (!(await ownerCheck(s.user.id, p.id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const parsed = reorderSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const { ids } = parsed.data;
  const existing = await prisma.guestCategory.findMany({
    where: { invitationId: p.id },
    select: { id: true },
  });
  const valid = new Set(existing.map((c) => c.id));
  if (
    new Set(ids).size !== ids.length ||
    ids.length !== valid.size ||
    !ids.every((id) => valid.has(id))
  ) {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }

  await prisma.$transaction(
    ids.map((id, i) =>
      prisma.guestCategory.update({
        where: { id },
        data: { order: i + 1, priority: i + 1 },
      }),
    ),
  );
  return NextResponse.json({ ok: true });
}
