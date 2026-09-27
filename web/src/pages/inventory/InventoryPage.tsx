import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getApiErrorMessage } from "@/lib/api";
import { useLocations } from "@/lib/hooks";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Input, Label, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { usePermission } from "@/lib/use-permission";

interface InventoryRow {
  id: string;
  currentStock: number;
  minStockLevel: number;
  reorderLevel: number;
  maxStockLevel: number;
  leadTimeDays: number;
  drug: { genericName: string; strength: string; drugCode: string; therapeuticCategory: string; unitCost: number; unit: string };
  location: { name: string };
  supplier: { name: string } | null;
}

const CRITICALITIES = ["VITAL", "ESSENTIAL", "DESIRABLE"];

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const canEdit = usePermission("inventory:all");
  const { data: locations } = useLocations();
  const [search, setSearch] = useState("");
  const [locationId, setLocationId] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [importResult, setImportResult] = useState<{ totalRows: number; importedCount: number; errors: { row: number; errors: string[] }[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data } = useQuery({
    queryKey: ["inventory", search, locationId],
    queryFn: async () => (await api.get("/inventory", { params: { search: search || undefined, locationId: locationId || undefined } })).data,
  });

  const [form, setForm] = useState({
    drugCode: "", genericName: "", brandName: "", strength: "", dosageForm: "TABLET", therapeuticCategory: "",
    manufacturer: "", unit: "TABLET", unitCost: 0, criticality: "ESSENTIAL", locationId: "",
    currentStock: 0, minStockLevel: 0, reorderLevel: 0, maxStockLevel: 0, leadTimeDays: 7,
  });
  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async () => api.post("/inventory", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setShowAdd(false);
      setFormError(null);
    },
    onError: (err) => setFormError(getApiErrorMessage(err)),
  });

  async function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post("/inventory/import", fd, { headers: { "Content-Type": "multipart/form-data" } });
    setImportResult(data);
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
  }

  const items: InventoryRow[] = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">All Inventory</h1>
        {canEdit && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open(`${api.defaults.baseURL}/inventory/import/template`, "_blank")}>
              Download CSV Template
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowAdd((v) => !v)}>{showAdd ? "Cancel" : "+ Add Drug"}</Button>
          </div>
        )}
      </div>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle>Import Inventory (CSV)</CardTitle>
            <CardDescription>Upload a CSV matching the template. Invalid rows are reported and skipped; valid rows import immediately.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <input ref={fileRef} type="file" accept=".csv" className="text-sm" />
              <Button size="sm" onClick={handleImport}>Import</Button>
            </div>
            {importResult && (
              <div className="text-sm">
                <p>
                  {importResult.importedCount} of {importResult.totalRows} row(s) imported.
                </p>
                {importResult.errors.length > 0 && (
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 text-destructive">
                    {importResult.errors.map((e, i) => (
                      <li key={i}>Row {e.row}: {e.errors.join(" ")}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showAdd && canEdit && (
        <Card>
          <CardHeader><CardTitle>Add Drug</CardTitle></CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
              className="grid grid-cols-3 gap-3"
            >
              <div><Label className="text-xs">Drug Code</Label><Input required value={form.drugCode} onChange={(e) => setForm((f) => ({ ...f, drugCode: e.target.value }))} /></div>
              <div><Label className="text-xs">Generic Name</Label><Input required value={form.genericName} onChange={(e) => setForm((f) => ({ ...f, genericName: e.target.value }))} /></div>
              <div><Label className="text-xs">Brand Name</Label><Input value={form.brandName} onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))} /></div>
              <div><Label className="text-xs">Strength</Label><Input required value={form.strength} onChange={(e) => setForm((f) => ({ ...f, strength: e.target.value }))} /></div>
              <div><Label className="text-xs">Dosage Form</Label><Input required value={form.dosageForm} onChange={(e) => setForm((f) => ({ ...f, dosageForm: e.target.value }))} /></div>
              <div><Label className="text-xs">Category</Label><Input required value={form.therapeuticCategory} onChange={(e) => setForm((f) => ({ ...f, therapeuticCategory: e.target.value }))} /></div>
              <div><Label className="text-xs">Manufacturer</Label><Input required value={form.manufacturer} onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))} /></div>
              <div><Label className="text-xs">Unit</Label><Input required value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} /></div>
              <div><Label className="text-xs">Unit Cost</Label><Input required type="number" step="0.01" value={form.unitCost} onChange={(e) => setForm((f) => ({ ...f, unitCost: Number(e.target.value) }))} /></div>
              <div>
                <Label className="text-xs">Criticality</Label>
                <Select value={form.criticality} onChange={(e) => setForm((f) => ({ ...f, criticality: e.target.value }))}>
                  {CRITICALITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </div>
              <div>
                <Label className="text-xs">Location</Label>
                <Select required value={form.locationId} onChange={(e) => setForm((f) => ({ ...f, locationId: e.target.value }))}>
                  <option value="">Select…</option>
                  {locations?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </Select>
              </div>
              <div><Label className="text-xs">Lead Time (days)</Label><Input required type="number" value={form.leadTimeDays} onChange={(e) => setForm((f) => ({ ...f, leadTimeDays: Number(e.target.value) }))} /></div>
              <div><Label className="text-xs">Current Stock</Label><Input required type="number" value={form.currentStock} onChange={(e) => setForm((f) => ({ ...f, currentStock: Number(e.target.value) }))} /></div>
              <div><Label className="text-xs">Min Stock</Label><Input required type="number" value={form.minStockLevel} onChange={(e) => setForm((f) => ({ ...f, minStockLevel: Number(e.target.value) }))} /></div>
              <div><Label className="text-xs">Reorder Level</Label><Input required type="number" value={form.reorderLevel} onChange={(e) => setForm((f) => ({ ...f, reorderLevel: Number(e.target.value) }))} /></div>
              <div><Label className="text-xs">Max Stock</Label><Input required type="number" value={form.maxStockLevel} onChange={(e) => setForm((f) => ({ ...f, maxStockLevel: Number(e.target.value) }))} /></div>
              <div className="col-span-3 flex items-center justify-between">
                {formError && <p className="text-sm text-destructive">{formError}</p>}
                <Button type="submit" disabled={createMutation.isPending} className="ml-auto">Create</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex gap-3 pt-5">
          <Input placeholder="Search drug name or code…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
          <Select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="max-w-xs">
            <option value="">All Locations</option>
            {locations?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto pt-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="pb-2">Drug</th><th>Category</th><th>Location</th><th>Stock</th><th>Reorder Lvl</th>
                <th>Lead Time</th><th>Unit Cost</th><th>Value</th><th>Supplier</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-b border-border last:border-0">
                  <td className="py-2 font-medium">{i.drug.genericName} {i.drug.strength}</td>
                  <td className="text-muted-foreground">{i.drug.therapeuticCategory}</td>
                  <td className="text-muted-foreground">{i.location.name}</td>
                  <td>{i.currentStock} {i.drug.unit}</td>
                  <td className="text-muted-foreground">{i.reorderLevel}</td>
                  <td className="text-muted-foreground">{i.leadTimeDays}d</td>
                  <td className="text-muted-foreground">{formatCurrency(i.drug.unitCost)}</td>
                  <td>{formatCurrency(i.currentStock * i.drug.unitCost)}</td>
                  <td className="text-muted-foreground">{i.supplier?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No inventory matches your filters.</p>}
          <p className="pt-3 text-xs text-muted-foreground">{items.length} item(s)</p>
        </CardContent>
      </Card>
    </div>
  );
}
