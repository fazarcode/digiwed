'use client';
import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Camera, Upload, CheckCircle2, RefreshCw, Images, X } from 'lucide-react';
import MomentsHero from './moments-hero';

// Req 9B — camera-only capture (no file input). Req 9C — public gallery of submitted photos.
export default function PublicMomentsUpload({ invitation }) {
  const [captures, setCaptures] = useState([]); // { blob, url }
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(0);
  const [camOn, setCamOn] = useState(false);
  const [camError, setCamError] = useState('');
  const [view, setView] = useState('capture'); // capture | gallery
  const [gallery, setGallery] = useState([]);
  const [galLoading, setGalLoading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    setCamError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      streamRef.current = stream;
      setCamOn(true);
      // wait a tick for the <video> to mount
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); } }, 50);
    } catch (e) {
      setCamError('Unable to access the camera. Please allow camera permission and use a device with a camera.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setCamOn(false);
  };

  useEffect(() => () => stopCamera(), []);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setCaptures((prev) => [...prev, { blob, url }]);
    }, 'image/jpeg', 0.9);
  };

  const removeCapture = (i) => setCaptures((prev) => prev.filter((_, idx) => idx !== i));

  const upload = async () => {
    if (!captures.length) return toast.error('Capture at least one photo');
    setUploading(true);
    try {
      const fd = new FormData();
      captures.forEach((c, i) => fd.append('files', c.blob, `capture-${Date.now()}-${i}.jpg`));
      fd.append('capture', '1');
      if (senderName.trim()) fd.append('senderName', senderName.trim());
      if (message.trim()) fd.append('message', message.trim());
      const res = await fetch(`/api/moments/${invitation.slug}`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setDone(data.count);
      setCaptures([]);
      toast.success(`Shared ${data.count} photo${data.count > 1 ? 's' : ''}!`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const loadGallery = async () => {
    setGalLoading(true);
    try {
      const res = await fetch(`/api/moments/${invitation.slug}?gallery=1`);
      const data = await res.json();
      if (res.ok) setGallery(data.items || []);
    } catch {} finally { setGalLoading(false); }
  };

  const openGallery = () => { setView('gallery'); stopCamera(); loadGallery(); };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAF7F2] via-[#F5EFE4] to-[#FAF7F2]">
      <MomentsHero invitation={invitation} />
      <div className="container max-w-xl mx-auto px-4 py-8 space-y-6">
        <div className="flex gap-1 rounded-lg border border-primary/15 bg-white p-1 w-fit mx-auto">
          <button type="button" data-testid="moments-tab-capture" onClick={() => setView('capture')} className={`flex items-center gap-1 px-4 py-2 rounded-md text-sm font-medium ${view === 'capture' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}><Camera className="h-4 w-4" />Capture</button>
          <button type="button" data-testid="moments-tab-gallery" onClick={openGallery} className={`flex items-center gap-1 px-4 py-2 rounded-md text-sm font-medium ${view === 'gallery' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}><Images className="h-4 w-4" />Gallery</button>
        </div>

        {view === 'capture' && (
          <>
            {done > 0 && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3" data-testid="moments-upload-success">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div><p className="font-semibold text-emerald-800">Thank you!</p><p className="text-sm text-emerald-700">{done} photo{done > 1 ? 's' : ''} shared. Capture more anytime!</p></div>
              </div>
            )}

            <div className="rounded-2xl bg-white border border-primary/10 p-5 space-y-4">
              <div>
                <Label>Camera</Label>
                <div className="mt-1 rounded-xl overflow-hidden border-2 border-dashed border-primary/30 bg-black/5 aspect-video flex items-center justify-center relative">
                  {camOn ? (
                    <video ref={videoRef} playsInline muted className="w-full h-full object-cover" data-testid="moments-video" />
                  ) : (
                    <div className="text-center p-6">
                      <Camera className="h-8 w-8 text-primary mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Camera is off. Photos can only be captured live — file uploads are disabled.</p>
                    </div>
                  )}
                </div>
                {camError && <p className="text-xs text-red-600 mt-1" data-testid="moments-cam-error">{camError}</p>}
                <div className="flex gap-2 mt-2">
                  {!camOn ? (
                    <Button type="button" className="flex-1 bg-primary" onClick={startCamera} data-testid="moments-start-camera"><Camera className="h-4 w-4 mr-1" />Start Camera</Button>
                  ) : (
                    <>
                      <Button type="button" className="flex-1 bg-primary" onClick={capture} data-testid="moments-capture-btn"><Camera className="h-4 w-4 mr-1" />Capture</Button>
                      <Button type="button" variant="outline" onClick={stopCamera} data-testid="moments-stop-camera">Stop</Button>
                    </>
                  )}
                </div>
              </div>

              {captures.length > 0 && (
                <div className="grid grid-cols-3 gap-2" data-testid="moments-captures">
                  {captures.map((c, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border">
                      <img src={c.url} className="w-full h-full object-cover" />
                      <button onClick={() => removeCapture(i)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-6 h-6 text-xs">×</button>
                    </div>
                  ))}
                </div>
              )}

              <div><Label>Your Name (optional)</Label><Input data-testid="sender-name-input" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Alex" /></div>
              <div><Label>Leave a Message (optional)</Label><Textarea data-testid="sender-message-input" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Congratulations and best wishes!" /></div>

              <Button className="w-full bg-primary h-12 text-base" onClick={upload} disabled={uploading || !captures.length} data-testid="upload-submit-btn">
                <Upload className="h-4 w-4 mr-2" />{uploading ? 'Sharing…' : `Share ${captures.length || ''} Photo${captures.length > 1 ? 's' : ''}`.replace(/  +/g, ' ')}
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">No account or login required. Photos are captured live and shared to the public gallery.</p>
          </>
        )}

        {view === 'gallery' && (
          <div className="rounded-2xl bg-white border border-primary/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="font-serif text-lg font-semibold">Guest Gallery</p>
              <Button size="sm" variant="outline" onClick={loadGallery} data-testid="moments-gallery-refresh"><RefreshCw className="h-3.5 w-3.5 mr-1" />Refresh</Button>
            </div>
            {galLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Loading…</p>
            ) : gallery.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8" data-testid="moments-gallery-empty">No photos yet. Be the first to capture a moment!</p>
            ) : (
              <div className="grid grid-cols-3 gap-2" data-testid="moments-gallery-grid">
                {gallery.map((m, i) => (
                  <button key={i} onClick={() => setLightbox(m)} className="relative aspect-square rounded-lg overflow-hidden border group">
                    <img src={m.url} className="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)} data-testid="moments-lightbox">
          <button className="absolute top-4 right-4 text-white"><X className="h-6 w-6" /></button>
          <div className="max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.url} className="w-full rounded-xl" />
            {(lightbox.senderName || lightbox.message) && (
              <div className="mt-3 text-center text-white">
                {lightbox.senderName && <p className="font-semibold">{lightbox.senderName}</p>}
                {lightbox.message && <p className="text-sm text-white/80">{lightbox.message}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
