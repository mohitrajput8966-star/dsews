import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input, Label } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function OrganizationSettingsPage() {
  const queryClient = useQueryClient();
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const clearSession = useAuthStore((s) => s.clearSession);
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["organizations", "current"],
    queryFn: async () => (await api.get("/organizations/current")).data,
  });

  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  async function handleResetDemo() {
    if (!window.confirm("This will erase all current demo data and regenerate it fresh (83 drugs, fresh risk scenarios). Continue?")) return;
    setResetting(true);
    setResetMessage(null);
    try {
      await api.post("/demo/reset");
      setResetMessage("Demo data reset. Redirecting to login…");
      setTimeout(() => {
        clearSession();
        navigate("/login", { replace: true });
      }, 1500);
    } catch (err) {
      setResetMessage(getApiErrorMessage(err));
      setResetting(false);
    }
  }

  const [profile, setProfile] = useState({ name: "", orgType: "", primaryContactName: "", primaryContactEmail: "", currency: "", timezone: "" });
  const [policy, setPolicy] = useState({
    criticalDaysThreshold: 4,
    serviceLevelZ: 1.65,
    reviewPeriodDays: 14,
    overstockCoverageMultiplier: 3,
    defaultLeadTimeDays: 7,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.organization) {
      setProfile({
        name: data.organization.name,
        orgType: data.organization.orgType,
        primaryContactName: data.organization.primaryContactName ?? "",
        primaryContactEmail: data.organization.primaryContactEmail ?? "",
        currency: data.organization.currency,
        timezone: data.organization.timezone,
      });
    }
    if (data?.settings) {
      setPolicy({
        criticalDaysThreshold: data.settings.criticalDaysThreshold,
        serviceLevelZ: data.settings.serviceLevelZ,
        reviewPeriodDays: data.settings.reviewPeriodDays,
        overstockCoverageMultiplier: data.settings.overstockCoverageMultiplier,
        defaultLeadTimeDays: data.settings.defaultLeadTimeDays,
      });
    }
  }, [data]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await api.patch("/organizations/current", { ...profile, settings: policy });
      await queryClient.invalidateQueries({ queryKey: ["organizations", "current"] });
      await fetchMe();
      setMessage("Organization settings saved.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Settings — Organization</h1>
      <form onSubmit={handleSave} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Organization Profile</CardTitle>
            <CardDescription>Visible across the application header and reports.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Organization Name</Label>
              <Input value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Organization Type</Label>
              <Input value={profile.orgType} onChange={(e) => setProfile((p) => ({ ...p, orgType: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input value={profile.currency} onChange={(e) => setProfile((p) => ({ ...p, currency: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Primary Contact Name</Label>
              <Input value={profile.primaryContactName} onChange={(e) => setProfile((p) => ({ ...p, primaryContactName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Primary Contact Email</Label>
              <Input
                type="email"
                value={profile.primaryContactEmail}
                onChange={(e) => setProfile((p) => ({ ...p, primaryContactEmail: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Input value={profile.timezone} onChange={(e) => setProfile((p) => ({ ...p, timezone: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Default Inventory Policy &amp; Alert Thresholds</CardTitle>
            <CardDescription>Feeds the stock-out risk engine for every drug in this organization.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Critical-Days Threshold</Label>
              <Input
                type="number"
                value={policy.criticalDaysThreshold}
                onChange={(e) => setPolicy((p) => ({ ...p, criticalDaysThreshold: Number(e.target.value) }))}
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
              <Label>Default Lead Time (days)</Label>
              <Input
                type="number"
                value={policy.defaultLeadTimeDays}
                onChange={(e) => setPolicy((p) => ({ ...p, defaultLeadTimeDays: Number(e.target.value) }))}
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
          </CardContent>
        </Card>

        {message && <p className="text-sm text-risk-low">{message}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </form>

      {data?.organization?.isDemo && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle>Demo Mode</CardTitle>
            <CardDescription>
              This organization is running fictional demo data. Resetting regenerates the full 83-drug MedCare dataset
              from scratch (same engineered risk distribution) and signs you out — log back in with the demo credentials.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="destructive" onClick={handleResetDemo} disabled={resetting}>
              {resetting ? "Resetting…" : "Reset Demo Data"}
            </Button>
            {resetMessage && <p className="text-sm text-muted-foreground">{resetMessage}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
