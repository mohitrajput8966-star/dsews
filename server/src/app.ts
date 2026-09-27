import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import organizationsRoutes from "./routes/organizations.routes";
import locationsRoutes from "./routes/locations.routes";
import usersRoutes from "./routes/users.routes";
import riskRoutes from "./routes/risk.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import forecastRoutes from "./routes/forecast.routes";
import alertsRoutes from "./routes/alerts.routes";
import procurementRoutes from "./routes/procurement.routes";
import transfersRoutes from "./routes/transfers.routes";
import analyticsRoutes from "./routes/analytics.routes";
import reportsRoutes from "./routes/reports.routes";
import demoRoutes from "./routes/demo.routes";
import inventoryRoutes from "./routes/inventory.routes";
import { errorHandler } from "./utils/errors";

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? "*", credentials: true }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "DSEWS API", timestamp: new Date().toISOString() });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/organizations", organizationsRoutes);
  app.use("/api/locations", locationsRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/risk", riskRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/forecast", forecastRoutes);
  app.use("/api/alerts", alertsRoutes);
  app.use("/api/procurement", procurementRoutes);
  app.use("/api/transfers", transfersRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/demo", demoRoutes);
  app.use("/api/inventory", inventoryRoutes);

  app.use((_req, res) => res.status(404).json({ error: "Not found." }));
  app.use(errorHandler);

  return app;
}
