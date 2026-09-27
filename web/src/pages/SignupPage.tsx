import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api, getApiErrorMessage } from "@/lib/api";
import { useAuthStore, setRememberSession } from "@/store/auth.store";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

const ORG_TYPES = ["HOSPITAL", "PHARMACY_CHAIN", "DISTRIBUTOR", "CENTRAL_MEDICAL_STORE"];

export default function SignupPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [form, setForm] = useState({
    orgName: "",
    orgType: "HOSPITAL",
    primaryContactName: "",
    primaryContactEmail: "",
    currency: "USD",
    timezone: "UTC",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register-organization", form);
      setRememberSession(true);
      setSession(data.token, data.user, data.organization);
      navigate("/onboarding", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not register your organization."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-primary">Set up DSEWS for your organization</h1>
        <p className="mt-1 text-sm text-muted-foreground">Step 1 of 4 — Organization &amp; admin account</p>
      </div>

      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Organization Information</CardTitle>
          <CardDescription>You'll add locations and inventory policy in the next steps.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>Organization Name</Label>
                <Input required value={form.orgName} onChange={(e) => update("orgName", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Organization Type</Label>
                <Select value={form.orgType} onChange={(e) => update("orgType", e.target.value)}>
                  {ORG_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Input value={form.currency} onChange={(e) => update("currency", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Primary Contact Name</Label>
                <Input required value={form.primaryContactName} onChange={(e) => update("primaryContactName", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Primary Contact Email</Label>
                <Input type="email" required value={form.primaryContactEmail} onChange={(e) => update("primaryContactEmail", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Timezone</Label>
                <Input value={form.timezone} onChange={(e) => update("timezone", e.target.value)} placeholder="e.g. America/New_York" />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="mb-3 text-sm font-medium">Your Admin Account</p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input required value={form.adminName} onChange={(e) => update("adminName", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" required value={form.adminEmail} onChange={(e) => update("adminEmail", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    required
                    minLength={8}
                    value={form.adminPassword}
                    onChange={(e) => update("adminPassword", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating organization..." : "Continue"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
