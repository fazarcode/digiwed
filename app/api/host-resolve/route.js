import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Resolve a host header to an invitation slug. Called from middleware to enable custom-domain routing.
export async function GET(request) {
  const host = (new URL(request.url).searchParams.get('host') || '').toLowerCase().split(':')[0];
  if (!host) return NextResponse.json({ error: 'host required' }, { status: 400 });

  // 1) Exact custom domain match
  let inv = await prisma.invitation.findFirst({ where: { customDomain: host, status: 'PUBLISHED' }, select: { slug: true } });
  if (inv) return NextResponse.json({ slug: inv.slug, matchedBy: 'customDomain' });

  // 2) Subdomain match (first label of host)
  const parts = host.split('.');
  if (parts.length >= 3) {
    const sub = parts[0];
    inv = await prisma.invitation.findFirst({ where: { subdomain: sub, status: 'PUBLISHED' }, select: { slug: true } });
    if (inv) return NextResponse.json({ slug: inv.slug, matchedBy: 'subdomain' });
  }

  return NextResponse.json({ slug: null });
}
