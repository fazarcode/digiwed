"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ShieldOff,
  ShieldCheck,
  KeyRound,
  Trash2,
  Pencil,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function UsersTable({ initialUsers, packages = [], templates = [] }) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [newPwd, setNewPwd] = useState("");

  const filtered = useMemo(
    () =>
      users.filter(
        (u) =>
          !q ||
          u.name.toLowerCase().includes(q.toLowerCase()) ||
          u.email.toLowerCase().includes(q.toLowerCase()),
      ),
    [q, users],
  );

  const action = async (id, action, body = {}) => {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: action === "delete" ? "DELETE" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data.error || "Action failed");
    toast.success("Done");
    router.refresh();
    // Update local state optimistically for status
    setUsers((us) =>
      us
        .map((u) => (u.id === id ? { ...u, ...data.user } : u))
        .filter((u) => action !== "delete" || u.id !== id),
    );
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      action: "edit",
      name: fd.get("name"),
      email: fd.get("email"),
      role: fd.get("role"),
    };
    await action(editing.id, "edit", body);
    setEditing(null);
  };
  const submitReset = async () => {
    if (newPwd.length < 6)
      return toast.error("Password must be at least 6 characters");
    await action(resetting.id, "reset", { password: newPwd });
    setResetting(null);
    setNewPwd("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search users…"
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filtered.length} of {users.length}
        </div>
      </div>

      <div className="rounded-2xl border border-primary/10 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Package</th>
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Invitations</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-primary/5">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-semibold">
                      {u.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${u.role === "ADMIN" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.packageId || ""}
                    onChange={(e) => action(u.id, "assignPackage", { packageId: e.target.value || null })}
                    className="text-xs h-8 rounded-md border px-2 bg-white"
                  >
                    <option value="">— None —</option>
                    {packages.map((pk) => (
                      <option key={pk.id} value={pk.id}>{pk.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.templateId || ""}
                    onChange={(e) => action(u.id, "assignTemplate", { templateId: e.target.value || null })}
                    className="text-xs h-8 rounded-md border px-2 bg-white"
                    data-testid={`user-template-${u.id}`}
                  >
                    <option value="">— None —</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">{u.invitationCount}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${u.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : u.status === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {format(new Date(u.createdAt), "dd/MM/yyyy")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditing(u)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {u.status === "ACTIVE" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => action(u.id, "suspend")}
                        title="Suspend"
                      >
                        <ShieldOff className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => action(u.id, "activate")}
                        title="Activate"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setResetting(u)}
                      title="Reset Password"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (
                          confirm(`Delete ${u.email}? This cannot be undone.`)
                        )
                          action(u.id, "delete");
                      }}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan="8"
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details</DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={submitEdit} className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input name="name" defaultValue={editing.name} required />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  name="email"
                  type="email"
                  defaultValue={editing.email}
                  required
                />
              </div>
              <div>
                <Label>Role</Label>
                <select
                  name="role"
                  defaultValue={editing.role}
                  className="w-full h-10 px-3 rounded-md border"
                >
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetting} onOpenChange={(o) => !o && setResetting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set new password for {resetting?.email}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>New Password</Label>
            <Input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              minLength={6}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResetting(null);
                setNewPwd("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={submitReset}>Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
