import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getApiErrorMessage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const LOCATION_TYPES = [
  "CENTRAL_WAREHOUSE",
  "MAIN_PHARMACY",
  "IP_PHARMACY",
  "OP_PHARMACY",
  "EMERGENCY_PHARMACY",
  "OT_STORE",
  "SATELLITE_PHARMACY",
];

interface LocationRow {
  id: string;
  name: string;
  type: string;
  address: string | null;
  contactPerson: string | null;
  isActive: boolean;
}

export default function LocationsSettingsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => (await api.get("/locations")).data,
  });

  const [form, setForm] = useState({ name: "", type: "MAIN_PHARMACY", address: "", contactPerson: "" });
  const [error, setError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => api.post("/locations", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
      setForm({ name: "", type: "MAIN_PHARMACY", address: "", contactPerson: "" });
      setError(null);
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => api.patch(`/locations/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["locations"] }),
  });

  const locations: LocationRow[] = data?.locations ?? [];

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Settings — Locations</h1>

      <Card>
        <CardHeader>
          <CardTitle>Add Location</CardTitle>
          <CardDescription>Locations cannot be permanently deleted once they hold inventory — use Deactivate instead.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="grid grid-cols-12 gap-3"
          >
            <div className="col-span-4 space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="col-span-3 space-y-1.5">
              <Label className="text-xs">Type</Label>
              <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {LOCATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-3 space-y-1.5">
              <Label className="text-xs">Contact Person</Label>
              <Input value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} />
            </div>
            <div className="col-span-2 flex items-end">
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                Add
              </Button>
            </div>
          </form>
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Locations</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="py-2">Name</th>
                <th>Type</th>
                <th>Contact</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => (
                <tr key={loc.id} className="border-b border-border last:border-0">
                  <td className="py-2 font-medium">{loc.name}</td>
                  <td className="text-muted-foreground">{loc.type.replace(/_/g, " ")}</td>
                  <td className="text-muted-foreground">{loc.contactPerson ?? "—"}</td>
                  <td>
                    <Badge variant={loc.isActive ? "success" : "outline"}>{loc.isActive ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleMutation.mutate({ id: loc.id, isActive: !loc.isActive })}
                      disabled={toggleMutation.isPending}
                    >
                      {loc.isActive ? "Deactivate" : "Activate"}
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
