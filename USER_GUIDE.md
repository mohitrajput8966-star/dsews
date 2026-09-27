# DSEWS User Guide

*For supply chain managers, pharmacy managers, procurement officers, warehouse managers, hospital administrators, and executives — no technical background required.*

> This is a demo/academic system running fictional data for **MedCare Multispecialty Hospital**. It does not replace professional procurement, clinical, regulatory, or organizational decision-making.

## 1. Logging in

Go to the application's web address and sign in with the email/password given to you by your administrator. On the login screen you can click **Use Demo Account** to see the available demo logins — selecting one fills in the email, but you still need to press **Login** yourself.

Tick **Remember session on this device** if you want to stay signed in after closing the browser (don't use this on a shared computer).

## 2. Your dashboard

After logging in you land on the **Dashboard**. It shows, for your organization right now:

- **KPI cards**: total medicines, total inventory value, how many drugs are at critical/high risk, how many have fallen below their reorder point, how many are projected to run out in the next 30 days, how many batches are near expiry, and how many procurement requests are still open.
- **Today's Supply Chain Actions**: a short, prioritized list telling you exactly what to do today — generated fresh from the current data, not a fixed script.
- Charts for risk distribution, the 10 medicines most at risk, consumption trend, inventory value by category, the stock-out timeline, and ABC/VED distribution.

Use the filter bar (location, category, risk level, ABC, VED) to narrow the whole dashboard to what matters to you.

## 3. Understanding a drug's risk level

Go to **Inventory → Drug Risk**. Each medicine shows its current stock, average daily consumption, days of stock remaining, lead time, safety stock, and reorder point, plus a plain-English reason and a recommended action. Click **"Why this risk level?"** to see the exact weighted breakdown behind the score — nothing is a hidden black box.

- **CRITICAL** — projected to run out very soon (at/below the critical-days threshold), or already at zero.
- **HIGH** — will run out before a new order could arrive, given the supplier's lead time.
- **MEDIUM** — has fallen to/below its reorder point; a routine reorder is due.
- **LOW** — adequate coverage. May also be flagged **OVERSTOCK** if it holds far more than needed.

## 4. Acting on a shortage risk

From the Drug Risk screen (or **Procurement → Recommendations**), click **Create Purchase Request** on any CRITICAL/HIGH/MEDIUM item — the quantity, supplier, and estimated cost are already calculated for you. Track it under **Procurement → Purchase Requests**, moving it through Approve → Mark Ordered → Mark In Transit → Mark Received as it actually happens. Marking it **Received** updates the real stock count immediately and the drug's risk is recalculated automatically.

## 5. Internal transfers before buying externally

**Inventory → Stock Transfers** shows when one location has spare stock of a drug that another location urgently needs — it's often faster to move stock internally than to place a new order. Create the transfer request, and once you've physically moved the stock, click **Mark Completed** to update both locations' stock counts.

## 6. Alerts

The **Alerts** link in the header (with an unread-count badge) takes you to the full Alert Center: critical shortages, high risk, reorder points reached, near-expiry and expired batches, overstocked items, and supplier delivery delays. Filter by type, mark individual alerts read, or **Mark All Read**.

## 7. Expiry management

**Inventory → Expiry Management** lists every batch approaching or past its expiry date, with the inventory value at risk, so you can prioritize dispensing (oldest first) or arrange a supplier return before it's wasted.

## 8. Forecasting and consumption

**Analytics → Consumption** shows organization-wide daily usage. **Analytics → Forecasting** lets you pick any drug/location and see its historical consumption alongside a forecast (moving average, weighted average, or exponential smoothing) — this is a statistical projection from your own data, not a clinical prediction.

## 9. ABC-VED and FSN analysis

**Analytics → ABC-VED** groups every drug by consumption value (A = highest, C = lowest) and clinical criticality (V = Vital, E = Essential, D = Desirable) — the AV/AE/BV segments deserve the tightest control. **Analytics → FSN** flags Fast/Slow/Non-moving drugs so you can spot dead stock.

## 10. Reports

**Reports** offers six report types (Drug Shortage Risk, Inventory Status, Expiry Risk, Procurement, ABC-VED, Supplier Performance). Filter by location, then **Export CSV** for a spreadsheet or **Print / Save as PDF** for a shareable document.

## 11. What-If Scenario Simulator

**Scenario Simulator** lets you test "what if demand rose 20%?" or "what if the supplier's lead time grew by 5 days?" — it recalculates instantly and **never changes real inventory**. Use it to sanity-check a decision before acting on it for real.

## 12. Settings (Administrators only)

- **Organization** — company profile and the default inventory policy (critical-days threshold, safety-stock service level, review period, overstock multiplier) that drives every risk calculation. This is also where **Reset Demo Data** lives, for restarting the demo cleanly.
- **Locations** — add locations; deactivate rather than delete ones that already hold inventory.
- **Users** — add team members, assign roles and a home location, deactivate accounts that should no longer have access.

## 13. Importing inventory from a spreadsheet

On **All Inventory**, click **Download CSV Template** to get the exact column layout, fill it in, then use **Import**. Any row with a problem (missing field, negative number, unknown location) is reported with the exact reason and skipped — everything else imports immediately.

## Getting help

Contact your organization's DSEWS administrator for account issues. For questions about the underlying methodology, see [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md).
