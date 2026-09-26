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

function walk(dir, root, out) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs, root, out);
    } else if (entry.isFile()) {
      const rel = path.relative(root, abs).split(path.sep).join('/');
      let size = 0;
      try { size = fs.statSync(abs).size; } catch {}
      out.push({ path: rel, editable: EDITABLE.has(path.extname(rel).toLowerCase()), size });
    }
  }
}

// GET -> recursive list of files inside the template folder (relative paths + editable flag).
// Never lists outside template.folderPath.
export async function GET(request, { params }) {
  if (!(await guard())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const p = await params;
  const template = await prisma.template.findUnique({ where: { id: p.id } });
  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const rootReal = path.resolve(STORAGE_ROOT);
  const root = path.resolve(STORAGE_ROOT, template.folderPath);
  if (root !== rootReal && !root.startsWith(rootReal + path.sep)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (!fs.existsSync(root)) return NextResponse.json({ template: { id: template.id, name: template.name, folderPath: template.folderPath }, files: [] });

  const out = [];
  walk(root, root, out);
  out.sort((a, b) => a.path.localeCompare(b.path));
  return NextResponse.json({ template: { id: template.id, name: template.name, folderPath: template.folderPath }, files: out });
}
