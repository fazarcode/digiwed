'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { registerUser } from '@/actions/auth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const onSubmit = (e) => {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await registerUser(null, fd);
      if (result?.error) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      // New accounts are PENDING until an admin activates them — no auto sign-in.
      toast.success('Account created! Awaiting admin approval before you can sign in.');
      router.push('/login?pending=1');
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" name="name" required placeholder="John Doe" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="you@example.com" />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required minLength={6} placeholder="At least 6 characters" />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={pending}>
        {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Creating account...</> : 'Create Account'}
      </Button>
    </form>
  );
}
