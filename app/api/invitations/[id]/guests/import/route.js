import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { makeGuestToken } from '@/lib/slug';

async function guard(id, userId) { return prisma.invitation.findFirst({ where: { id, userId }, select: { id: true } }); }

const GUEST_TYPES = ['INDIVIDUAL', 'GROUP'];
const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const SIDES = ['GROOM', 'BRIDE', 'BOTH', 'PARENTS'];

function normStr(v) { return v == null ? null : String(v).trim() || null; }
function normEnum(v, allowed) {
  const s = normStr(v);
  if (!s) return null;
  const upper = s.toUpperCase();
  return allowed.includes(upper) ? upper : null;
}

export async function POST(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await guard(p.id, s.user.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'No file' }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!rows.length) return NextResponse.json({ error: 'Sheet is empty' }, { status: 400 });

  // Prefetch categories map (case-insensitive name lookup)
  const cats = await prisma.guestCategory.findMany();
  const catByName = new Map(cats.map(c => [c.name.toLowerCase(), c]));

  const created = [];
  const failed = [];
  for (const [i, row] of rows.entries()) {
    // Support common column name variants (case-insensitive)
    const lower = Object.fromEntries(Object.entries(row).map(([k, v]) => [k.toLowerCase().replace(/\s+/g, ''), v]));
    const name = normStr(lower.name || lower.guestname);
    if (!name) { failed.push({ row: i + 2, error: 'Missing name' }); continue; }
    const phone = normStr(lower.phone);
    const gt = normEnum(lower.guesttype || lower.type, GUEST_TYPES) || 'INDIVIDUAL';
    const gcRaw = lower.guestcount != null ? parseInt(lower.guestcount, 10) : NaN;
    const guestCount = Number.isFinite(gcRaw) && gcRaw > 0 ? Math.min(gcRaw, 50) : 1;
    const gender = normEnum(lower.gender, GENDERS);
    const side = normEnum(lower.guestside || lower.side, SIDES);
    const catName = normStr(lower.category);
    let categoryId = null, categoryText = null;
    if (catName) {
      const cat = catByName.get(catName.toLowerCase());
      if (cat) categoryId = cat.id;
      else categoryText = catName;
    }

    try {
      const g = await prisma.guest.create({
        data: {
          invitationId: p.id,
          name, phone,
          guestType: gt, gender, guestSide: side,
          categoryId, categoryText,
          token: makeGuestToken(),
          // guestCount is stored as recorded count only on check-in for GROUP; but we can pre-set for record
          checkedInCount: 0,
        },
      });
      created.push({ row: i + 2, id: g.id, name: g.name, guestType: g.guestType, initialGuestCount: guestCount });
    } catch (e) {
      failed.push({ row: i + 2, error: e.message });
    }
  }

  return NextResponse.json({ createdCount: created.length, failedCount: failed.length, created, failed });
}
