import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { auth } from '@/auth';
import { nanoid } from 'nanoid';

const STORAGE_ROOT = process.env.STORAGE_ROOT || '/app/digital-invitation-platform/storage';

export async function POST(request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const form = await request.formData();
  const file = form.get('file');
  const kind = form.get('kind') || 'file';
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'No file' }, { status: 400 });

  const ext = path.extname(file.name || '').toLowerCase() || '';
  const filename = `${Date.now()}-${nanoid(8)}${ext}`;
  const relDir = `uploads/${session.user.id}/${kind}`;
  const dir = path.join(STORAGE_ROOT, relDir);
  fs.mkdirSync(dir, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(dir, filename), buf);
  const url = `/storage-file/${relDir}/${filename}`;
  return NextResponse.json({ url });
}

export const config = { api: { bodyParser: false } };
