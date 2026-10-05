import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request) {
  const host = (new URL(request.url).searchParams.get("host") || "")
    .toLowerCase()
    .split(":")[0];
  if (!host)
    return NextResponse.json({ error: "host required" }, { status: 400 });

  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "").toLowerCase();
  const bare = host.replace(/^www\./, "");

  // 1) Domain kustom (dengan atau tanpa www)
  let inv = await prisma.invitation.findFirst({
    where: { customDomain: { in: [host, bare] }, status: "PUBLISHED" },
    select: { slug: true },
  });
  if (inv)
    return NextResponse.json({ slug: inv.slug, matchedBy: "customDomain" });

  // 2) Subdomain: hanya jika host berakhiran domain induk (atau .localhost untuk tes lokal)
  let sub = null;
  if (root && host.endsWith("." + root))
    sub = host.slice(0, -(root.length + 1));
  else if (host.endsWith(".localhost"))
    sub = host.slice(0, -".localhost".length);

  if (sub && !sub.includes(".")) {
    inv = await prisma.invitation.findFirst({
      where: { subdomain: sub, status: "PUBLISHED" },
      select: { slug: true },
    });
    if (inv)
      return NextResponse.json({ slug: inv.slug, matchedBy: "subdomain" });
  }

  return NextResponse.json({ slug: null });
}
