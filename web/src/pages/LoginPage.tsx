import { useState } from "react";
import { Navigate, useLocation, useNavigate, Link } from "react-router-dom";
import { useAuthStore, setRememberSession } from "@/store/auth.store";
import { getApiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@dsews.com" },
  { label: "Supply Chain Manager", email: "scm@dsews.com" },
  { label: "Pharmacy Manager", email: "pharmacy@dsews.com" },
  { label: "Warehouse Manager", email: "warehouse@dsews.com" },
  { label: "Procurement Officer", email: "procurement@dsews.com" },
  { label: "Hospital Administrator", email: "hospitaladmin@dsews.com" },
  { label: "Executive", email: "executive@dsews.com" },
];
const DEMO_PASSWORD = "Demo@123";

export default function LoginPage() {
  const token = useAuthStore((s) => s.token);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDemoList, setShowDemoList] = useState(false);

  if (token) {
    const from = (location.state as { from?: string })?.from ?? "/dashboard";
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      setRememberSession(remember);
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, "Invalid email or password."));
    } finally {
      setLoading(false);
    }
  }

  function useDemoAccount(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setShowDemoList(false);
    setError(null);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-primary">Drug Shortage Early Warning System</h1>
        <p className="mt-1 text-sm text-muted-foreground">Predict shortages. Prevent stock-outs. Protect supply continuity.</p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Access your organization's supply-chain dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
            <span className="font-semibold">DEMO MODE</span> — this environment runs on fictional demo data for
            academic/product demonstration purposes.
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="remember" className="font-normal text-muted-foreground">
                Remember session on this device
              </Label>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </Button>
          </form>

          <div className="relative">
            <Button type="button" variant="outline" className="w-full" onClick={() => setShowDemoList((v) => !v)}>
              Use Demo Account
            </Button>
            {showDemoList && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card shadow-md">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => useDemoAccount(acc.email)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span className="font-medium">{acc.label}</span>
                    <span className="ml-2 text-muted-foreground">{acc.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Selecting a demo account only fills the form — press Login to sign in. Demo password: <code>{DEMO_PASSWORD}</code>
          </p>

          <p className="pt-2 text-center text-sm text-muted-foreground">
            Setting up DSEWS for a new organization?{" "}
            <Link to="/signup" className="font-medium text-primary hover:underline">
              Register your organization
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
