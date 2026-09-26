import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';

// Public (authenticated user) endpoint: list active packages so users can pick one for their invitation.
export async function GET() {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const packages = await prisma.package.findMany({
    where: { status: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, description: true, features: true, sortOrder: true },
  });
  return NextResponse.json({ packages });
}
