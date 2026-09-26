"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import MomentsCustomizer from "@/components/editor/moments-customizer";
import {
  Trash2,
  Download,
  QrCode as QrIcon,
  Copy,
  ExternalLink,
  Camera,
} from "lucide-react";

export default function MomentsClient({ invitations }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(invitations[0]?.id || "");
  const selected = useMemo(
    () => invitations.find((i) => i.id === selectedId),
    [invitations, selectedId],
  );
  const [showQr, setShowQr] = useState(false);
  const [zoom, setZoom] = useState(null);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const publicUrl = selected ? `${origin}/moments/${selected.slug}` : "";

  const del = async (mid) => {
    if (!confirm("Delete this photo? This cannot be undone.")) return;
    const res = await fetch(`/api/invitations/${selected.id}/moments/${mid}`, {
      method: "DELETE",
    });
    if (!res.ok) return toast.error("Failed to delete");
    toast.success("Photo removed");
    router.refresh();
  };

  const downloadAll = () => {
    if (!selected) return;
    window.open(
      `/api/invitations/${selected.id}/moments/download-all`,
      "_blank",
    );
  };

  const copyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Upload link copied");
  };

  if (invitations.length === 0) {
    return (
      <div className="rounded-2xl bg-white border p-12 text-center">
        <p className="text-muted-foreground">
          Create an invitation first, then guests can upload moments.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-4">
      <div className="lg:col-span-1 rounded-2xl bg-white border p-4 space-y-1 h-fit">
        <p className="text-xs uppercase tracking-widest text-muted-foreground px-2 pb-2">
          Your Invitations
        </p>
        {invitations.map((i) => (
          <button
            key={i.id}
            data-testid={`moments-inv-${i.id}`}
            onClick={() => setSelectedId(i.id)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${selectedId === i.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <p className="font-medium">
              {i.brideName} & {i.groomName}
            </p>
            <p className="text-xs opacity-70">{i.moments.length} photos</p>
          </button>
        ))}
      </div>

      <div className="lg:col-span-3 space-y-4">
        {selected && (
          <div className="rounded-2xl bg-white border p-5" data-testid="moments-customize-card">
            <MomentsCustomizer inv={selected} />
          </div>
        )}
        <div className="rounded-2xl bg-white border p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Public Upload URL
            </p>
            <p
              className="font-mono text-sm truncate max-w-[420px]"
              data-testid="moments-public-url"
            >
              {publicUrl}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={copyLink}
              data-testid="copy-moments-link"
            >
              <Copy className="h-4 w-4 mr-1.5" />
              Copy Link
            </Button>
            <a href={publicUrl} target="_blank">
              <Button variant="outline">
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Preview
              </Button>
            </a>
            <Button
              variant="outline"
              onClick={() => setShowQr(true)}
              data-testid="show-moments-qr"
            >
              <QrIcon className="h-4 w-4 mr-1.5" />
              Show QR
            </Button>
            <Button
              className="bg-primary"
              onClick={downloadAll}
              disabled={!selected?.moments?.length}
              data-testid="download-all-moments"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Download All
            </Button>
          </div>
        </div>

        <div className="rounded-2xl bg-white border p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
            {selected?.moments?.length || 0} photos
          </p>
          {selected?.moments?.length ? (
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {selected.moments.map((m) => (
                <div
                  key={m.id}
                  className="group rounded-xl border border-primary/10 overflow-hidden bg-muted/20"
                  data-testid={`moment-${m.id}`}
                >
                  <button
                    onClick={() => setZoom(m)}
                    className="block w-full aspect-square bg-black/5"
                  >
                    <img
                      src={m.url}
                      alt={m.senderName || "Guest photo"}
                      className="w-full h-full object-cover"
                    />
                  </button>
                  <div className="p-2 text-xs">
                    <p className="font-medium truncate">
                      {m.senderName || "Anonymous"}
                    </p>
                    <p className="text-muted-foreground">
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                    {m.message && (
                      <p className="italic mt-1 line-clamp-2">"{m.message}"</p>
                    )}
                    <div className="flex justify-between pt-2">
                      <a href={m.url} download>
                        <Button size="sm" variant="ghost">
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => del(m.id)}
                        data-testid={`delete-moment-${m.id}`}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Camera className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>
                No moments yet — share the QR code with your guests at the
                venue.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* QR dialog */}
      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Event Moments QR</DialogTitle>
            <DialogDescription>
              Guests can scan this to upload photos — no login required.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3">
              <img
                src={`/api/invitations/${selected.id}/moments-qr`}
                alt="Moments QR"
                className="w-full rounded-lg border"
              />
              <p className="text-xs text-muted-foreground text-center break-all">
                {publicUrl}
              </p>
              <a href={`/api/invitations/${selected.id}/moments-qr`} download>
                <Button className="w-full bg-primary">
                  <Download className="h-4 w-4 mr-1.5" />
                  Download QR
                </Button>
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Photo zoom dialog */}
      <Dialog open={!!zoom} onOpenChange={(o) => !o && setZoom(null)}>
        <DialogContent className="max-w-3xl">
          {zoom && (
            <>
              <DialogHeader>
                <DialogTitle>{zoom.senderName || "Anonymous"}</DialogTitle>
                <DialogDescription>
                  {new Date(zoom.createdAt).toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              <img src={zoom.url} alt="Moment" className="w-full rounded-lg" />
              {zoom.message && (
                <p className="italic text-sm">"{zoom.message}"</p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
