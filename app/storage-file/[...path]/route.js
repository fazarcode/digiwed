import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const STORAGE_ROOT =
  process.env.STORAGE_ROOT || "/app/digital-invitation-platform/storage";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

export async function GET(request, { params }) {
  const p = await params;
  const segments = p.path || [];
  // Prevent path traversal
  const clean = segments.map((s) =>
    s.replace(/\.\./g, "").replace(/^\/+|\/+$/g, ""),
  );
  const filePath = path.join(STORAGE_ROOT, ...clean);
  const resolved = path.resolve(filePath);
  const rootResolved = path.resolve(STORAGE_ROOT);

  console.log("🚨 LOKASI NYATA FILE DI HARD DRIVE:", resolved);

  if (!resolved.startsWith(rootResolved))
    return new NextResponse("Forbidden", { status: 403 });
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    return new NextResponse("Not Found", { status: 404 });
  }
  const ext = path.extname(resolved).toLowerCase();
  const buf = fs.readFileSync(resolved);
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
