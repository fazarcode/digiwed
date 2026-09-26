'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { Heart, Loader2 } from 'lucide-react';
import { forgotPassword } from '@/actions/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(forgotPassword, null);
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF7F2] via-[#F5EFE4] to-[#EDE3D0] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-primary" fill="currentColor" />
            <span className="font-serif text-3xl font-bold text-primary">Elegante</span>
          </div>
        </Link>
        <div className="rounded-2xl border border-primary/10 bg-white/80 p-8 backdrop-blur luxury-shadow">
          <div className="mb-6 text-center">
            <h1 className="font-serif text-3xl font-bold text-foreground">Forgot Password</h1>
            <p className="mt-2 text-sm text-muted-foreground">Enter your email to receive a reset link</p>
          </div>
          {state?.success ? (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-800">
              {state.message}
            </div>
          ) : (
            <form action={formAction} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required placeholder="you@example.com" />
              </div>
              {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={pending}>
                {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Sending...</> : 'Send Reset Link'}
              </Button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Remember your password?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
