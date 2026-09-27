import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

const FEATURES = [
  { title: "Stock-out Risk Engine", body: "Transparent, formula-based risk scoring — ADC, safety stock, reorder point, and a fully explained CRITICAL/HIGH/MEDIUM/LOW classification for every drug at every location." },
  { title: "Early Warning Center", body: "Automatically generated alerts for critical shortages, reorder breaches, near-expiry batches, and supplier delays — before they become stock-outs." },
  { title: "Demand Forecasting", body: "Moving average, weighted average, and exponential smoothing over real consumption history — never a black box." },
  { title: "Procurement Workflow", body: "Recommendation → purchase request → approval → order → receipt, with inventory updated and risk recalculated automatically on receipt." },
  { title: "ABC / VED / FSN Analysis", body: "Classic pharmaceutical inventory classification, computed live from consumption value and criticality — not static labels." },
  { title: "Multi-Location & Transfers", body: "See every location's position at once, and get internal-transfer recommendations before recommending external procurement." },
];

const AUDIENCES = ["Hospitals", "Pharmacy Chains", "Healthcare Networks", "Medical Distributors", "Institutional Pharmacies"];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="text-lg font-semibold text-primary">DSEWS</span>
          <nav className="flex items-center gap-4 text-sm">
            <Link to="/product" className="text-muted-foreground hover:text-foreground">Product Overview</Link>
            <Link to="/login"><Button size="sm" variant="outline">Login</Button></Link>
            <Link to="/login"><Button size="sm">Launch Demo</Button></Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">Drug Shortage Early Warning System</h1>
        <p className="mt-4 text-lg text-muted-foreground">Predict shortages. Prevent stock-outs. Protect supply continuity.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/login"><Button size="lg">Launch Demo</Button></Link>
          <Link to="/product"><Button size="lg" variant="outline">View Dashboard Preview</Button></Link>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Demo environment — fictional data for academic/product demonstration.</p>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>The Problem</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Hospitals and pharmacies routinely discover a medicine is out of stock only when a patient needs it —
              driven by manual monitoring, delayed procurement decisions, and no early-warning mechanism tying
              consumption, lead time, and criticality together.
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>The Solution</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              DSEWS continuously monitors inventory, consumption, and supplier lead time to flag medicines approaching
              stock-out — explains exactly why, and recommends the procurement action to take, before the shelf goes empty.
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="mb-6 text-center text-2xl font-semibold">How It Works</h2>
        <div className="grid grid-cols-1 gap-3 text-center text-sm sm:grid-cols-4">
          {["Inventory + Consumption Data", "Risk Engine Calculates Coverage", "Early Warning + Explanation", "Procurement Recommendation → Order"].map((step, i) => (
            <div key={step} className="rounded-md border border-border p-4">
              <p className="text-xs text-muted-foreground">Step {i + 1}</p>
              <p className="mt-1 font-medium">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="mb-6 text-center text-2xl font-semibold">Key Features</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardHeader><CardTitle className="text-base">{f.title}</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground">{f.body}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-12 text-center">
        <h2 className="mb-6 text-2xl font-semibold">Built For</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {AUDIENCES.map((a) => (
            <span key={a} className="rounded-full border border-border px-4 py-1.5 text-sm text-muted-foreground">{a}</span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="text-2xl font-semibold">See it in action</h2>
        <p className="mt-2 text-sm text-muted-foreground">Sign in with a demo account — no setup required.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/login"><Button size="lg">Launch Demo</Button></Link>
          <Link to="/product"><Button size="lg" variant="outline">Request Organization Demo</Button></Link>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        Demo system for pharmaceutical inventory and supply-chain decision support. It does not replace professional
        procurement, clinical, regulatory, or organizational decision-making.
      </footer>
    </div>
  );
}
