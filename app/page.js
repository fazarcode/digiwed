import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Heart, Sparkles, Palette, Users, QrCode, Shield, ChevronRight, Star, Instagram, Facebook, Youtube, MessageCircle, Music2 } from 'lucide-react';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function getLandingData() {
  try {
    const [settingsRows, packages, templates, testimonials] = await Promise.all([
      prisma.setting.findMany(),
      prisma.package.findMany({ where: { status: true }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] }),
      prisma.template.findMany({ where: { enabled: true, featured: true }, orderBy: { createdAt: 'desc' }, take: 6 }),
      prisma.testimonial.findMany({ where: { active: true }, orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] }),
    ]);
    const settings = Object.fromEntries(settingsRows.map((x) => [x.key, x.value]));
    return { settings, packages, templates, testimonials };
  } catch {
    return { settings: {}, packages: [], templates: [], testimonials: [] };
  }
}

export default async function LandingPage() {
  const { settings, packages, templates, testimonials } = await getLandingData();
  const siteName = settings.website_name || 'Elegante';
  const socials = [
    { key: 'social_instagram', href: settings.social_instagram, icon: Instagram, label: 'Instagram' },
    { key: 'social_facebook', href: settings.social_facebook, icon: Facebook, label: 'Facebook' },
    { key: 'social_tiktok', href: settings.social_tiktok, icon: Music2, label: 'TikTok' },
    { key: 'social_youtube', href: settings.social_youtube, icon: Youtube, label: 'YouTube' },
    { key: 'social_whatsapp', href: settings.social_whatsapp ? (String(settings.social_whatsapp).startsWith('http') ? settings.social_whatsapp : `https://wa.me/${String(settings.social_whatsapp).replace(/[^0-9]/g, '')}`) : '', icon: MessageCircle, label: 'WhatsApp' },
  ].filter((s) => s.href && String(s.href).trim());

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAF7F2] via-[#F5EFE4] to-[#FAF7F2]">
      <nav className="container mx-auto flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary" fill="currentColor" />
          <span className="font-serif text-2xl font-bold text-primary">{siteName}</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login"><Button variant="ghost">Login</Button></Link>
          <Link href="/register"><Button className="bg-primary hover:bg-primary/90">Get Started</Button></Link>
        </div>
      </nav>

      <section className="container mx-auto py-24 text-center">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/60 px-4 py-1.5 text-sm text-primary">
            <Sparkles className="h-4 w-4" /><span>Multi-Tenant Digital Wedding Platform</span>
          </div>
          <h1 className="font-serif text-5xl font-bold leading-tight tracking-tight text-foreground md:text-7xl">
            Craft Your <span className="text-gradient-gold">Perfect</span><br />Wedding Invitation
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Design elegant, personalized digital wedding invitations. Manage guests, collect RSVPs, check-in via QR &mdash; all in one beautifully-crafted platform.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register"><Button size="lg" className="bg-primary hover:bg-primary/90 px-8 h-12">Start Creating <ChevronRight className="ml-1 h-4 w-4"/></Button></Link>
            <Link href="/login"><Button size="lg" variant="outline" className="border-primary/30 h-12">Sign In</Button></Link>
          </div>
        </div>
      </section>

      <section className="container mx-auto pb-24">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Palette, title: 'Custom Themes', desc: 'Colors, fonts, animations — everything is customizable with live preview.' },
            { icon: Users, title: 'Guest Management', desc: 'Track guests, generate personalized invitation URLs automatically.' },
            { icon: QrCode, title: 'QR Check-in', desc: 'Every guest gets a unique QR code. Scan at the venue to check them in.' },
            { icon: Sparkles, title: 'Template Engine', desc: 'Upload HTML/CSS/JS templates as ZIP. Placeholders are auto-filled from your data.' },
            { icon: Heart, title: 'RSVP Collection', desc: 'Individual or Group RSVPs with guest count. Real-time statistics.' },
            { icon: Shield, title: 'Multi-Tenant Secure', desc: 'Strict RBAC. Your data is fully isolated and never accessible by others.' },
          ].map((f, i) => (
            <div key={i} className="group rounded-2xl border border-primary/10 bg-white/60 p-8 backdrop-blur transition hover:border-primary/30 hover:shadow-lg">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground"><f.icon className="h-6 w-6" /></div>
              <h3 className="mb-2 font-serif text-xl font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {templates.length > 0 && (
        <section className="container mx-auto pb-24" data-testid="landing-templates">
          <h2 className="font-serif text-3xl font-bold text-center mb-8">Featured Templates</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <div key={t.id} className="rounded-2xl border border-primary/10 bg-white overflow-hidden">
                {t.previewImage ? <img src={`/storage-file/${t.previewImage}`} alt={t.name} className="w-full h-48 object-cover" /> : <div className="w-full h-48 bg-primary/5 flex items-center justify-center text-primary/40"><Sparkles className="h-8 w-8" /></div>}
                <div className="p-4"><h3 className="font-serif text-lg font-semibold">{t.name}</h3>{t.description && <p className="text-sm text-muted-foreground line-clamp-2">{t.description}</p>}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {packages.length > 0 && (
        <section className="container mx-auto pb-24" data-testid="landing-packages">
          <h2 className="font-serif text-3xl font-bold text-center mb-8">Packages</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((p) => {
              const feats = typeof p.features === 'string' ? (() => { try { return JSON.parse(p.features); } catch { return {}; } })() : (p.features || {});
              const enabled = Object.entries(feats).filter(([, v]) => v).map(([k]) => k);
              return (
                <div key={p.id} className="rounded-2xl border border-primary/10 bg-white p-6 flex flex-col">
                  <h3 className="font-serif text-xl font-semibold">{p.name}</h3>
                  {p.price && <p className="text-2xl font-bold text-primary mt-1">{p.price}</p>}
                  {p.description && <p className="text-sm text-muted-foreground mt-2">{p.description}</p>}
                  <ul className="mt-4 space-y-1 text-sm text-muted-foreground flex-1">
                    {enabled.slice(0, 8).map((f) => <li key={f} className="flex items-center gap-2"><ChevronRight className="h-3.5 w-3.5 text-primary" />{f.replace(/_/g, ' ')}</li>)}
                  </ul>
                  <Link href="/register" className="mt-4"><Button className="w-full bg-primary">Choose Plan</Button></Link>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {testimonials.length > 0 && (
        <section className="container mx-auto pb-24" data-testid="landing-testimonials">
          <h2 className="font-serif text-3xl font-bold text-center mb-8">What Our Clients Say</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.id} className="rounded-2xl border border-primary/10 bg-white/70 p-6">
                <div className="flex text-amber-500 mb-2">{Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-4 w-4" fill="currentColor" />)}</div>
                <p className="text-sm italic text-foreground/80">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-2 mt-3">
                  {t.avatar && <img src={t.avatar} alt={t.name} className="h-8 w-8 rounded-full object-cover" />}
                  <span className="text-sm font-medium">{t.name}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-primary/10 py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
          <p>&copy; {new Date().getFullYear()} {siteName}. Crafted with love.</p>
          {socials.length > 0 && (
            <div className="flex gap-4" data-testid="landing-socials">
              {socials.map((s) => (
                <a key={s.key} href={s.href} target="_blank" rel="noopener" aria-label={s.label} className="hover:text-primary"><s.icon className="h-5 w-5" /></a>
              ))}
            </div>
          )}
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-primary">Login</Link>
            <Link href="/register" className="hover:text-primary">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
