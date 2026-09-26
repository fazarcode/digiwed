import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function POST(request) {
  const s = await auth();
  if (!s || s.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json();
  const entries = Object.entries(body);
  await Promise.all(entries.map(([key, value]) =>
    prisma.setting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } })
  ));
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const s = await auth();
  if (!s || s.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const settings = await prisma.setting.findMany();
  return NextResponse.json({ settings: Object.fromEntries(settings.map(x => [x.key, x.value])) });
}
