import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

async function guard(id, userId) { return prisma.invitation.findFirst({ where: { id, userId }, select: { id: true } }); }

// Feature I — PARSE ONLY. Reads the uploaded Excel and returns columns + rows.
// NOTHING is inserted into the database at this stage.
export async function POST(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await guard(p.id, s.user.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'No file' }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  let wb;
  try { wb = XLSX.read(buf, { type: 'buffer' }); } catch { return NextResponse.json({ error: 'Could not read file' }, { status: 400 }); }
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (!rows.length) return NextResponse.json({ error: 'Sheet is empty' }, { status: 400 });
  const columns = Object.keys(rows[0]);
  // Cap preview to a reasonable number of rows for the dialog.
  const preview = rows.slice(0, 1000);
  return NextResponse.json({ columns, rows: preview, totalRows: rows.length });
}
