// Single source of truth for role-based access control. Both the API
// (route guards) and the web app (nav filtering, route guards) import this
// so a permission can never drift between "what's shown" and "what's allowed".
import { UserRole } from "./types";

export type PermissionKey =
  | "dashboard"
  | "executiveDashboard"
  | "inventory:all"
  | "inventory:pharmacy"
  | "inventory:warehouse"
  | "inventory:drugRisk"
  | "inventory:batches"
  | "inventory:expiry"
  | "inventory:stockMovements"
  | "inventory:transfers"
  | "analytics:consumption"
  | "analytics:forecasting"
  | "analytics:abcVed"
  | "analytics:fsn"
  | "alerts:risk"
  | "alerts:critical"
  | "alerts:timeline"
  | "procurement:recommendations"
  | "procurement:purchaseRequests"
  | "procurement:purchaseOrders"
  | "procurement:suppliers"
  | "reports"
  | "scenarioSimulator"
  | "settings:organization"
  | "settings:locations"
  | "settings:users"
  | "settings:inventoryPolicies";

export const ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
  ADMIN: [
    "dashboard",
    "executiveDashboard",
    "inventory:all",
    "inventory:pharmacy",
    "inventory:warehouse",
    "inventory:drugRisk",
    "inventory:batches",
    "inventory:expiry",
    "inventory:stockMovements",
    "inventory:transfers",
    "analytics:consumption",
    "analytics:forecasting",
    "analytics:abcVed",
    "analytics:fsn",
    "alerts:risk",
    "alerts:critical",
    "alerts:timeline",
    "procurement:recommendations",
    "procurement:purchaseRequests",
    "procurement:purchaseOrders",
    "procurement:suppliers",
    "reports",
    "scenarioSimulator",
    "settings:organization",
    "settings:locations",
    "settings:users",
    "settings:inventoryPolicies",
  ],
  SUPPLY_CHAIN_MANAGER: [
    "dashboard",
    "inventory:all",
    "inventory:drugRisk",
    "analytics:consumption",
    "analytics:forecasting",
    "analytics:abcVed",
    "analytics:fsn",
    "alerts:risk",
    "alerts:critical",
    "alerts:timeline",
    "procurement:recommendations",
    "reports",
    "scenarioSimulator",
  ],
  PHARMACY_MANAGER: [
    "dashboard",
    "inventory:pharmacy",
    "inventory:drugRisk",
    "inventory:transfers",
    "analytics:consumption",
    "alerts:risk",
    "alerts:critical",
    "scenarioSimulator",
  ],
  PROCUREMENT_OFFICER: [
    "dashboard",
    "alerts:risk",
    "alerts:critical",
    "procurement:recommendations",
    "procurement:purchaseRequests",
    "procurement:purchaseOrders",
    "procurement:suppliers",
    "scenarioSimulator",
  ],
  WAREHOUSE_MANAGER: [
    "dashboard",
    "inventory:warehouse",
    "inventory:batches",
    "inventory:expiry",
    "inventory:stockMovements",
    "inventory:transfers",
    "scenarioSimulator",
  ],
  HOSPITAL_ADMIN: [
    "dashboard",
    "executiveDashboard",
    "inventory:all",
    "inventory:drugRisk",
    "alerts:risk",
    "alerts:critical",
    "alerts:timeline",
    "reports",
    "scenarioSimulator",
  ],
  EXECUTIVE: ["dashboard", "executiveDashboard", "reports", "alerts:critical", "scenarioSimulator"],
};

export function roleHasPermission(role: UserRole, key: PermissionKey): boolean {
  return ROLE_PERMISSIONS[role]?.includes(key) ?? false;
}

export interface NavLeaf {
  label: string;
  path: string;
  permission: PermissionKey;
}

export interface NavGroup {
  label: string;
  items: NavLeaf[];
}

/** Sidebar structure (section 11). Each leaf is filtered by the viewer's role at render time. */
export const NAV_STRUCTURE: (NavLeaf | NavGroup)[] = [
  { label: "Dashboard", path: "/dashboard", permission: "dashboard" },
  {
    label: "Inventory",
    items: [
      { label: "All Inventory", path: "/inventory", permission: "inventory:all" },
      { label: "Drug Risk", path: "/inventory/risk", permission: "inventory:drugRisk" },
      { label: "Batches", path: "/inventory/batches", permission: "inventory:batches" },
      { label: "Expiry Management", path: "/inventory/expiry", permission: "inventory:expiry" },
      { label: "Stock Movements", path: "/inventory/movements", permission: "inventory:stockMovements" },
      { label: "Stock Transfers", path: "/inventory/transfers", permission: "inventory:transfers" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { label: "Consumption", path: "/analytics/consumption", permission: "analytics:consumption" },
      { label: "Forecasting", path: "/analytics/forecasting", permission: "analytics:forecasting" },
      { label: "ABC-VED", path: "/analytics/abc-ved", permission: "analytics:abcVed" },
      { label: "FSN", path: "/analytics/fsn", permission: "analytics:fsn" },
    ],
  },
  {
    label: "Early Warning",
    items: [
      { label: "Risk Alerts", path: "/alerts/risk", permission: "alerts:risk" },
      { label: "Critical Medicines", path: "/alerts/critical", permission: "alerts:critical" },
      { label: "Stock-out Timeline", path: "/alerts/timeline", permission: "alerts:timeline" },
    ],
  },
  {
    label: "Procurement",
    items: [
      { label: "Recommendations", path: "/procurement/recommendations", permission: "procurement:recommendations" },
      { label: "Purchase Requests", path: "/procurement/requests", permission: "procurement:purchaseRequests" },
      { label: "Purchase Orders", path: "/procurement/orders", permission: "procurement:purchaseOrders" },
      { label: "Suppliers", path: "/procurement/suppliers", permission: "procurement:suppliers" },
    ],
  },
  { label: "Reports", path: "/reports", permission: "reports" },
  { label: "Scenario Simulator", path: "/simulator", permission: "scenarioSimulator" },
  {
    label: "Settings",
    items: [
      { label: "Organization", path: "/settings/organization", permission: "settings:organization" },
      { label: "Locations", path: "/settings/locations", permission: "settings:locations" },
      { label: "Users", path: "/settings/users", permission: "settings:users" },
      { label: "Inventory Policies", path: "/settings/policies", permission: "settings:inventoryPolicies" },
    ],
  },
];
