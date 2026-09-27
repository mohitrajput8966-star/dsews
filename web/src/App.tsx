import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RequirePermission } from "@/components/RequirePermission";
import { DashboardLayout } from "@/layouts/DashboardLayout";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import OnboardingWizard from "@/pages/onboarding/OnboardingWizard";
import DashboardPage from "@/pages/DashboardPage";
import ProfilePage from "@/pages/ProfilePage";
import ReportsPage from "@/pages/ReportsPage";
import ScenarioSimulatorPage from "@/pages/ScenarioSimulatorPage";
import OrganizationSettingsPage from "@/pages/settings/OrganizationSettingsPage";
import LocationsSettingsPage from "@/pages/settings/LocationsSettingsPage";
import UsersSettingsPage from "@/pages/settings/UsersSettingsPage";
import InventoryPage from "@/pages/inventory/InventoryPage";
import DrugRiskPage from "@/pages/inventory/DrugRiskPage";
import BatchesPage from "@/pages/inventory/BatchesPage";
import ExpiryPage from "@/pages/inventory/ExpiryPage";
import StockMovementsPage from "@/pages/inventory/StockMovementsPage";
import StockTransfersPage from "@/pages/inventory/StockTransfersPage";
import ConsumptionPage from "@/pages/analytics/ConsumptionPage";
import ForecastingPage from "@/pages/analytics/ForecastingPage";
import AbcVedPage from "@/pages/analytics/AbcVedPage";
import FsnPage from "@/pages/analytics/FsnPage";
import RiskAlertsPage from "@/pages/alerts/RiskAlertsPage";
import CriticalMedicinesPage from "@/pages/alerts/CriticalMedicinesPage";
import StockoutTimelinePage from "@/pages/alerts/StockoutTimelinePage";
import RecommendationsPage from "@/pages/procurement/RecommendationsPage";
import PurchaseRequestsPage from "@/pages/procurement/PurchaseRequestsPage";
import PurchaseOrdersPage from "@/pages/procurement/PurchaseOrdersPage";
import SuppliersPage from "@/pages/procurement/SuppliersPage";
import LandingPage from "@/pages/public/LandingPage";
import ProductOverviewPage from "@/pages/public/ProductOverviewPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function HomeRoute() {
  const token = useAuthStore((s) => s.token);
  if (token) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

function Guarded({ permission, children }: { permission: Parameters<typeof RequirePermission>[0]["permission"]; children: React.ReactNode }) {
  return <RequirePermission permission={permission}>{children}</RequirePermission>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/product" element={<ProductOverviewPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<OnboardingWizard />} />

            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/simulator" element={<Guarded permission="scenarioSimulator"><ScenarioSimulatorPage /></Guarded>} />
              <Route path="/reports" element={<Guarded permission="reports"><ReportsPage /></Guarded>} />

              <Route path="/inventory" element={<Guarded permission="inventory:all"><InventoryPage /></Guarded>} />
              <Route path="/inventory/risk" element={<Guarded permission="inventory:drugRisk"><DrugRiskPage /></Guarded>} />
              <Route path="/inventory/batches" element={<Guarded permission="inventory:batches"><BatchesPage /></Guarded>} />
              <Route path="/inventory/expiry" element={<Guarded permission="inventory:expiry"><ExpiryPage /></Guarded>} />
              <Route path="/inventory/movements" element={<Guarded permission="inventory:stockMovements"><StockMovementsPage /></Guarded>} />
              <Route path="/inventory/transfers" element={<Guarded permission="inventory:transfers"><StockTransfersPage /></Guarded>} />

              <Route path="/analytics/consumption" element={<Guarded permission="analytics:consumption"><ConsumptionPage /></Guarded>} />
              <Route path="/analytics/forecasting" element={<Guarded permission="analytics:forecasting"><ForecastingPage /></Guarded>} />
              <Route path="/analytics/abc-ved" element={<Guarded permission="analytics:abcVed"><AbcVedPage /></Guarded>} />
              <Route path="/analytics/fsn" element={<Guarded permission="analytics:fsn"><FsnPage /></Guarded>} />

              <Route path="/alerts/risk" element={<Guarded permission="alerts:risk"><RiskAlertsPage /></Guarded>} />
              <Route path="/alerts/critical" element={<Guarded permission="alerts:critical"><CriticalMedicinesPage /></Guarded>} />
              <Route path="/alerts/timeline" element={<Guarded permission="alerts:timeline"><StockoutTimelinePage /></Guarded>} />

              <Route path="/procurement/recommendations" element={<Guarded permission="procurement:recommendations"><RecommendationsPage /></Guarded>} />
              <Route path="/procurement/requests" element={<Guarded permission="procurement:purchaseRequests"><PurchaseRequestsPage /></Guarded>} />
              <Route path="/procurement/orders" element={<Guarded permission="procurement:purchaseOrders"><PurchaseOrdersPage /></Guarded>} />
              <Route path="/procurement/suppliers" element={<Guarded permission="procurement:suppliers"><SuppliersPage /></Guarded>} />

              <Route
                path="/settings/organization"
                element={<Guarded permission="settings:organization"><OrganizationSettingsPage /></Guarded>}
              />
              <Route
                path="/settings/policies"
                element={<Guarded permission="settings:inventoryPolicies"><OrganizationSettingsPage /></Guarded>}
              />
              <Route
                path="/settings/locations"
                element={<Guarded permission="settings:locations"><LocationsSettingsPage /></Guarded>}
              />
              <Route
                path="/settings/users"
                element={<Guarded permission="settings:users"><UsersSettingsPage /></Guarded>}
              />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
