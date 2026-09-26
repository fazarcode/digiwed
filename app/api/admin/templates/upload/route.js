import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { slugify } from '@/lib/slug';
import { nanoid } from 'nanoid';

const STORAGE_ROOT = process.env.STORAGE_ROOT || '/app/digital-invitation-platform/storage';

export async function POST(request) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    // Locate manifest.json and index.html
    const manifestEntry = entries.find(e => e.entryName.toLowerCase().endsWith('manifest.json') && !e.isDirectory);
    const indexEntry = entries.find(e => e.entryName.toLowerCase().endsWith('index.html') && !e.isDirectory);
    if (!manifestEntry) return NextResponse.json({ error: 'manifest.json not found in ZIP' }, { status: 400 });
    if (!indexEntry) return NextResponse.json({ error: 'index.html not found in ZIP' }, { status: 400 });

    let manifest;
    try { manifest = JSON.parse(zip.readAsText(manifestEntry, 'utf8')); }
    catch { return NextResponse.json({ error: 'Invalid manifest.json (must be valid JSON)' }, { status: 400 }); }

    if (!manifest.name) return NextResponse.json({ error: 'manifest.json must contain a "name" field' }, { status: 400 });

    // Determine root prefix inside ZIP (files might be under a top folder)
    const manifestPath = manifestEntry.entryName;
    const rootPrefix = manifestPath.substring(0, manifestPath.length - 'manifest.json'.length);

    // Slug
    let slug = slugify(manifest.slug || manifest.name) || `tpl-${nanoid(6)}`;
    // Ensure unique
    let exists = await prisma.template.findUnique({ where: { slug } });
    if (exists) slug = `${slug}-${nanoid(4)}`;

    const folderPath = `templates/${slug}`;
    const destDir = path.join(STORAGE_ROOT, folderPath);
    if (fs.existsSync(destDir)) fs.rmSync(destDir, { recursive: true, force: true });
    fs.mkdirSync(destDir, { recursive: true });

    // Extract entries under rootPrefix
    let previewImage = null;
    for (const entry of entries) {
      if (entry.isDirectory) continue;
      if (rootPrefix && !entry.entryName.startsWith(rootPrefix)) continue;
      const relative = entry.entryName.substring(rootPrefix.length);
      if (!relative) continue;
      if (relative.includes('..')) continue; // safety
      const outPath = path.join(destDir, relative);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, entry.getData());
      if (/^preview\.(jpg|jpeg|png|webp)$/i.test(relative)) previewImage = `${folderPath}/${relative}`;
    }

    const template = await prisma.template.create({
      data: {
        name: manifest.name,
        slug,
        description: manifest.description || null,
        folderPath,
        previewImage,
        manifest,
        enabled: true,
      },
    });

    return NextResponse.json({
      template: {
        id: template.id,
        name: template.name,
        slug: template.slug,
        description: template.description,
        previewImage: template.previewImage,
        enabled: template.enabled,
        createdAt: template.createdAt.toISOString(),
      },
    });
  } catch (e) {
    console.error('Template upload error:', e);
    return NextResponse.json({ error: e.message || 'Failed to process ZIP' }, { status: 500 });
  }
}

export const config = { api: { bodyParser: false } };
