'use client';
import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const onSubmit = (e) => {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    const email = fd.get('email');
    const password = fd.get('password');
    startTransition(async () => {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        setError('Invalid email or password');
        toast.error('Invalid email or password');
        return;
      }
      toast.success('Welcome back!');
      // Fetch session to determine role for redirect
      const s = await fetch('/api/auth/session').then((r) => r.json()).catch(() => null);
      const target = s?.user?.role === 'ADMIN' ? '/admin' : '/dashboard';
      router.push(target);
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="you@example.com" defaultValue="admin@example.com" />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required placeholder="••••••••" defaultValue="Admin@12345" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={pending}>
        {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Signing in...</> : 'Sign In'}
      </Button>
    </form>
  );
}
