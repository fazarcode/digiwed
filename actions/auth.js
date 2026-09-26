'use server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function registerUser(prevState, formData) {
  try {
    const parsed = registerSchema.safeParse({
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }
    const { name, email, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return { error: 'Email is already registered' };

    // Ensure USER role exists (safety net)
    const userRole = await prisma.role.upsert({
      where: { name: 'USER' },
      update: {},
      create: { name: 'USER' },
    });

    const hash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { name, email, password: hash, roleId: userRole.id, status: 'PENDING' },
    });
    // Account starts PENDING; an admin must activate it before the user can sign in.
    return { success: true, pending: true };
  } catch (e) {
    console.error('registerUser error:', e);
    return { error: 'Registration failed. Please try again.' };
  }
}

export async function loginUser(prevState, formData) {
  try {
    const email = formData.get('email');
    const password = formData.get('password');
    if (!email || !password) return { error: 'Please provide both email and password' };
    await signIn('credentials', { email, password, redirect: false });
    return { success: true };
  } catch (e) {
    if (e instanceof AuthError) {
      if (e.type === 'CredentialsSignin') return { error: 'Invalid email or password' };
      return { error: 'Authentication error' };
    }
    // Next.js redirect is thrown as error – rethrow
    if (e?.digest?.startsWith('NEXT_REDIRECT')) throw e;
    console.error('loginUser error:', e);
    return { error: 'Login failed. Please try again.' };
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: '/login' });
}

const forgotSchema = z.object({ email: z.string().email() });

export async function forgotPassword(prevState, formData) {
  try {
    const parsed = forgotSchema.safeParse({ email: formData.get('email') });
    if (!parsed.success) return { error: 'Invalid email' };
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    // Always return success to avoid user enumeration
    if (user) {
      const token = require('crypto').randomBytes(32).toString('hex');
      const exp = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await prisma.user.update({ where: { id: user.id }, data: { resetToken: token, resetTokenExp: exp } });
      // In production: send email. For MVP we log the reset link.
      console.log(`[PASSWORD RESET] Link for ${user.email}: ${process.env.NEXTAUTH_URL}/reset-password?token=${token}`);
    }
    return { success: true, message: 'If your email is registered, you will receive a reset link shortly.' };
  } catch (e) {
    console.error('forgotPassword error:', e);
    return { error: 'Something went wrong. Please try again.' };
  }
}

const resetSchema = z.object({ token: z.string(), password: z.string().min(6) });

export async function resetPassword(prevState, formData) {
  try {
    const parsed = resetSchema.safeParse({
      token: formData.get('token'),
      password: formData.get('password'),
    });
    if (!parsed.success) return { error: 'Invalid input' };
    const user = await prisma.user.findUnique({ where: { resetToken: parsed.data.token } });
    if (!user || !user.resetTokenExp || user.resetTokenExp < new Date()) {
      return { error: 'Invalid or expired reset token' };
    }
    const hash = await bcrypt.hash(parsed.data.password, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hash, resetToken: null, resetTokenExp: null } });
    return { success: true };
  } catch (e) {
    return { error: 'Reset failed' };
  }
}
