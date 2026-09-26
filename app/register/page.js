import Link from 'next/link';
import { Heart } from 'lucide-react';
import RegisterForm from '@/components/auth/register-form';

export default function RegisterPage() {
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
            <h1 className="font-serif text-3xl font-bold text-foreground">Create Account</h1>
            <p className="mt-2 text-sm text-muted-foreground">Start creating beautiful invitations</p>
          </div>
          <RegisterForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
