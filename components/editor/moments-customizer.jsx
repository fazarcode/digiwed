"use client";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import MomentsHero from "@/components/moments/moments-hero";

// Req 9A — owner customization of the Photo Moments landing with immediate live preview.
export default function MomentsCustomizer({ inv }) {
  const [form, setForm] = useState({
    momentsTitle: inv.momentsTitle || "",
    momentsMessage: inv.momentsMessage || "",
  });
  const timer = useRef(null);

  const persist = (patch) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/invitations/${inv.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!r.ok) throw new Error();
      } catch { toast.error("Save failed"); }
    }, 500);
  };
  const update = (patch) => { setForm((f) => ({ ...f, ...patch })); persist(patch); };
  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  const previewInv = {
    brideName: inv.brideName, groomName: inv.groomName, coverImage: inv.coverImage,
    venue: inv.venue, momentsTitle: form.momentsTitle, momentsMessage: form.momentsMessage,
  };

  return (
    <div className="space-y-4" data-testid="moments-customizer">
      <div>
        <h2 className="font-serif text-xl font-semibold">Photo Moments Page</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Customize the guest-facing photo capture landing. Changes preview instantly below.</p>
      </div>
      <div>
        <Label>Heading</Label>
        <Input value={form.momentsTitle} onChange={(e) => update({ momentsTitle: e.target.value })} placeholder="Event Moments" data-testid="moments-title-input" />
      </div>
      <div>
        <Label>Welcome Message</Label>
        <Textarea rows={3} value={form.momentsMessage} onChange={(e) => update({ momentsMessage: e.target.value })} placeholder="Share the memories you captured today…" data-testid="moments-message-input" />
      </div>
      <a href={`/moments/${inv.slug}`} target="_blank" rel="noopener" className="text-xs text-primary inline-flex items-center gap-1"><ExternalLink className="h-3 w-3" />Open public page</a>

      <div className="pt-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Live Preview</p>
        <div className="rounded-2xl border overflow-hidden bg-gradient-to-b from-[#FAF7F2] to-[#F5EFE4] pb-6" data-testid="moments-live-preview">
          <MomentsHero invitation={previewInv} />
        </div>
      </div>
    </div>
  );
}
