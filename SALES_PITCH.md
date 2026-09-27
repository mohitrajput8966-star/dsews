# DSEWS — 5-Minute Organizational Pitch

*Presented as: MedCare Multispecialty Hospital's Supply Chain team evaluating DSEWS.*

## 1. Problem

Hospitals and pharmacy networks routinely discover a critical medicine is out of stock only when a patient needs it. Inventory monitoring is manual, procurement decisions lag behind actual consumption, and there is no structured mechanism tying together current stock, consumption rate, supplier lead time, and clinical criticality into a single early warning.

## 2. Why early warning matters

A stock-out of a vital medicine is not a spreadsheet problem — it is a patient-safety and cost problem: emergency purchasing at a premium, treatment delays, and repeated shortages that erode clinical trust in the pharmacy. The lead time between "someone notices" and "medicine arrives" is exactly the window where early warning has to operate — days, not hours.

## 3. The DSEWS solution

DSEWS continuously monitors inventory, consumption history, and supplier lead time to calculate, for every medicine at every location:

- Days of stock remaining and a projected stock-out date
- A transparent, explained risk classification (CRITICAL / HIGH / MEDIUM / LOW)
- A recommended order quantity, supplier, and estimated cost

It doesn't stop at the warning — it carries the response through: recommendation → purchase request → approval → order → receipt → inventory update → risk recalculation, so the loop actually closes.

## 4. Live demonstration flow

1. **Dashboard** — MedCare's live position: 10 medicines at CRITICAL risk, 11 at HIGH, $93K+ in total inventory value, 8 batches near expiry.
2. **Drug Risk → Meropenem 1g** — 9 units on hand, 8.7 units/day consumption, 10-day supplier lead time → 1 day of stock remaining. Click "Why this risk level?" to see the full weighted explanation, not a black box.
3. **Create Purchase Request** — 282 units from Global Meditrade Inc., $1,748.40, one click.
4. **Procurement → Purchase Requests** — walk it through Approve → Mark Ordered → Mark Received. Stock jumps from 9 to 291 units immediately; risk recalculates to LOW automatically.
5. **Stock Transfers** — before that purchase, the system had already suggested moving 313 spare units from the Central Medical Store instead of buying externally.
6. **Scenario Simulator** — "what if demand rises 20%?" recalculates every number instantly, without touching real inventory.

## 5. Business value

*Illustrative demo estimate — actual results depend on an organization's own data and processes, not a guaranteed outcome.*

- Earlier detection of shortage risk (days of lead-time runway, not hours)
- Fewer emergency/premium purchases driven by last-minute discovery
- Inventory capital better allocated — overstocked, near-expiry, and dead stock are surfaced, not hidden
- A single, auditable procurement trail from recommendation to receipt

## 6. Implementation

1. Register the organization (name, type, contact, currency, timezone) and its admin account.
2. Onboarding wizard: add locations, set the default inventory policy (lead time, safety-stock service level, critical-days threshold).
3. Import existing inventory via the CSV template, or add drugs manually.
4. Invite the team with role-based accounts — Admin, Supply Chain Manager, Pharmacy Manager, Procurement Officer, Warehouse Manager, Executive — each sees only what their role needs.

## 7. Next step

Launch the demo now with the credentials below, or register your own organization to start onboarding with your real locations and inventory policy.

**Demo login:** `scm@dsews.com` / `Demo@123` (Supply Chain Manager — best view of the full risk-to-procurement flow)

---

## Academic Background

*A short explanation of the pharmaceutical supply-chain concepts DSEWS implements, for MBA Pharmaceutical Management coursework.*

**Drug shortage management** — the discipline of anticipating and preventing gaps in medicine availability, combining inventory visibility, demand signals, and supplier reliability into a proactive (rather than reactive) response.

**Inventory management** — balancing the cost of holding stock (capital tied up, expiry risk) against the cost of stocking out (emergency purchasing, treatment delay), using policies (reorder point, safety stock, order-up-to level) rather than ad hoc judgment.

**Safety stock** — the buffer held above expected demand during lead time, sized to absorb demand variability at a chosen service level: `Safety Stock = Z × σ(daily demand) × √(lead time)`, where Z is the service-level factor (e.g. 1.65 ≈ 95% service level) and σ is the standard deviation of daily consumption.

**Reorder point** — the stock level at which a new order must be placed so it arrives before stock runs out: `Reorder Point = (Average Daily Consumption × Lead Time) + Safety Stock`.

**Lead time** — the elapsed time between placing an order and receiving usable stock; it directly determines how much demand must be covered by on-hand stock plus safety stock before replenishment arrives.

**Demand forecasting** — projecting future consumption from historical data. DSEWS uses transparent statistical methods (moving average, weighted moving average, exponential smoothing) rather than an opaque model, so the basis for every forecast can be explained.

**ABC analysis** — classifying inventory by consumption value using the Pareto principle: a small share of items (A) typically accounts for most of the value, warranting tighter control than low-value C items.

**VED analysis** — classifying inventory by clinical criticality: Vital (must never stock out), Essential, Desirable — independent of cost, because a cheap vital drug still deserves top priority.

**FSN analysis** — classifying inventory by movement: Fast-, Slow-, or Non-moving, surfacing dead stock that ties up capital and expiry risk without clinical justification.

**Pharmaceutical supply-chain risk management** — the synthesis of the above: using real consumption and lead-time data to quantify stock-out risk *before* it materializes, explain the driving factors, and route that risk into a concrete procurement or internal-transfer action — which is the operating model DSEWS implements end-to-end.
