// app/api/invitations/[id]/guests/import-confirm/route.js
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { makeGuestToken } from "@/lib/slug";
import { coupleInitials, formatTrackingCode } from "@/lib/guest-codes";

function slugifyName(str) {
  return (
    String(str || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "guest"
  );
}

async function guard(id, userId) {
  return prisma.invitation.findFirst({
    where: { id, userId },
    select: { id: true },
  });
}

const GUEST_TYPES = ["INDIVIDUAL", "GROUP"];
const GENDERS = ["MALE", "FEMALE", "OTHER"];
function normStr(v) {
  return v == null ? null : String(v).trim() || null;
}
function normEnum(v, allowed) {
  const x = normStr(v);
  if (!x) return null;
  const u = x.toUpperCase();
  return allowed.includes(u) ? u : null;
}

// Feature I — CONFIRM import. Receives already-parsed + mapped rows (JSON) selected by the user
// and inserts them in CHUNKS. Body: { rows: [{name, phone, guestType, gender, sideName, categoryName}], defaultCategoryId }
// Side: `sideName` is resolved to a GuestSideOption (per invitation). Missing sides are created automatically.
export async function POST(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const p = await params;
  if (!(await guard(p.id, s.user.id)))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length)
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  if (rows.length > 5000)
    return NextResponse.json(
      { error: "Too many rows (max 5000)" },
      { status: 400 },
    );

  // Categories available to this invitation (global + own) for name matching.
  const cats = await prisma.guestCategory.findMany({
    where: { OR: [{ invitationId: null }, { invitationId: p.id }] },
  });
  const catByName = new Map(cats.map((c) => [c.name.toLowerCase(), c]));
  const defaultCategoryId =
    body.defaultCategoryId && cats.find((c) => c.id === body.defaultCategoryId)
      ? body.defaultCategoryId
      : null;

  // Guest Sides (GuestSideOption) owned by this invitation, matched by name (case-insensitive).
  const sideRows = await prisma.guestSideOption.findMany({
    where: { invitationId: p.id },
  });
  const sideByName = new Map(
    sideRows.map((sd) => [sd.name.toLowerCase(), sd.id]),
  );
  let sideOrder = sideRows.reduce((m, sd) => Math.max(m, sd.order || 0), 0);
  const resolveSideId = async (raw) => {
    const name = normStr(raw);
    if (!name) return null;
    const key = name.toLowerCase();
    if (sideByName.has(key)) return sideByName.get(key);
    try {
      sideOrder += 10;
      const created = await prisma.guestSideOption.create({
        data: { invitationId: p.id, name, order: sideOrder },
      });
      sideByName.set(key, created.id);
      return created.id;
    } catch {
      // Unique (invitationId, name) race → fetch the existing one.
      const found = await prisma.guestSideOption.findFirst({
        where: { invitationId: p.id, name },
      });
      if (found) {
        sideByName.set(key, found.id);
        return found.id;
      }
      return null;
    }
  };

  // Duplicate detection: existing names for this invitation (case-insensitive).
  const existing = await prisma.guest.findMany({
    where: { invitationId: p.id },
    select: { name: true, trackingCode: true, nameSlug: true },
  });
  const existingNames = new Set(existing.map((g) => g.name.toLowerCase()));

  // Phase 2 — seed tracking-code sequence + used slugs so imported rows get unique codes.
  const invMeta = await prisma.invitation.findUnique({
    where: { id: p.id },
    select: { brideName: true, groomName: true },
  });
  const initials = coupleInitials(invMeta?.brideName, invMeta?.groomName);
  let seq = 0;
  const usedSlugs = new Set();
  for (const g of existing) {
    if (g.trackingCode) {
      const m = g.trackingCode.match(/-(\d+)$/);
      if (m) seq = Math.max(seq, parseInt(m[1], 10));
    }
    if (g.nameSlug) usedSlugs.add(g.nameSlug);
  }
  const nextSlug = (nm) => {
    const base = slugifyName(nm);
    let c = base,
      i = 1;
    while (usedSlugs.has(c)) {
      i += 1;
      c = `${base}-${i}`;
    }
    usedSlugs.add(c);
    return c;
  };

  let imported = 0,
    skipped = 0,
    failed = 0;
  const errors = [];
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    for (const [j, row] of chunk.entries()) {
      const idx = i + j + 1;
      const name = normStr(row.name);
      if (!name) {
        failed++;
        errors.push({ row: idx, error: "Missing name" });
        continue;
      }
      if (existingNames.has(name.toLowerCase())) {
        skipped++;
        continue;
      }
      const catName = normStr(row.categoryName);
      let categoryId = defaultCategoryId,
        categoryText = null;
      if (catName) {
        const c = catByName.get(catName.toLowerCase());
        if (c) categoryId = c.id;
        else categoryText = catName;
      }
      try {
        const sideId = await resolveSideId(row.sideName ?? row.guestSide);
        seq += 1;
        await prisma.guest.create({
          data: {
            invitationId: p.id,
            name,
            phone: normStr(row.phone),
            guestType: normEnum(row.guestType, GUEST_TYPES) || "INDIVIDUAL",
            gender: normEnum(row.gender, GENDERS),
            sideId,
            categoryId,
            categoryText,
            token: makeGuestToken(),
            trackingCode: formatTrackingCode(initials, seq),
            nameSlug: nextSlug(name),
            checkedInCount: 0,
          },
        });
        existingNames.add(name.toLowerCase());
        imported++;
      } catch (e) {
        failed++;
        errors.push({ row: idx, error: e.message });
      }
    }
  }
  return NextResponse.json({
    imported,
    skipped,
    failed,
    errors: errors.slice(0, 50),
  });
}
