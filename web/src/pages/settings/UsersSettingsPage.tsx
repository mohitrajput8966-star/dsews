import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const ROLES = [
  "ADMIN",
  "SUPPLY_CHAIN_MANAGER",
  "PHARMACY_MANAGER",
  "PROCUREMENT_OFFICER",
  "WAREHOUSE_MANAGER",
  "HOSPITAL_ADMIN",
  "EXECUTIVE",
];

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  locationId: string | null;
  locationName: string | null;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export default function UsersSettingsPage() {
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data } = useQuery({ queryKey: ["users"], queryFn: async () => (await api.get("/users")).data });
  const { data: locData } = useQuery({ queryKey: ["locations"], queryFn: async () => (await api.get("/locations")).data });

  const [form, setForm] = useState({ name: "", email: "", role: "PHARMACY_MANAGER", locationId: "", password: "Demo@123" });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => api.post("/users", { ...form, locationId: form.locationId || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setForm({ name: "", email: "", role: "PHARMACY_MANAGER", locationId: "", password: "Demo@123" });
      setError(null);
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => api.patch(`/users/${id}`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const users: UserRow[] = data?.users ?? [];
  const locations: { id: string; name: string }[] = locData?.locations ?? [];

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="text-xl font-semibold">Settings — Users</h1>

      <Card>
        <CardHeader>
          <CardTitle>Add User</CardTitle>
          <CardDescription>
            Academic prototype: no invitation email is sent. Share the email and initial password with the new user directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="grid grid-cols-12 gap-3"
          >
            <div className="col-span-3 space-y-1.5">
              <Label className="text-xs">Full Name</Label>
              <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="col-span-3 space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs">Location</Label>
              <Select value={form.locationId} onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value }))}>
                <option value="">None</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-2 flex items-end">
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                Add User
              </Button>
            </div>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">Initial password defaults to Demo@123 for this prototype.</p>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2">Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Location</th>
                <th>Status</th>
                <th>Created</th>
                <th>Last Login</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="py-2 font-medium">
                    {u.name} {u.id === currentUserId && <span className="text-xs text-muted-foreground">(you)</span>}
                  </td>
                  <td className="text-muted-foreground">{u.email}</td>
                  <td>
                    <Select
                      value={u.role}
                      disabled={u.id === currentUserId}
                      onChange={(e) => updateMutation.mutate({ id: u.id, data: { role: e.target.value } })}
                      className="h-8 py-1 text-xs"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {r.replace(/_/g, " ")}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="text-muted-foreground">{u.locationName ?? "—"}</td>
                  <td>
                    <Badge variant={u.isActive ? "success" : "outline"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="text-muted-foreground">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}</td>
                  <td className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={u.id === currentUserId}
                      onClick={() => updateMutation.mutate({ id: u.id, data: { isActive: !u.isActive } })}
                    >
                      {u.isActive ? "Deactivate" : "Activate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
