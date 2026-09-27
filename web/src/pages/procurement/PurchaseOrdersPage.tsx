import PurchaseRequestsPage from "@/pages/procurement/PurchaseRequestsPage";

export default function PurchaseOrdersPage() {
  return <PurchaseRequestsPage onlyStatuses={["APPROVED", "ORDERED", "IN_TRANSIT", "RECEIVED"]} />;
}
