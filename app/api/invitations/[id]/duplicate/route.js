import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { makeUniqueSlug } from '@/lib/slug';

export async function POST(request, { params }) {
  const s = await auth();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const p = await params;
  const src = await prisma.invitation.findFirst({
    where: { id: p.id, userId: s.user.id },
    include: { gallery: true, videos: true, music: true },
  });
  if (!src) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const newSlug = makeUniqueSlug(`${src.brideName || 'copy'}-${src.groomName || 'copy'}`);
  const dupe = await prisma.invitation.create({
    data: {
      userId: src.userId, templateId: src.templateId, slug: newSlug, status: 'DRAFT',
      brideName: src.brideName, groomName: src.groomName,
      brideParents: src.brideParents, groomParents: src.groomParents,
      weddingDate: src.weddingDate, weddingTime: src.weddingTime,
      venue: src.venue, address: src.address, mapUrl: src.mapUrl,
      quote: src.quote, loveStory: src.loveStory, coverImage: src.coverImage,
      primaryColor: src.primaryColor, secondaryColor: src.secondaryColor, backgroundColor: src.backgroundColor,
      fontFamily: src.fontFamily, buttonStyle: src.buttonStyle, borderRadius: src.borderRadius, animation: src.animation,
      gallery: { create: src.gallery.map(g => ({ url: g.url, caption: g.caption, order: g.order })) },
      videos: { create: src.videos.map(v => ({ url: v.url, type: v.type, title: v.title })) },
      music: src.music ? { create: { url: src.music.url, title: src.music.title, autoplay: src.music.autoplay } } : undefined,
    },
  });
  return NextResponse.json({ invitation: { id: dupe.id, slug: dupe.slug } });
}
