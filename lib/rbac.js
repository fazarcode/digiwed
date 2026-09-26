import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export async function requireAdmin() {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.role !== 'ADMIN') redirect('/dashboard');
  return session;
}

export async function requireUser() {
  const session = await auth();
  if (!session) redirect('/login');
  if (session.user.role === 'ADMIN') redirect('/admin');
  return session;
}

export async function requireAuth() {
  const session = await auth();
  if (!session) redirect('/login');
  return session;
}
