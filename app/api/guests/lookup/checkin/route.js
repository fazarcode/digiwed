import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { publish } from "@/lib/broadcast";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

const STORAGE_ROOT =
  process.env.STORAGE_ROOT || "/app/digital-invitation-platform/storage";

// Helper untuk validasi kuota ketat (STRICT)
async function checkQuota(
  prisma,
  { guest, invitation, newCount, excludeCheckInId },
) {
  if (invitation.quotaMode !== "STRICT") return null;
  const agg = await prisma.checkIn.aggregate({
    _sum: { count: true },
    where: {
      guestId: guest.id,
      ...(excludeCheckInId ? { id: { not: excludeCheckInId } } : {}),
    },
  });
  const used = agg._sum.count || 0;
  const remaining = guest.quota - used;
  if (remaining <= 0)
    return `Kuota ${guest.name} sudah penuh (${used}/${guest.quota})`;
  if (newCount > remaining) return `Melebihi kuota. Sisa kuota: ${remaining}`;
  return null;
}

export async function GET(request) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let token = new URL(request.url).searchParams.get("token");
  if (!token)
    return NextResponse.json({ error: "Token wajib diisi" }, { status: 400 });

  // Robust extraction: if token is actually a URL, extract ?guest=<token> from it
  token = String(token).trim();
  const m = token.match(/[?&]guest=([\w-]+)/);
  if (m) token = m[1];

  const guest = await prisma.guest.findFirst({
    where: { token, invitation: { userId: s.user.id } },
    include: {
      invitation: {
        select: {
          id: true,
          brideName: true,
          groomName: true,
          slug: true,
          selfieVerification: true,
          tvEnabled: true,
          quotaMode: true, // <--- Diperlukan untuk mendeteksi mode kuota di frontend
        },
      },
      category: { select: { name: true, priority: true } },
      _count: { select: { checkIns: true } },
    },
  });
  if (!guest)
    return NextResponse.json(
      { error: "Tamu tidak ditemukan", tokenTried: token },
      { status: 404 },
    );
  return NextResponse.json({
    guest: {
      id: guest.id,
      name: guest.name,
      phone: guest.phone,
      guestType: guest.guestType,
      gender: guest.gender,
      guestSide: guest.guestSide,
      quota: guest.quota,
      category: guest.category?.name || null,
      token: guest.token,
      checkedInAt: guest.checkedInAt,
      checkedInCount: guest.checkedInCount,
      checkInCount: guest._count.checkIns,
      invitation: guest.invitation,
    },
  });
}

export async function POST(request) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  let {
    token,
    deviceId,
    operatorName,
    tableName,
    count = 1,
    selfieDataUrl,
  } = body;
  if (!token)
    return NextResponse.json({ error: "Token wajib diisi" }, { status: 400 });

  // Robust extraction (same as GET)
  token = String(token).trim();
  const m = token.match(/[?&]guest=([\w-]+)/);
  if (m) token = m[1];

  // Rapikan nama meja
  const cleanTable = tableName
    ? String(tableName).trim().slice(0, 120) || null
    : null;

  const guest = await prisma.guest.findFirst({
    where: { token, invitation: { userId: s.user.id } },
    include: {
      invitation: {
        select: {
          id: true,
          selfieVerification: true,
          tvEnabled: true,
          brideName: true,
          groomName: true,
          quotaMode: true, // <--- Diperlukan untuk validasi checkQuota di backend
        },
      },
      category: { select: { id: true, name: true, priority: true } },
    },
  });
  if (!guest)
    return NextResponse.json(
      { error: "Tamu tidak ditemukan" },
      { status: 404 },
    );

  if (guest.guestType === "INDIVIDUAL" && guest.checkedInAt) {
    return NextResponse.json(
      { error: "Tamu ini sudah check-in.", guest, alreadyCheckedIn: true },
      { status: 400 },
    );
  }

  const requested = Math.max(1, parseInt(count, 10) || 1);
  const strict = guest.invitation.quotaMode === "STRICT";

  // Validasi Kuota jika Mode STRICT aktif
  const quotaErr = await checkQuota(prisma, {
    guest,
    invitation: guest.invitation,
    newCount: requested,
  });
  if (quotaErr) {
    return NextResponse.json({ error: quotaErr, guest }, { status: 409 });
  }

  // Attendee count validation: bounded by quota if strict, or max 50 if flexible
  const incCount = Math.min(
    requested,
    strict ? guest.quota - (guest.checkedInCount || 0) : 50,
  );

  let savedSelfieUrl = null;
  if (guest.invitation.selfieVerification) {
    if (!selfieDataUrl)
      return NextResponse.json(
        { error: "Selfie wajib untuk check-in" },
        { status: 400 },
      );
    const matchSelfie = String(selfieDataUrl).match(
      /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/,
    );
    if (matchSelfie) {
      const ext = matchSelfie[2] === "jpg" ? "jpg" : matchSelfie[2];
      const buf = Buffer.from(matchSelfie[3], "base64");
      const relDir = `uploads/${s.user.id}/selfies`;
      const absDir = path.join(STORAGE_ROOT, relDir);
      fs.mkdirSync(absDir, { recursive: true });
      const filename = `${Date.now()}-${nanoid(6)}.${ext}`;
      fs.writeFileSync(path.join(absDir, filename), buf);
      savedSelfieUrl = `/storage-file/${relDir}/${filename}`;
    }
  }

  let validDeviceId = null;
  let deviceName = null;
  if (deviceId) {
    const dev = await prisma.device.findFirst({
      where: { id: deviceId, userId: s.user.id, active: true },
    });
    if (dev) {
      validDeviceId = dev.id;
      deviceName = dev.name;
    }
  }

  const { updatedGuest, checkInId } = await prisma.$transaction(async (tx) => {
    const ci = await tx.checkIn.create({
      data: {
        invitationId: guest.invitation.id,
        guestId: guest.id,
        deviceId: validDeviceId,
        operatorName: operatorName || null,
        tableName: cleanTable,
        selfieUrl: savedSelfieUrl,
        count: incCount,
      },
    });
    const g = await tx.guest.update({
      where: { id: guest.id },
      data: {
        checkedInAt: guest.checkedInAt || new Date(),
        checkedInCount: { increment: incCount },
      },
    });
    return { updatedGuest: g, checkInId: ci.id };
  });

  // Broadcast to TV screens — include priority for queue ordering
  const priority = guest.priorityOverride ?? guest.category?.priority ?? 100;
  if (guest.invitation.tvEnabled) {
    publish(guest.invitation.id, "checkin", {
      checkInId,
      guestId: guest.id,
      guestName: guest.name,
      guestType: guest.guestType,
      category: guest.category?.name || null,
      count: incCount,
      priority,
      brideName: guest.invitation.brideName,
      groomName: guest.invitation.groomName,
      deviceName,
      operatorName: operatorName || null,
      tableName: cleanTable,
      selfieUrl: savedSelfieUrl || null,
      at: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    ok: true,
    checkInId,
    guest: {
      ...guest,
      checkedInAt: updatedGuest.checkedInAt,
      checkedInCount: updatedGuest.checkedInCount,
    },
    count: incCount,
    tableName: cleanTable,
  });
}
