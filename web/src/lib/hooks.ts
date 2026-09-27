import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async () => (await api.get("/locations")).data.locations as { id: string; name: string; isActive: boolean }[],
  });
}

export function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers-list"],
    queryFn: async () => (await api.get("/analytics/suppliers-list")).data.suppliers as { id: string; name: string }[],
  });
}
