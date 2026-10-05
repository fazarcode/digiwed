import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Custom domain / subdomain host rewrite happens as an EDGE-friendly best-effort here.
// For a real deployment behind Nginx/Cloudflare, use an X-Invitation-Host header or per-host rewrite rules there.
// We look up the invitation in a DB call only for non-preview hosts (i.e. hosts we don't already recognise) by
// forwarding to /_h/[host]/[slug-resolver]. To keep middleware Edge-safe (no Prisma), the resolver is at an API route.

const PREVIEW_HOST_SUFFIXES = ["emergentagent.com", "emergentcf.cloud"];

function isPreviewHost(host) {
  if (!host) return true;
  const h = host.toLowerCase().split(":")[0];
  if (h === "localhost" || h === "127.0.0.1") return true; // hanya host polos, subdomain.localhost tetap diproses
  return PREVIEW_HOST_SUFFIXES.some(
    (sfx) => h === sfx || h.endsWith("." + sfx),
  );
}

export default auth(async (req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const isLoggedIn = !!session;
  const role = session?.user?.role;
  const path = nextUrl.pathname;
  const host = req.headers.get("host") || "";

  // 1) Host-based routing for custom domain / subdomain (only when NOT a preview host and NOT already on /invite/, /api/, static, etc.)
  if (!isPreviewHost(host) && path === "/") {
    // Forward to internal resolver which queries DB and rewrites
    const resolveUrl = new URL(
      `/api/host-resolve?host=${encodeURIComponent(host)}`,
      nextUrl,
    );
    const res = await fetch(resolveUrl.toString(), {
      headers: { cookie: req.headers.get("cookie") || "" },
    }).catch(() => null);
    if (res && res.ok) {
      const data = await res.json();
      if (data.slug) {
        const target = new URL(`/invite/${data.slug}`, nextUrl);
        return NextResponse.rewrite(target);
      }
    }
  }

  // 2) Redirect logged-in users away from auth pages to their dashboard
  if (
    isLoggedIn &&
    (path === "/login" || path === "/register" || path === "/forgot-password")
  ) {
    const target = role === "ADMIN" ? "/admin" : "/dashboard";
    return NextResponse.redirect(new URL(target, nextUrl));
  }

  // 3) Protect /admin routes (Admin only)
  if (path.startsWith("/admin")) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", nextUrl));
    if (role !== "ADMIN")
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // 4) Protect /dashboard routes (User only)
  if (path.startsWith("/dashboard")) {
    if (!isLoggedIn) return NextResponse.redirect(new URL("/login", nextUrl));
    if (role === "ADMIN")
      return NextResponse.redirect(new URL("/admin", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api/auth|api/host-resolve|_next/static|_next/image|favicon.ico|storage-file|.*\\.(?:png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2|mp3|mp4|webp)$).*)",
  ],
};
