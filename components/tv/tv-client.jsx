'use client';
import { useEffect, useRef, useState } from 'react';

const FONT_SIZES = { small: 32, medium: 44, large: 60, xlarge: 84 };

export default function TVClient({ settings }) {
  const [current, setCurrent] = useState(null);   // currently displayed check-in
  const [connected, setConnected] = useState(false);
  const queueRef = useRef([]);                    // pending greetings, sorted by priority
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  const insertQueue = (item) => {
    // Insert into queue keeping priority ascending (lower = earlier), stable for equal priorities.
    const q = queueRef.current;
    let idx = q.length;
    for (let i = 0; i < q.length; i++) { if (item.priority < q[i].priority) { idx = i; break; } }
    q.splice(idx, 0, item);
  };

  const showNext = () => {
    if (current) return; // never interrupt
    const next = queueRef.current.shift();
    if (!next) { setCurrent(null); return; }
    setCurrent(next);
    if (settings.tvSoundEnabled && audioRef.current) { try { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); } catch {} }
    const dur = Math.max(3, Math.min(60, settings.tvDuration || 7)) * 1000;
    timerRef.current = setTimeout(() => { setCurrent(null); setTimeout(showNext, 350); }, dur);
  };

  useEffect(() => {
    if (!settings.tvEnabled) return;
    const es = new EventSource(`/api/tv/${settings.id}/stream`);
    es.addEventListener('hello', () => setConnected(true));
    es.addEventListener('checkin', (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        insertQueue(payload);
        if (!current) showNext();
      } catch {}
    });
    es.onerror = () => { setConnected(false); };
    return () => { es.close(); if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line
  }, [settings.tvEnabled, settings.id]);

  useEffect(() => {
    if (settings.tvFullscreen) {
      const trigger = () => { const el = document.documentElement; if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen().catch(() => {}); document.removeEventListener('click', trigger); };
      document.addEventListener('click', trigger, { once: true });
    }
  }, [settings.tvFullscreen]);

  const bgStyle = settings.tvBackground ? { backgroundImage: `url(${settings.tvBackground})` } : {};
  const nameSize = FONT_SIZES[settings.tvFontSize] || FONT_SIZES.large;
  const anim = settings.tvAnimationEnabled ? 'tv-anim' : '';

  return (
    <div className="min-h-screen w-full bg-cover bg-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#1a0f08,#3a2418,#5a3820)', ...bgStyle }}>
      {settings.tvBackground && <div className="absolute inset-0 bg-black/40" />}
      <div className="absolute top-6 right-8 text-xs text-white/50 font-mono z-10">{connected ? '● LIVE' : '○ offline'}</div>
      {settings.tvLogo && <img src={settings.tvLogo} alt="Logo" className="absolute top-6 left-8 h-16 z-10" />}

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-12 text-white">
        {current ? (
          <div key={current.checkInId} className={`${anim} space-y-6 max-w-6xl`}>
            {current.selfieUrl && (
              <img src={current.selfieUrl} alt="Guest selfie" className="mx-auto h-40 w-40 rounded-full object-cover border-4 border-amber-200 shadow-2xl" />
            )}
            <p style={{ fontFamily: 'Great Vibes, cursive' }} className="text-6xl md:text-8xl text-amber-200">Welcome</p>
            <p style={{ fontFamily: 'Playfair Display, serif' }} className="text-3xl md:text-5xl tracking-widest">{current.brideName} &amp; {current.groomName}</p>
            <p style={{ fontFamily: 'Great Vibes, cursive' }} className="text-4xl md:text-6xl text-amber-100/90">Warmly Welcome</p>
            <p style={{ fontFamily: 'Playfair Display, serif', fontSize: nameSize }} className="font-bold leading-tight text-white break-words">{current.guestName}</p>
            <div className="grid grid-cols-2 gap-8 pt-6 max-w-2xl mx-auto">
              <div>
                <p className="text-sm uppercase tracking-widest text-amber-200/70">Attendees</p>
                <p className="text-4xl font-serif mt-1">{current.count} <span className="text-lg">{current.count > 1 ? 'People' : 'Person'}</span></p>
              </div>
              <div>
                <p className="text-sm uppercase tracking-widest text-amber-200/70">Category</p>
                <p className="text-4xl font-serif mt-1">{current.category || 'Guest'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className={`${anim} text-center`}>
            {settings.tvCouplePhoto && <img src={settings.tvCouplePhoto} alt="" className="mx-auto max-h-[50vh] rounded-3xl mb-8 shadow-2xl" />}
            <p style={{ fontFamily: 'Great Vibes, cursive' }} className="text-6xl md:text-8xl text-amber-200 mb-4">The Wedding of</p>
            <p style={{ fontFamily: 'Playfair Display, serif' }} className="text-4xl md:text-6xl tracking-widest">{settings.brideName} &amp; {settings.groomName}</p>
            {settings.venue && <p className="mt-6 text-xl text-white/70">{settings.venue}</p>}
            {settings.weddingDate && <p className="mt-2 text-lg text-white/60">{new Date(settings.weddingDate).toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>}
          </div>
        )}
      </div>

      {settings.tvSoundEnabled && <audio ref={audioRef} src="data:audio/wav;base64,UklGRoQCAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YWACAABmZmZmZmZmZg==" preload="auto" />}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Great+Vibes&display=swap');
        html, body { background: #1a0f08; margin: 0; }
        .tv-anim { animation: tvIn 900ms cubic-bezier(.2,.9,.2,1); }
        @keyframes tvIn { from { opacity: 0; transform: translateY(30px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
}
