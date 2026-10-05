"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Star, Send, Loader2 } from "lucide-react";

const LABELS = [
  "",
  "Kurang puas",
  "Cukup",
  "Baik",
  "Sangat baik",
  "Luar biasa",
];

export default function OwnerRatingForm({
  initial,
  coupleName,
  endpoint = "/api/ratings",
}) {
  const [item, setItem] = useState(initial || null);
  const [rating, setRating] = useState(initial?.rating || 0);
  const [hover, setHover] = useState(0);
  const [text, setText] = useState(initial?.text || "");
  const [busy, setBusy] = useState(false);

  const dirty = !item || item.rating !== rating || item.text !== text;

  const submit = async () => {
    if (!rating) return toast.error("Pilih jumlah bintang terlebih dahulu");
    if (!text.trim())
      return toast.error("Tulis testimoni Anda terlebih dahulu");
    setBusy(true);
    try {
      const res = await fetch(item ? `${endpoint}/${item.id}` : endpoint, {
        method: item ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      setItem(data.item);
      toast.success(
        item ? "Rating diperbarui" : "Terima kasih atas rating Anda!",
      );
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const shown = hover || rating;

  return (
    <div className="max-w-xl rounded-2xl bg-white border p-6 space-y-5">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Rating dari
        </p>
        <p
          className="font-serif text-2xl font-semibold mt-1"
          data-testid="rating-couple-name"
        >
          {coupleName}
        </p>
      </div>

      <div className="space-y-2">
        <Label>Seberapa puas Anda dengan layanan kami?</Label>
        <div
          className="flex items-center gap-1"
          onMouseLeave={() => setHover(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              data-testid={`rating-star-${n}`}
              onMouseEnter={() => setHover(n)}
              onClick={() => setRating(n)}
              className="p-1 transition-transform hover:scale-110"
              aria-label={`${n} bintang`}
            >
              <Star
                className={`h-8 w-8 ${n <= shown ? "text-amber-500" : "text-muted-foreground/30"}`}
                fill={n <= shown ? "currentColor" : "none"}
              />
            </button>
          ))}
          <span className="ml-2 text-sm text-muted-foreground">
            {LABELS[shown]}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Testimoni</Label>
        <Textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Ceritakan pengalaman Anda memakai undangan digital ini…"
          data-testid="rating-text"
        />
        <p className="text-xs text-muted-foreground text-right">
          {text.length}/500
        </p>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {item
            ? "Anda sudah memberi rating. Anda masih bisa mengubahnya."
            : "Rating hanya bisa dikirim satu kali."}
        </p>
        <Button
          onClick={submit}
          disabled={busy || !dirty}
          className="bg-primary"
          data-testid="rating-submit"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-1.5" />
          )}
          {item ? "Perbarui Rating" : "Kirim Rating"}
        </Button>
      </div>
    </div>
  );
}
