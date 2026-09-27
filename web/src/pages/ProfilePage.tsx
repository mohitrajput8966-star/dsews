import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  const { data: locData } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => (await api.get("/locations")).data,
  });

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [locationId, setLocationId] = useState(user?.locationId ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone ?? "");
      setLocationId(user.locationId ?? "");
    }
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await api.patch("/users/me", { name, phone, locationId: locationId || null });
      await fetchMe();
      setMessage("Profile updated.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">My Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Full name, phone and preferred location are editable. Role is managed by your administrator.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={user.email} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Input value={user.role.replace(/_/g, " ")} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Organization</Label>
              <Input value={organization?.name ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1-555-0100" />
            </div>
            <div className="space-y-1.5">
              <Label>Preferred Location</Label>
              <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
                <option value="">No specific location</option>
                {locData?.locations?.map((loc: { id: string; name: string }) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <Label className="text-xs">Account Created</Label>
                <p>{new Date(user.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <Label className="text-xs">Last Login</Label>
                <p>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "This is your first login"}</p>
              </div>
            </div>

            {message && <p className="text-sm text-risk-low">{message}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
