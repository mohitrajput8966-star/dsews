import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

const LOCATION_TYPES = [
  "CENTRAL_WAREHOUSE",
  "MAIN_PHARMACY",
  "IP_PHARMACY",
  "OP_PHARMACY",
  "EMERGENCY_PHARMACY",
  "OT_STORE",
  "SATELLITE_PHARMACY",
];

const SUGGESTED_LOCATIONS = ["Central Medical Store", "IP Pharmacy", "OP Pharmacy", "Emergency Pharmacy", "OT Store"];

interface LocationDraft {
  name: string;
  type: string;
  address: string;
  contactPerson: string;
}

interface PolicyDraft {
  defaultLeadTimeDays: number;
  serviceLevelZ: number;
  reviewPeriodDays: number;
  criticalDaysThreshold: number;
  overstockCoverageMultiplier: number;
}

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const organization = useAuthStore((s) => s.organization);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const [step, setStep] = useState<2 | 3 | 4>(2);
  const [locations, setLocations] = useState<LocationDraft[]>([
    { name: "Central Medical Store", type: "CENTRAL_WAREHOUSE", address: "", contactPerson: "" },
  ]);
  const [policy, setPolicy] = useState<PolicyDraft>({
    defaultLeadTimeDays: 7,
    serviceLevelZ: 1.65,
    reviewPeriodDays: 14,
    criticalDaysThreshold: 4,
    overstockCoverageMultiplier: 3,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function addLocation() {
    setLocations((l) => [...l, { name: "", type: "MAIN_PHARMACY", address: "", contactPerson: "" }]);
  }
  function updateLocation(i: number, field: keyof LocationDraft, value: string) {
    setLocations((l) => l.map((loc, idx) => (idx === i ? { ...loc, [field]: value } : loc)));
  }
  function removeLocation(i: number) {
    setLocations((l) => l.filter((_, idx) => idx !== i));
  }

  async function handleComplete() {
    setError(null);
    setLoading(true);
    try {
      await api.post("/organizations/current/complete-onboarding", {
        locations: locations.filter((l) => l.name.trim().length > 0),
        policy,
      });
      await fetchMe();
      setStep(4);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not complete setup."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Organization Setup — {organization?.name}</CardTitle>
          <CardDescription>Step {step} of 4</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm font-medium">Locations</p>
              <p className="text-sm text-muted-foreground">
                Suggested: {SUGGESTED_LOCATIONS.join(", ")}. Add as many as your organization operates.
              </p>
              {locations.map((loc, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 rounded-md border border-border p-3">
                  <div className="col-span-4">
                    <Label className="text-xs">Location Name</Label>
                    <Input value={loc.name} onChange={(e) => updateLocation(i, "name", e.target.value)} />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Type</Label>
                    <Select value={loc.type} onChange={(e) => updateLocation(i, "type", e.target.value)}>
                      {LOCATION_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replace(/_/g, " ")}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Contact Person</Label>
                    <Input value={loc.contactPerson} onChange={(e) => updateLocation(i, "contactPerson", e.target.value)} />
                  </div>
                  <div className="col-span-2 flex items-end">
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeLocation(i)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" onClick={addLocation}>
                + Add Location
              </Button>
              <div className="flex justify-end pt-2">
                <Button onClick={() => setStep(3)} disabled={locations.filter((l) => l.name.trim()).length === 0}>
                  Next: Inventory Policy
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-medium">Inventory Policy</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Default Lead Time (days)</Label>
                  <Input
                    type="number"
                    value={policy.defaultLeadTimeDays}
                    onChange={(e) => setPolicy((p) => ({ ...p, defaultLeadTimeDays: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Safety Stock Service Level (Z)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={policy.serviceLevelZ}
                    onChange={(e) => setPolicy((p) => ({ ...p, serviceLevelZ: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Review Period (days)</Label>
                  <Input
                    type="number"
                    value={policy.reviewPeriodDays}
                    onChange={(e) => setPolicy((p) => ({ ...p, reviewPeriodDays: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Critical Stock Threshold (days)</Label>
                  <Input
                    type="number"
                    value={policy.criticalDaysThreshold}
                    onChange={(e) => setPolicy((p) => ({ ...p, criticalDaysThreshold: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Overstock Coverage Multiplier</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={policy.overstockCoverageMultiplier}
                    onChange={(e) => setPolicy((p) => ({ ...p, overstockCoverageMultiplier: Number(e.target.value) }))}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button onClick={handleComplete} disabled={loading}>
                  {loading ? "Finishing setup..." : "Complete Setup"}
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 py-6 text-center">
              <p className="text-xl font-semibold text-primary">Your organization is ready.</p>
              <p className="text-sm text-muted-foreground">
                {organization?.name} is fully configured with {locations.filter((l) => l.name.trim()).length} location(s) and your
                inventory policy.
              </p>
              <Button onClick={() => navigate("/dashboard", { replace: true })}>Go to Dashboard</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
