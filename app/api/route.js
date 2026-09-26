import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Digital Invitation Platform API', status: 'ok' });
}
