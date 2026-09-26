import { nanoid } from 'nanoid';

export function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function makeUniqueSlug(base) {
  const s = slugify(base) || 'invitation';
  return `${s}-${nanoid(6)}`;
}

export function makeGuestToken() {
  return nanoid(10);
}
