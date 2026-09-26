import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { renderInvitationFromSourceAsync } from '@/lib/template-engine';

async function guard() {
  const s = await auth();
  if (!s || s.user.role !== 'ADMIN') return null;
  return s;
}

// Same sample invitation used by .../render/route.js so live-preview matches the saved preview.
const SAMPLE_INVITATION = {
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

// POST { files: { "index.html": "...", ... } } -> renders UNSAVED content in-memory.
// Writes nothing. Sources index.html from the posted buffer; assets still load via /storage-file.
export async function POST(request, { params }) {
  if (!(await guard())) return new NextResponse('Forbidden', { status: 403 });
  const p = await params;
  const template = await prisma.template.findUnique({ where: { id: p.id } });
  if (!template) return new NextResponse('Not found', { status: 404 });

  let body;
  try { body = await request.json(); } catch { return new NextResponse('Invalid JSON', { status: 400 }); }
  const files = (body && body.files) || {};

  // Find index.html among posted files (case-insensitive; supports nested folder templates).
  let html = '';
  for (const k of Object.keys(files)) {
    if (k.toLowerCase().endsWith('index.html') && typeof files[k] === 'string') { html = files[k]; break; }
  }

  const out = await renderInvitationFromSourceAsync({
    html,
    folderPath: template.folderPath,
    invitation: SAMPLE_INVITATION,
    guest: null,
  });
  return new NextResponse(out, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
