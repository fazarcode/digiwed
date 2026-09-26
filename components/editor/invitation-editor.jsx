"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Info,
  CalendarDays,
  Palette,
  Images,
  Video,
  Music2,
  Send,
  ArrowLeft,
  Save,
  ExternalLink,
  Loader2,
  Copy as CopyIcon,
  Upload,
  Plus,
  Gift,
  Users,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import GalleryEditor from "./gallery-editor";
import VideoEditor from "./video-editor";
import MusicEditor from "./music-editor";
import GiftEditor from "./gift-editor";
import GiftEntriesEditor from "./gift-entries-editor";
import CategoriesEditor from "./categories-editor";
import SidesEditor from "./sides-editor";
import MomentsCustomizer from "./moments-customizer";
import RsvpFieldsEditor from "./rsvp-fields-editor";

const TABS = [
  { id: "basic", label: "Basic Info", icon: Info },
  { id: "event", label: "Event", icon: CalendarDays },
  // { id: "theme", label: "Theme", icon: Palette },
  { id: "gallery", label: "Gallery", icon: Images },
  { id: "video", label: "Video", icon: Video },
  { id: "music", label: "Music", icon: Music2 },
  { id: "gift", label: "Gift / Angpau", icon: Gift },
  { id: "categories", label: "Categories", icon: Users },
  { id: "guestsides", label: "Guest Sides", icon: Users },
  { id: "rsvp", label: "RSVP Fields", icon: MessageSquare },
  { id: "publish", label: "Publish", icon: Send },
];

export default function InvitationEditor({ invitation: initial, templates }) {
  const router = useRouter();
  const [tab, setTab] = useState("basic");
  const [inv, setInv] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const debounceRef = useRef(null);

  const previewUrl = `/invite/${inv.slug}?preview=1&t=${iframeKey}`;
  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/invite/${inv.slug}`;

  const update = (patch) => {
    setInv((prev) => ({ ...prev, ...patch }));
  };

  const persist = useCallback(
    async (patch) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/invitations/${inv.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error("Save failed");
        setIframeKey((k) => k + 1); // refresh preview
      } catch (e) {
        toast.error(e.message);
      } finally {
        setSaving(false);
      }
    },
    [inv.id],
  );

  const scheduleSave = (patch) => {
    setInv((prev) => ({ ...prev, ...patch }));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => persist(patch), 700);
  };

  useEffect(
    () => () => debounceRef.current && clearTimeout(debounceRef.current),
    [],
  );

  const saveSlug = async (newSlug) => {
    const res = await fetch(`/api/invitations/${inv.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: newSlug }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed to update slug");
      return false;
    }
    update({ slug: data.invitation.slug });
    setIframeKey((k) => k + 1);
    toast.success("Slug updated");
    return data.invitation.slug;
  };

  const publishToggle = async () => {
    const target = inv.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    const res = await fetch(`/api/invitations/${inv.id}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: target }),
    });
    if (!res.ok) return toast.error("Failed");
    update({ status: target });
    setIframeKey((k) => k + 1);
    toast.success(
      target === "PUBLISHED"
        ? "Published! Invitation is now live."
        : "Unpublished",
    );
  };

  return (
    <div className="-m-6 md:-m-8 h-[calc(100vh-4rem)] flex">
      {/* Editor sidebar */}
      <div className="w-72 flex-shrink-0 bg-white border-r border-primary/10 flex flex-col">
        <div className="p-4 border-b border-primary/10">
          <Link
            href="/dashboard/invitations"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
          <p className="font-serif text-lg font-semibold">
            {inv.brideName || "Bride"} &amp; {inv.groomName || "Groom"}
          </p>
          <span
            className={`inline-block text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full mt-1 ${inv.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
          >
            {inv.status}
          </span>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-left",
                tab === t.id
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-foreground/70 hover:bg-muted",
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-primary/10 text-xs text-muted-foreground flex items-center gap-2">
          {saving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving…
            </>
          ) : (
            <>All changes saved</>
          )}
        </div>
      </div>

      {/* Editor content */}
      <div className="w-[420px] flex-shrink-0 border-r border-primary/10 overflow-y-auto scrollbar-thin bg-white">
        <div className="p-6 space-y-4">
          {tab === "basic" && <BasicForm inv={inv} onChange={scheduleSave} />}
          {tab === "event" && <EventForm inv={inv} onChange={scheduleSave} />}
          {tab === "gallery" && (
            <GalleryEditor
              invitationId={inv.id}
              initial={inv.gallery || []}
              onChange={() => setIframeKey((k) => k + 1)}
            />
          )}
          {tab === "video" && (
            <VideoEditor
              invitationId={inv.id}
              initial={inv.videos || []}
              onChange={() => setIframeKey((k) => k + 1)}
            />
          )}
          {tab === "music" && (
            <MusicEditor
              invitationId={inv.id}
              initial={inv.music}
              onChange={() => setIframeKey((k) => k + 1)}
            />
          )}
          {tab === "gift" && (
            <GiftEditor
              invitationId={inv.id}
              onChange={() => setIframeKey((k) => k + 1)}
            />
          )}
          {tab === "giftlog" && null}
          {tab === "categories" && <CategoriesEditor invitationId={inv.id} />}
          {tab === "guestsides" && <SidesEditor invitationId={inv.id} />}
          {tab === "moments" && null}
          {tab === "rsvp" && <RsvpFieldsEditor invitationId={inv.id} />}
          {tab === "publish" && (
            <PublishTab
              inv={inv}
              publicUrl={publicUrl}
              onToggle={publishToggle}
              onSaveSlug={saveSlug}
            />
          )}
        </div>
      </div>

      {/* Live preview */}
      <div className="flex-1 bg-[#F8F5F0] flex flex-col">
        <div className="h-12 flex items-center justify-between px-4 bg-white border-b border-primary/10">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Live Preview
          </span>
          <div className="flex items-center gap-2">
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener"
              className="text-xs text-primary flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Open in new tab
            </a>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-[430px] h-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-primary/10">
            <iframe
              key={iframeKey}
              src={previewUrl}
              className="w-full h-full"
              title="Preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function BasicForm({ inv, onChange }) {
  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-semibold">Basic Information</h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Bride Name</Label>
          <Input
            value={inv.brideName || ""}
            onChange={(e) => onChange({ brideName: e.target.value })}
          />
        </div>
        <div>
          <Label>Groom Name</Label>
          <Input
            value={inv.groomName || ""}
            onChange={(e) => onChange({ groomName: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pb-4 border-b border-primary/10">
        <ImagePicker
          label="Bride Photo"
          value={inv.bridePhoto}
          onChange={(url) => onChange({ bridePhoto: url })}
          shape="circle"
        />
        <ImagePicker
          label="Groom Photo"
          value={inv.groomPhoto}
          onChange={(url) => onChange({ groomPhoto: url })}
          shape="circle"
        />
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Parents (shown on the invitation, built from father &amp; mother below)</Label>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <Label>Groom's Father</Label>
          <Input
            value={inv.groomFather || ""}
            onChange={(e) => onChange({ groomFather: e.target.value })}
            placeholder="Father's name"
          />
        </div>
        <div>
          <Label>Groom's Mother</Label>
          <Input
            value={inv.groomMother || ""}
            onChange={(e) => onChange({ groomMother: e.target.value })}
            placeholder="Mother's name"
          />
        </div>
        <div>
          <Label>Bride's Father</Label>
          <Input
            value={inv.brideFather || ""}
            onChange={(e) => onChange({ brideFather: e.target.value })}
            placeholder="Father's name"
          />
        </div>
        <div>
          <Label>Bride's Mother</Label>
          <Input
            value={inv.brideMother || ""}
            onChange={(e) => onChange({ brideMother: e.target.value })}
            placeholder="Mother's name"
          />
        </div>
      </div>
      <div>
        <Label>Quote</Label>
        <Textarea
          rows={3}
          value={inv.quote || ""}
          onChange={(e) => onChange({ quote: e.target.value })}
          placeholder="A meaningful quote or verse"
        />
      </div>

      <div className="pt-2">
        <div className="mb-2">
          <Label>Love Story Timeline</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Bagikan cerita cinta Anda berdasarkan urutan waktu.
          </p>
        </div>
        <LoveStoryEditor
          items={Array.isArray(inv.loveStory) ? inv.loveStory : []}
          onChange={(newStories) => onChange({ loveStory: newStories })}
        />
      </div>

      <ImagePicker
        label="Cover Image"
        value={inv.coverImage}
        onChange={(url) => onChange({ coverImage: url })}
        shape="rectangle"
      />
    </div>
  );
}

function EventForm({ inv, onChange }) {
  const currentEvents = Array.isArray(inv.events) ? inv.events : [];

  const updateItem = (index, field, value) => {
    const newEvents = [...currentEvents];
    newEvents[index] = { ...newEvents[index], [field]: value };
    onChange({ events: newEvents });
  };

  const addItem = () => {
    const newItem = {
      id: Date.now().toString(),
      title: "",
      date: "",
      time: "",
      venue: "",
      address: "",
      mapUrl: "",
    };
    onChange({ events: [...currentEvents, newItem] });
  };

  const removeItem = (index) => {
    const newEvents = currentEvents.filter((_, i) => i !== index);
    onChange({ events: newEvents });
  };

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-xl font-semibold">Wedding Events</h2>

      <div className="space-y-4">
        {currentEvents.map((ev, index) => (
          <div
            key={ev.id || index}
            className="p-4 border rounded-xl bg-gray-50/50 space-y-3 relative group"
          >
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-7 w-7"
                onClick={() => removeItem(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div>
              <Label className="text-xs">Event Title</Label>
              <Input
                value={ev.title || ""}
                onChange={(e) => updateItem(index, "title", e.target.value)}
                placeholder="e.g. Akad Nikah / Reception"
                className="h-8 text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={ev.date || ""}
                  onChange={(e) => updateItem(index, "date", e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Time</Label>
                <Input
                  value={ev.time || ""}
                  onChange={(e) => updateItem(index, "time", e.target.value)}
                  placeholder="08:00 AM - Finish"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Venue Name</Label>
              <Input
                value={ev.venue || ""}
                onChange={(e) => updateItem(index, "venue", e.target.value)}
                placeholder="The Grand Ballroom"
                className="h-8 text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Full Address</Label>
              <Textarea
                rows={2}
                value={ev.address || ""}
                onChange={(e) => updateItem(index, "address", e.target.value)}
                placeholder="Full address of the venue"
                className="text-sm"
              />
            </div>

            <div>
              <Label className="text-xs">Google Maps URL</Label>
              <Input
                value={ev.mapUrl || ""}
                onChange={(e) => updateItem(index, "mapUrl", e.target.value)}
                placeholder="https://maps.google.com/..."
                className="h-8 text-sm"
              />
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          className="w-full border-dashed"
          onClick={addItem}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Event (Akad / Resepsi)
        </Button>
      </div>

      <div className="pt-4 border-t space-y-3">
        <h3 className="font-serif text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Check-in & RSVP Settings
        </h3>
        <div>
          <Label>RSVP Mode</Label>
          <select
            value={inv.rsvpMode || "QR_FIRST"}
            onChange={(e) => onChange({ rsvpMode: e.target.value })}
            className="w-full h-10 px-3 rounded-md border text-sm"
          >
            <option value="QR_FIRST">
              QR First — Show QR code immediately, RSVP is optional
            </option>
            <option value="RSVP_FIRST">
              RSVP First — Guest must submit RSVP before QR is shown
            </option>
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            Applies when guests open their personalized invitation link.
          </p>
        </div>
        <div className="flex items-start gap-3 rounded-lg border p-3">
          <input
            type="checkbox"
            checked={!!inv.selfieVerification}
            onChange={(e) => onChange({ selfieVerification: e.target.checked })}
            className="mt-1 h-4 w-4"
            id="selfie-check"
          />
          <label
            htmlFor="selfie-check"
            className="text-sm flex-1 cursor-pointer"
          >
            <span className="font-medium">
              Enable Selfie Verification at Check-in
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Operator must capture a live selfie of the guest before completing
              check-in. Recommended for VIP events.
            </p>
          </label>
        </div>
      </div>
    </div>
  );
}

function PublishTab({ inv, publicUrl, onToggle, onSaveSlug }) {
  const copy = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link copied");
  };
  const [slug, setSlug] = useState(inv.slug);
  const [savingSlug, setSavingSlug] = useState(false);
  useEffect(() => { setSlug(inv.slug); }, [inv.slug]);
  const doSaveSlug = async () => {
    setSavingSlug(true);
    const result = await onSaveSlug(slug);
    if (result) setSlug(result);
    setSavingSlug(false);
  };
  return (
    <div className="space-y-5">
      <h2 className="font-serif text-xl font-semibold">Publish</h2>
      <div
        className={`rounded-xl p-5 border ${inv.status === "PUBLISHED" ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}
      >
        <p className="font-medium">
          {inv.status === "PUBLISHED"
            ? "✨ Your invitation is live!"
            : "Invitation not published"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {inv.status === "PUBLISHED"
            ? "Anyone with the link can view it."
            : "Publish to allow guests to view and RSVP."}
        </p>
      </div>

      <div>
        <Label>Custom URL Slug</Label>
        <div className="flex gap-2 mt-1">
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="my-wedding-2026"
            className="font-mono text-xs"
          />
          <Button variant="outline" onClick={doSaveSlug} disabled={savingSlug || !slug || slug === inv.slug}>
            {savingSlug ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Lowercase, hyphenated, and unique. Changing this changes your public link.
        </p>
      </div>

      <div>
        <Label>Public URL</Label>
        <div className="flex gap-2 mt-1">
          <Input value={publicUrl} readOnly className="font-mono text-xs" />
          <Button variant="outline" onClick={copy}>
            <CopyIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Button
        onClick={onToggle}
        className={
          inv.status === "PUBLISHED" ? "bg-amber-600" : "bg-emerald-600"
        }
      >
        <Send className="h-4 w-4 mr-2" />
        {inv.status === "PUBLISHED" ? "Unpublish" : "Publish Now"}
      </Button>
      <div className="pt-4 border-t">
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener"
          className="text-sm text-primary flex items-center gap-1"
        >
          <ExternalLink className="h-4 w-4" />
          Open public invitation
        </a>
      </div>
    </div>
  );
}

// --- KOMPONEN BANTUAN ---

function ImagePicker({
  label,
  value,
  onChange,
  shape = "circle",
  placeholder = "https://...",
}) {
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [value]);

  const uploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "image");

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Upload failed");

      onChange(data.url);
      toast.success("Foto berhasil diunggah");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {value && (
        <div className="relative inline-block">
          <img
            src={
              imgError ? "https://via.placeholder.com/150?text=Error" : value
            }
            alt="Preview"
            className={cn(
              "object-cover border border-primary/20 shadow-sm",
              shape === "circle"
                ? "w-16 h-16 rounded-full"
                : "w-full h-32 rounded-lg",
            )}
            onError={() => setImgError(true)}
          />
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="text-xs flex-1"
        />
        <label className="cursor-pointer flex-shrink-0">
          <Button asChild variant="outline" size="sm" disabled={uploading}>
            <span>
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
            </span>
          </Button>
          <input type="file" accept="image/*" hidden onChange={uploadFile} />
        </label>
      </div>
    </div>
  );
}

function LoveStoryEditor({ items, onChange }) {
  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    onChange(newItems);
  };

  const addItem = () => {
    const newItem = {
      id: Date.now().toString(),
      date: "",
      title: "",
      story: "",
    };
    onChange([...items, newItem]);
  };

  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div
          key={item.id || index}
          className="p-4 border rounded-xl bg-gray-50/50 space-y-3 relative group"
        >
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="h-7 w-7"
              onClick={() => removeItem(index)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 pr-8">
            <div>
              <Label className="text-xs">Date / Year</Label>
              <Input
                value={item.date || ""}
                onChange={(e) => updateItem(index, "date", e.target.value)}
                placeholder="e.g. Dec 2020"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Title</Label>
              <Input
                value={item.title || ""}
                onChange={(e) => updateItem(index, "title", e.target.value)}
                placeholder="e.g. First Met"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Story</Label>
            <Textarea
              rows={3}
              value={item.story || ""}
              onChange={(e) => updateItem(index, "story", e.target.value)}
              placeholder="Tell this part of the story..."
              className="text-sm"
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        className="w-full border-dashed"
        onClick={addItem}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Story Part
      </Button>
    </div>
  );
}
