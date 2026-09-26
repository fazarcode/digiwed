'use client';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AdminHeader({ user }) {
  return (
    <header className="h-16 bg-white border-b border-primary/10 flex items-center justify-between px-6 md:px-8 sticky top-0 z-10">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Signed in as Admin</p>
        <p className="font-serif font-semibold text-foreground">{user.name}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium">{user.email}</p>
          <p className="text-xs text-muted-foreground">Administrator</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => signOut({ callbackUrl: '/login' })}>
          <LogOut className="h-4 w-4 mr-2" />Sign out
        </Button>
      </div>
    </header>
  );
}
