import DrugRiskPage from "@/pages/inventory/DrugRiskPage";

export default function CriticalMedicinesPage() {
  return <DrugRiskPage onlyLevels={["CRITICAL", "HIGH"]} />;
}
