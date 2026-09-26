import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { renderInvitationAsync } from '@/lib/template-engine';

export async function GET(request, { params }) {
  const s = await auth();
  if (!s || s.user.role !== 'ADMIN') return new NextResponse('Forbidden', { status: 403 });
  const p = await params;
  const template = await prisma.template.findUnique({ where: { id: p.id } });
  if (!template) return new NextResponse('Not found', { status: 404 });
  // Render with sample invitation for preview
  const sampleInvitation = {
    id: 'preview-sample',
    slug: 'preview',
    brideName: 'Amelia', groomName: 'Fazar',
    brideParents: 'Mr. & Mrs. Anderson', groomParents: 'Mr. & Mrs. Prasetyo',
    weddingDate: new Date(Date.now() + 60 * 86400000),
    weddingTime: '10:00 AM',
    venue: 'The Ritz Ballroom',
    address: 'Jalan Sudirman No. 1, Jakarta',
    mapUrl: 'https://maps.google.com',
    quote: 'Two hearts, one soul, forever together.',
    events: [
      { title: 'Wedding Ceremony', date: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10), time: '10:00', venue: 'The Ritz Ballroom', address: 'Jalan Sudirman No. 1, Jakarta', mapUrl: 'https://maps.google.com' },
    ],
    loveStory: [
      { date: '2019', title: 'First Meeting', story: 'Our story began on a warm summer day...' },
      { date: '2024', title: 'The Proposal', story: 'And continues to this day.' },
    ],
    coverImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200',
    primaryColor: '#8B6F47', secondaryColor: '#D4A574', backgroundColor: '#FAF7F2',
    fontFamily: 'Playfair Display', buttonStyle: 'rounded', borderRadius: '12', animation: 'fade',
    gallery: [
      { url: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=600', order: 0 },
      { url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600', order: 1 },
      { url: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=600', order: 2 },
      { url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600', order: 3 },
    ],
    videos: [], music: null,
  };
  const html = await renderInvitationAsync({ template, invitation: sampleInvitation, guest: null });
  return new NextResponse(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
