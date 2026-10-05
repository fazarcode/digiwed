import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// Edit / delete a single check-in (manual attendance correction) — Feature G1.
// Owner-scoped: the check-in must belong to an invitation owned by the current user.
async function ownedCheckIn(userId, id) {
  return prisma.checkIn.findFirst({
    where: { id, invitation: { userId } },
    include: { guest: { select: { id: true, quota: true, guestType: true } } },
  });
}

export async function PATCH(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const p = await params;
  const ci = await ownedCheckIn(s.user.id, p.id);
  if (!ci) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const data = {};
  if (body.count !== undefined) {
    const n = parseInt(body.count, 10);
    if (!Number.isFinite(n) || n < 1 || n > 50)
      return NextResponse.json(
        { error: "Jumlah hadir harus 1-50" },
        { status: 400 },
      );
    data.count = n;
  }
  if (body.operatorName !== undefined)
    data.operatorName = String(body.operatorName || "").slice(0, 120) || null;
  // BARU: nama meja
  if (body.tableName !== undefined)
    data.tableName =
      String(body.tableName || "")
        .trim()
        .slice(0, 120) || null;
  if (body.deviceId !== undefined) {
    if (body.deviceId) {
      const dev = await prisma.device.findFirst({
        where: { id: body.deviceId, userId: s.user.id },
        select: { id: true },
      });
      data.deviceId = dev ? dev.id : null;
    } else data.deviceId = null;
  }
  if (body.createdAt !== undefined) {
    const dt = new Date(body.createdAt);
    if (isNaN(dt))
      return NextResponse.json(
        { error: "Tanggal/waktu tidak valid" },
        { status: 400 },
      );
    data.createdAt = dt;
  }
  const updated = await prisma.checkIn.update({ where: { id: p.id }, data });
  return NextResponse.json({
    ok: true,
    checkIn: {
      id: updated.id,
      count: updated.count,
      operatorName: updated.operatorName,
      tableName: updated.tableName,
      createdAt: updated.createdAt,
    },
  });
}

export async function DELETE(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const p = await params;
  const ci = await ownedCheckIn(s.user.id, p.id);
  if (!ci) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.$transaction(async (tx) => {
    await tx.checkIn.delete({ where: { id: p.id } });
    // Recompute guest's checkedInCount / checkedInAt from remaining check-ins.
    const remaining = await tx.checkIn.findMany({
      where: { guestId: ci.guestId },
      orderBy: { createdAt: "asc" },
    });
    const total = remaining.reduce((sum, r) => sum + (r.count || 1), 0);
    await tx.guest.update({
      where: { id: ci.guestId },
      data: {
        checkedInCount: total,
        checkedInAt: remaining.length ? remaining[0].createdAt : null,
      },
    });
  });
  return NextResponse.json({ ok: true });
}
