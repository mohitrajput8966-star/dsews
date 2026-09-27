import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

const PACKAGES = [
  {
    name: "Demo",
    price: "$0",
    tagline: "Explore the full platform with sample data",
    features: ["Full read/write demo environment", "1 organization, fictional data", "All modules unlocked", "Community support"],
  },
  {
    name: "Professional",
    price: "Illustrative",
    tagline: "For a single hospital or pharmacy chain",
    features: ["Your own organization & real inventory data", "Up to 10 locations", "Email support", "CSV import & reports"],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Illustrative",
    tagline: "For multi-facility healthcare networks",
    features: ["Unlimited locations & users", "Role-based access across facilities", "Priority support", "Custom onboarding"],
  },
];

export default function ProductOverviewPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link to="/" className="text-lg font-semibold text-primary">DSEWS</Link>
          <Link to="/login"><Button size="sm">Launch Demo</Button></Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <h1 className="text-3xl font-bold">Product Overview &amp; Sales Demo</h1>
        <p className="mt-2 text-muted-foreground">Problem → Solution → Demonstration → Business Value → Implementation → Next Steps</p>
      </section>

      <section className="mx-auto max-w-5xl space-y-8 px-6 pb-16">
        <Card>
          <CardHeader><CardTitle>1. Problem</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Unexpected drug stock-outs, manual inventory monitoring, delayed procurement, excess inventory, and no
            structured early-warning mechanism — leading to emergency purchasing and repeated shortages.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>2. Solution</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            DSEWS turns raw inventory and consumption data into actionable supply-chain intelligence: a transparent
            risk engine, automatic early-warning alerts, demand forecasting, and a guided procurement workflow.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>3. Demonstration Scenario</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            A hospital's Ceftriaxone stock falls to 120 units against 25 units/day of consumption and an 8-day
            supplier lead time — only 4.8 days of coverage. DSEWS flags it automatically, explains the exact reason,
            and recommends a procurement quantity and supplier. The purchase request is tracked through approval,
            ordering, and receipt — with inventory and risk automatically recalculated afterward. Try it live in the
            demo with the Supply Chain Manager account.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>4. Business Value</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Illustrative demo estimate — not a guaranteed outcome: earlier detection of shortage risk, fewer emergency
            purchases, better-targeted procurement spend, and less inventory tied up in near-expiry or overstocked
            items. Actual results depend on an organization's own data and processes.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>5. Implementation</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Onboarding wizard collects your locations and inventory policy; import your existing inventory via CSV;
            your team logs in with role-based accounts (Admin, Supply Chain Manager, Pharmacy Manager, Procurement
            Officer, Warehouse Manager, Executive) from day one.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Security</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Role-based access control enforced on both the interface and the API, organization-level data isolation,
            hashed passwords, and an audit trail of key actions. No patient data is collected or required.
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>6. Next Steps</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Launch the demo, explore your own scenario in the What-If Simulator, and register your organization to
            begin onboarding with your real locations and inventory policy.
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <h2 className="mb-2 text-center text-2xl font-semibold">Illustrative Packages</h2>
        <p className="mb-6 text-center text-xs text-muted-foreground">Illustrative pricing for academic/product demonstration only.</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PACKAGES.map((p) => (
            <Card key={p.name} className={p.highlight ? "border-primary" : ""}>
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
                <CardDescription>{p.tagline}</CardDescription>
                <p className="pt-2 text-2xl font-semibold">{p.price}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm text-muted-foreground">
                  {p.features.map((f) => <li key={f}>• {f}</li>)}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-20 text-center">
        <Link to="/login"><Button size="lg">Launch Demo</Button></Link>
      </section>

      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        Demo system for pharmaceutical inventory and supply-chain decision support. All pricing is illustrative for
        academic/product demonstration only.
      </footer>
    </div>
  );
}
