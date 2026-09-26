import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

// Any authenticated user can list enabled categories (read-only)
export async function GET() {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const items = await prisma.guestCategory.findMany({
    where: { enabled: true },
    orderBy: [{ order: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, order: true },
  });
  return NextResponse.json({ items });
}
