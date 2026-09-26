"use client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy, Trash2, Send, PowerOff } from "lucide-react";
import { toast } from "sonner";

export default function InvitationRowActions({ invitation }) {
  const router = useRouter();
  const action = async (op) => {
    if (
      op === "delete" &&
      !confirm("Delete this invitation? This cannot be undone.")
    )
      return;
    const url =
      op === "duplicate"
        ? `/api/invitations/${invitation.id}/duplicate`
        : op === "publish" || op === "unpublish"
          ? `/api/invitations/${invitation.id}/publish`
          : `/api/invitations/${invitation.id}`;
    const method =
      op === "delete"
        ? "DELETE"
        : op === "duplicate"
          ? "POST"
          : op === "publish" || op === "unpublish"
            ? "POST"
            : "PATCH";
    const body =
      op === "publish"
        ? JSON.stringify({ status: "PUBLISHED" })
        : op === "unpublish"
          ? JSON.stringify({ status: "DRAFT" })
          : undefined;
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body,
    });
    if (!res.ok) return toast.error("Action failed");
    toast.success(
      op === "publish"
        ? "Published!"
        : op === "unpublish"
          ? "Unpublished"
          : op === "duplicate"
            ? "Duplicated"
            : "Deleted",
    );
    router.refresh();
  };
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => action("duplicate")}>
        <Copy className="h-3.5 w-3.5" />
      </Button>
      {invitation.status === "PUBLISHED" ? (
        <Button size="sm" variant="outline" onClick={() => action("unpublish")}>
          <PowerOff className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="bg-emerald-50 border-emerald-200"
          onClick={() => action("publish")}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={() => action("delete")}>
        <Trash2 className="h-3.5 w-3.5 text-red-600" />
      </Button>
    </>
  );
}
