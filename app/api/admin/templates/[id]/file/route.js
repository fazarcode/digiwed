import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

const STORAGE_ROOT = process.env.STORAGE_ROOT || '/app/digital-invitation-platform/storage';
const EDITABLE = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.json', '.svg', '.txt']);

async function guard() {
  const s = await auth();
  if (!s || s.user.role !== 'ADMIN') return null;
  return s;
}

// Resolve a relative path strictly inside `root`. Strips `..` AND enforces prefix.
function resolveInFolder(root, rel) {
  const cleaned = String(rel || '')
    .replace(/\\/g, '/')
    .split('/')
    .map((s) => s.replace(/\.\./g, ''))
    .filter((s) => s && s !== '.')
    .join('/');
  if (!cleaned) return null;
  const resolved = path.resolve(root, cleaned);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) return null;
  return resolved;
}

async function loadTemplateRoot(id) {
  const template = await prisma.template.findUnique({ where: { id } });
  if (!template) return { error: 'Not found', status: 404 };
  const rootReal = path.resolve(STORAGE_ROOT);
  const root = path.resolve(STORAGE_ROOT, template.folderPath);
  if (root !== rootReal && !root.startsWith(rootReal + path.sep)) return { error: 'Forbidden', status: 403 };
  return { template, root };
}

// GET ?path=<relative> -> returns text file contents (path validated, editable-only).
export async function GET(request, { params }) {
  if (!(await guard())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const p = await params;
  const ctx = await loadTemplateRoot(p.id);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const rel = new URL(request.url).searchParams.get('path');
  const abs = resolveInFolder(ctx.root, rel);
  if (!abs) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return NextResponse.json({ error: 'File not found' }, { status: 404 });

  const ext = path.extname(abs).toLowerCase();
  if (!EDITABLE.has(ext)) return NextResponse.json({ error: 'File is not a text/editable file' }, { status: 415 });

  const content = fs.readFileSync(abs, 'utf8');
  return NextResponse.json({ path: rel, content, editable: true });
}

// PUT { path, content } -> writes a single text file (path validated, editable-only).
// Touches only that file. Does not alter template id / relationships / other assets.
export async function PUT(request, { params }) {
  if (!(await guard())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const p = await params;
  const ctx = await loadTemplateRoot(p.id);
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const abs = resolveInFolder(ctx.root, body?.path);
  if (!abs) return NextResponse.json({ error: 'Invalid path' }, { status: 400 });

  const ext = path.extname(abs).toLowerCase();
  if (!EDITABLE.has(ext)) return NextResponse.json({ error: 'Only text files may be edited' }, { status: 400 });
  if (typeof body.content !== 'string') return NextResponse.json({ error: 'content must be a string' }, { status: 400 });

  // Ensure parent dir exists (it should, since file was listed), then write only this file.
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, body.content, 'utf8');
  return NextResponse.json({ ok: true, path: body.path });
}
