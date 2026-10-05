"use client";
import { signOut } from "next-auth/react";
import { LogOut, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UserHeader({ user }) {
  return (
    <header className="h-14 lg:h-16 bg-white/95 backdrop-blur border-b border-primary/10 flex items-center justify-between gap-3 px-4 lg:px-8 sticky top-0 z-10">
      <div className="flex items-center gap-3 min-w-0">
        {/* Logo kecil hanya di mobile/tablet (di desktop sudah ada di sidebar) */}
        <Heart
          className="h-6 w-6 text-primary shrink-0 lg:hidden"
          fill="currentColor"
        />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-widest text-muted-foreground hidden sm:block">
            Selamat datang kembali
          </p>
          <p className="font-serif font-semibold text-foreground truncate">
            {user.name}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right hidden md:block">
          <p className="text-sm font-medium">{user.email}</p>
          <p className="text-xs text-muted-foreground">Akun</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Keluar</span>
        </Button>
      </div>
    </header>
  );
}
