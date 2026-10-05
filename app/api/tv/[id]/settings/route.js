import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request, { params }) {
  const p = await params;

  // Public endpoint (TV page loads it)
  // Hanya mengembalikan setting yang diperlukan TV
  const inv = await prisma.invitation.findUnique({
    where: { id: p.id },
    select: {
      id: true,
      brideName: true,
      groomName: true,

      tvEnabled: true,
      tvBackground: true,
      tvCouplePhoto: true,
      tvLogo: true,
      tvDuration: true,
      tvSoundEnabled: true,
      tvAnimationEnabled: true,
      tvFontSize: true,
      tvFullscreen: true,

      // TAMBAHKAN INI
      tvCategoryColors: true,
    },
  });

  if (!inv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    settings: inv,
  });
}

export async function PATCH(request, { params }) {
  const s = await auth();

  if (!s) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const p = await params;

  const inv = await prisma.invitation.findFirst({
    where: {
      id: p.id,
      userId: s.user.id,
    },
  });

  if (!inv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();

  const data = {};

  const fields = [
    "tvEnabled",
    "tvBackground",
    "tvCouplePhoto",
    "tvLogo",
    "tvDuration",
    "tvSoundEnabled",
    "tvAnimationEnabled",
    "tvFontSize",
    "tvFullscreen",

    // TAMBAHKAN INI
    "tvCategoryColors",
  ];

  for (const f of fields) {
    if (body[f] !== undefined) {
      data[f] = body[f];
    }
  }

  // Batasi durasi 3-60 detik
  if (data.tvDuration !== undefined) {
    data.tvDuration = Math.max(
      3,
      Math.min(60, parseInt(data.tvDuration, 10) || 7),
    );
  }

  const updated = await prisma.invitation.update({
    where: {
      id: p.id,
    },
    data,
  });

  return NextResponse.json({
    settings: updated,
  });
}
