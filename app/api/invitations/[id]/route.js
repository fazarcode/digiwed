import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { slugify } from "@/lib/slug";

async function ownerCheck(userId, invitationId) {
  return prisma.invitation.findFirst({ where: { id: invitationId, userId } });
}

export async function PATCH(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const p = await params;
  const inv = await ownerCheck(s.user.id, p.id);
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json();
  const allowed = [
    "brideName",
    "groomName",
    "brideParents",
    "groomParents",
    "groomFather",
    "groomMother",
    "brideFather",
    "brideMother",
    "bridePhoto",
    "groomPhoto",
    "quote",
    "loveStory",
    "events",
    "coverImage",
    "momentsTitle",
    "momentsMessage",
    "primaryColor",
    "secondaryColor",
    "backgroundColor",
    "fontFamily",
    "buttonStyle",
    "borderRadius",
    "animation",
    "status",
    "templateId",
    "rsvpMode",
    "selfieVerification",
    "customDomain",
    "subdomain",
    "packageId",
  ];
  const data = {};
  for (const k of allowed) if (body[k] !== undefined) data[k] = body[k];
  if (data.weddingDate) data.weddingDate = new Date(data.weddingDate);
  if (data.rsvpMode && !["QR_FIRST", "RSVP_FIRST"].includes(data.rsvpMode))
    delete data.rsvpMode;
  if (data.selfieVerification !== undefined)
    data.selfieVerification = !!data.selfieVerification;

  // Normalize domain fields
  if ("customDomain" in data) {
    const v = String(data.customDomain || "")
      .trim()
      .toLowerCase();
    data.customDomain = v
      ? v.replace(/^https?:\/\//, "").replace(/\/$/, "")
      : null;
  }
  if ("subdomain" in data) {
    const v = String(data.subdomain || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "");
    data.subdomain = v || null;
  }

  // Uniqueness pre-check (Prisma unique constraint will also catch)
  if (data.customDomain) {
    const dup = await prisma.invitation.findFirst({
      where: { customDomain: data.customDomain, NOT: { id: p.id } },
      select: { id: true },
    });
    if (dup)
      return NextResponse.json(
        { error: "That custom domain is already in use." },
        { status: 400 },
      );
  }
  if (data.subdomain) {
    const dup = await prisma.invitation.findFirst({
      where: { subdomain: data.subdomain, NOT: { id: p.id } },
      select: { id: true },
    });
    if (dup)
      return NextResponse.json(
        { error: "That subdomain is already in use." },
        { status: 400 },
      );
  }

  // Normalize packageId — allow explicit null to unset
  if ("packageId" in data) {
    data.packageId = data.packageId || null;
    if (data.packageId) {
      const exists = await prisma.package.findUnique({
        where: { id: data.packageId },
        select: { id: true, status: true },
      });
      if (!exists || !exists.status)
        return NextResponse.json(
          { error: "Selected package is not available." },
          { status: 400 },
        );
    }
  }

  // Feature D — editable slug (normalize + uniqueness; the invitation may keep its own slug).
  if (body.slug !== undefined) {
    const norm = slugify(body.slug || "");
    if (!norm)
      return NextResponse.json({ error: "Slug cannot be empty." }, { status: 400 });
    if (norm !== inv.slug) {
      const dup = await prisma.invitation.findFirst({
        where: { slug: norm, NOT: { id: p.id } },
        select: { id: true },
      });
      if (dup)
        return NextResponse.json(
          { error: "That URL slug is already taken." },
          { status: 400 },
        );
      data.slug = norm;
    }
  }

  try {
    const updated = await prisma.invitation.update({
      where: { id: p.id },
      data,
    });
    return NextResponse.json({
      invitation: {
        id: updated.id,
        status: updated.status,
        slug: updated.slug,
        customDomain: updated.customDomain,
        subdomain: updated.subdomain,
        packageId: updated.packageId,
      },
    });
  } catch (e) {
    if (e.code === "P2002")
      return NextResponse.json(
        { error: "That slug/domain/subdomain is already in use." },
        { status: 400 },
      );
    throw e;
  }
}

export async function DELETE(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const p = await params;
  const inv = await ownerCheck(s.user.id, p.id);
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.invitation.delete({ where: { id: p.id } });
  return NextResponse.json({ ok: true });
}

export async function GET(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const p = await params;
  const inv = await prisma.invitation.findFirst({
    where: { id: p.id, userId: s.user.id },
    include: {
      gallery: { orderBy: { order: "asc" } },
      videos: true,
      music: true,
      template: true,
    },
  });
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ invitation: inv });
}
