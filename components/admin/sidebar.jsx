'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, LayoutTemplate, Settings, Shield, Tag, Package, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/templates', label: 'Templates', icon: LayoutTemplate },
  { href: '/admin/categories', label: 'Guest Categories', icon: Tag },
  { href: '/admin/packages', label: 'Packages', icon: Package },
  { href: '/admin/testimonials', label: 'Testimonials', icon: Star },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-20 md:w-64 md:flex-col bg-[#1F1710] text-[#E8DCC7]">
      <div className="flex items-center gap-2 h-16 px-6 border-b border-white/5">
        <Shield className="h-6 w-6 text-[#D4A574]" />
        <div>
          <div className="font-serif text-lg font-semibold text-white">Elegante</div>
          <div className="text-[10px] uppercase tracking-widest text-[#D4A574]">Admin Panel</div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-6 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);
          return (
            <Link key={href} href={href} className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition',
              active ? 'bg-[#D4A574] text-[#1F1710] font-semibold shadow-lg' : 'text-[#E8DCC7]/80 hover:bg-white/5 hover:text-white'
            )}>
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-4 border-t border-white/5 text-xs text-white/40">
        <p>Platform Administration</p>
        <p className="mt-0.5">v1.1.0</p>
      </div>
    </aside>
  );
}
