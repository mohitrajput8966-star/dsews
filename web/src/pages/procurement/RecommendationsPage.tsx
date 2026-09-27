import DrugRiskPage from "@/pages/inventory/DrugRiskPage";

export default function RecommendationsPage() {
  return <DrugRiskPage onlyLevels={["CRITICAL", "HIGH", "MEDIUM"]} />;
}
