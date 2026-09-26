import Link from "next/link";
import { Heart } from "lucide-react";
import LoginForm from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF7F2] via-[#F5EFE4] to-[#EDE3D0] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-primary" fill="currentColor" />
            <span className="font-serif text-3xl font-bold text-primary">
              Elegante
            </span>
          </div>
        </Link>
        <div className="rounded-2xl border border-primary/10 bg-white/80 p-8 backdrop-blur luxury-shadow">
          <div className="mb-6 text-center">
            <h1 className="font-serif text-3xl font-bold text-foreground">
              Welcome Back
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in to your account
            </p>
          </div>
          <LoginForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-primary hover:underline"
            >
              Sign up
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            <Link href="/forgot-password" className="hover:text-primary">
              Forgot password?
            </Link>
          </p>
        </div>
        <div className="mt-4 rounded-xl border border-primary/10 bg-white/60 p-4 text-center text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">
            Demo Admin Accounts
          </p>
          <p>admin@example.com / Admin@12345</p>
        </div>
      </div>
    </div>
  );
}
