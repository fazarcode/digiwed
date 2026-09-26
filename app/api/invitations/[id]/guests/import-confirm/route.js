import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { makeGuestToken } from '@/lib/slug';

async function guard(id, userId) { return prisma.invitation.findFirst({ where: { id, userId }, select: { id: true } }); }

const GUEST_TYPES = ['INDIVIDUAL', 'GROUP'];
const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const SIDES = ['GROOM', 'BRIDE', 'BOTH', 'PARENTS'];
function normStr(v) { return v == null ? null : String(v).trim() || null; }
function normEnum(v, allowed) { const x = normStr(v); if (!x) return null; const u = x.toUpperCase(); return allowed.includes(u) ? u : null; }

// Feature I — CONFIRM import. Receives already-parsed + mapped rows (JSON) selected by the user
// and inserts them in CHUNKS. Body: { rows: [{name, phone, guestType, gender, guestSide, categoryName}], defaultCategoryId }
export async function POST(request, { params }) {
  const s = await auth(); if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  if (!(await guard(p.id, s.user.id))) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length) return NextResponse.json({ error: 'No rows to import' }, { status: 400 });
  if (rows.length > 5000) return NextResponse.json({ error: 'Too many rows (max 5000)' }, { status: 400 });

  // Categories available to this invitation (global + own) for name matching.
  const cats = await prisma.guestCategory.findMany({ where: { OR: [{ invitationId: null }, { invitationId: p.id }] } });
  const catByName = new Map(cats.map((c) => [c.name.toLowerCase(), c]));
  const defaultCategoryId = body.defaultCategoryId && cats.find((c) => c.id === body.defaultCategoryId) ? body.defaultCategoryId : null;

  // Duplicate detection: existing names for this invitation (case-insensitive).
  const existing = await prisma.guest.findMany({ where: { invitationId: p.id }, select: { name: true } });
  const existingNames = new Set(existing.map((g) => g.name.toLowerCase()));

  let imported = 0, skipped = 0, failed = 0;
  const errors = [];
  const CHUNK = 100;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    for (const [j, row] of chunk.entries()) {
      const idx = i + j + 1;
      const name = normStr(row.name);
      if (!name) { failed++; errors.push({ row: idx, error: 'Missing name' }); continue; }
      if (existingNames.has(name.toLowerCase())) { skipped++; continue; }
      const catName = normStr(row.categoryName);
      let categoryId = defaultCategoryId, categoryText = null;
      if (catName) { const c = catByName.get(catName.toLowerCase()); if (c) categoryId = c.id; else categoryText = catName; }
      try {
        await prisma.guest.create({
          data: {
            invitationId: p.id,
            name,
            phone: normStr(row.phone),
            guestType: normEnum(row.guestType, GUEST_TYPES) || 'INDIVIDUAL',
            gender: normEnum(row.gender, GENDERS),
            guestSide: normEnum(row.guestSide, SIDES),
            categoryId, categoryText,
            token: makeGuestToken(),
            checkedInCount: 0,
          },
        });
        existingNames.add(name.toLowerCase());
        imported++;
      } catch (e) { failed++; errors.push({ row: idx, error: e.message }); }
    }
  }
  return NextResponse.json({ imported, skipped, failed, errors: errors.slice(0, 50) });
}
