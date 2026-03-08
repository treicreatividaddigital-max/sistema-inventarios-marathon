import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, PlusCircle, Trash2, Upload } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";

type TaxonomySummary = {
  sheet: string;
  rows: number;
  categoriesInserted: number;
  typesInserted: number;
  collectionsInserted: number;
  yearsInserted: number;
  lotsInserted: number;
  skippedRows: number;
  processedRows: number;
};

type CustomFieldSummary = {
  rows: number;
  fieldsInserted: number;
  fieldsUpdated: number;
  optionsInserted: number;
  optionsSkipped: number;
  skippedRows: number;
};

type CustomField = {
  id: string;
  key: string;
  label: string;
  inputType: string;
  isRequired: boolean;
  options: { id: string; value: string; label: string }[];
};

const tokenHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("token");

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};

async function downloadProtectedFile(url: string, filename: string) {
  const res = await fetch(url, {
    headers: tokenHeaders(),
  });

  if (!res.ok) {
    throw new Error(`Download failed (${res.status})`);
  }

  const blob = await res.blob();
  const objectUrl = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(objectUrl);
}

export default function AdminTaxonomyImportPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const taxonomyInputRef = useRef<HTMLInputElement | null>(null);
  const customFieldInputRef = useRef<HTMLInputElement | null>(null);

  const [taxonomyFileName, setTaxonomyFileName] = useState("");
  const [customFieldFileName, setCustomFieldFileName] = useState("");
  const [taxonomySummary, setTaxonomySummary] = useState<TaxonomySummary | null>(null);
  const [customFieldSummary, setCustomFieldSummary] = useState<CustomFieldSummary | null>(null);
  const [fieldDraft, setFieldDraft] = useState({
    key: "",
    label: "",
    inputType: "select",
    isRequired: false,
    isFilterable: true,
    isSearchable: true,
  });

  const customFieldsQuery = useQuery<CustomField[]>({
    queryKey: ["/api/custom-fields/garment"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user?.isMasterCurator,
  });

  const refreshCustomFields = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/custom-fields/garment"] });
  };

  const importTaxonomyMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiRequest("POST", "/api/admin/taxonomy/import", formData);
    },
    onSuccess: async (result) => {
      setTaxonomySummary(result.summary);
      toast({ title: "Taxonomy imported", description: "Seeds y etiquetas base actualizados." });
    },
    onError: (error: any) => {
      toast({ title: "Taxonomy import failed", description: error?.message || "Unknown error", variant: "destructive" });
    },
  });

  const createFieldMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/admin/custom-fields", fieldDraft),
    onSuccess: async () => {
      toast({ title: "Custom field created", description: "El nuevo campo configurable ya está disponible." });
      setFieldDraft({ key: "", label: "", inputType: "select", isRequired: false, isFilterable: true, isSearchable: true });
      await refreshCustomFields();
    },
    onError: (error: any) => {
      toast({ title: "Field creation failed", description: error?.message || "Unknown error", variant: "destructive" });
    },
  });

  const deleteFieldMutation = useMutation({
    mutationFn: async (fieldId: string) => apiRequest("DELETE", `/api/admin/custom-fields/${fieldId}`),
    onSuccess: async () => {
      toast({ title: "Field archived", description: "El campo configurable se ocultó sin borrar los datos históricos." });
      await refreshCustomFields();
    },
    onError: (error: any) => {
      toast({ title: "Could not archive field", description: error?.message || "Unknown error", variant: "destructive" });
    },
  });

  const importCustomFieldsMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiRequest("POST", "/api/admin/custom-fields/import", formData);
    },
    onSuccess: async (result) => {
      setCustomFieldSummary(result.summary);
      toast({ title: "Custom fields imported", description: "Campos y opciones configurables cargados correctamente." });
      await refreshCustomFields();
    },
    onError: (error: any) => {
      toast({ title: "Custom fields import failed", description: error?.message || "Unknown error", variant: "destructive" });
    },
  });

  if (!user?.isMasterCurator) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>Only the master curator can configure taxonomy and custom labels.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold">Taxonomy & Custom Fields</h1>
        <p className="text-muted-foreground mt-2">
          Los campos base siguen igual. Aquí agregas campos extra como Marca, Torneo o Sponsor para cada garment.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cómo usar custom fields</CardTitle>
          <CardDescription>Paso a paso simple para no perderse.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><strong>Paso 1.</strong> Descarga la plantilla.</p>
          <p><strong>Paso 2.</strong> Usa una fila por cada opción.</p>
          <p><strong>Paso 3.</strong> Repite <code>field_key</code> para meter más opciones en el mismo campo.</p>
          <p><strong>Paso 4.</strong> Sube el archivo.</p>
          <p><strong>Paso 5.</strong> Revisa el resultado abajo en “Current custom fields”.</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Base taxonomy template</CardTitle>
            <CardDescription>Plantilla oficial para categorías, colecciones, años y lotes base.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={() => downloadProtectedFile("/api/admin/taxonomy/template", "template-taxonomy.xlsx")}>
              <Download className="h-4 w-4 mr-2" />
              Download taxonomy template
            </Button>

            <input
              ref={taxonomyInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => setTaxonomyFileName(e.target.files?.[0]?.name || "")}
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={() => taxonomyInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Choose taxonomy file
              </Button>
              <span className="text-sm text-muted-foreground">{taxonomyFileName || "No file selected"}</span>
            </div>

            <Button
              type="button"
              disabled={!taxonomyInputRef.current?.files?.[0] || importTaxonomyMutation.isPending}
              onClick={() => {
                const file = taxonomyInputRef.current?.files?.[0];
                if (file) importTaxonomyMutation.mutate(file);
              }}
            >
              {importTaxonomyMutation.isPending ? "Importing..." : "Import taxonomy"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custom fields template</CardTitle>
            <CardDescription>Descarga la plantilla, llena una fila por cada opción y vuelve a subirla. El archivo trae ejemplos listos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={() => downloadProtectedFile("/api/admin/custom-fields/template", "custom-fields-template.xlsx")}>
              <Download className="h-4 w-4 mr-2" />
              Download custom fields template
            </Button>

            <input
              ref={customFieldInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => setCustomFieldFileName(e.target.files?.[0]?.name || "")}
            />

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" onClick={() => customFieldInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Choose custom fields file
              </Button>
              <span className="text-sm text-muted-foreground">{customFieldFileName || "No file selected"}</span>
            </div>

            <Button
              type="button"
              disabled={!customFieldInputRef.current?.files?.[0] || importCustomFieldsMutation.isPending}
              onClick={() => {
                const file = customFieldInputRef.current?.files?.[0];
                if (file) importCustomFieldsMutation.mutate(file);
              }}
            >
              {importCustomFieldsMutation.isPending ? "Importing..." : "Import custom fields"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create custom field</CardTitle>
          <CardDescription>Crea un campo extra manualmente. Ejemplos: Marca, Torneo, Sponsor, Parche, Sub.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="field-label">Visible label (lo que verá el usuario)</Label>
              <Input id="field-label" value={fieldDraft.label} onChange={(e) => setFieldDraft((prev) => ({ ...prev, label: e.target.value }))} placeholder="Marca" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="field-key">Technical key (sin espacios ni acentos)</Label>
              <Input id="field-key" value={fieldDraft.key} onChange={(e) => setFieldDraft((prev) => ({ ...prev, key: e.target.value }))} placeholder="marca" />
              <p className="text-xs text-muted-foreground">Ejemplo: marca, torneo, etiqueta, sponsor, parche.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-2 rounded-md border p-3">
              <Checkbox checked={fieldDraft.isRequired} onCheckedChange={(checked) => setFieldDraft((prev) => ({ ...prev, isRequired: checked === true }))} />
              <span className="text-sm">Required</span>
            </div>
            <div className="flex items-center gap-2 rounded-md border p-3">
              <Checkbox checked={fieldDraft.isFilterable} onCheckedChange={(checked) => setFieldDraft((prev) => ({ ...prev, isFilterable: checked !== false }))} />
              <span className="text-sm">Filterable</span>
            </div>
            <div className="flex items-center gap-2 rounded-md border p-3">
              <Checkbox checked={fieldDraft.isSearchable} onCheckedChange={(checked) => setFieldDraft((prev) => ({ ...prev, isSearchable: checked !== false }))} />
              <span className="text-sm">Searchable</span>
            </div>
          </div>
          <Button type="button" onClick={() => createFieldMutation.mutate()} disabled={!fieldDraft.key.trim() || !fieldDraft.label.trim() || createFieldMutation.isPending}>
            <PlusCircle className="h-4 w-4 mr-2" />
            {createFieldMutation.isPending ? "Creating..." : "Create custom field"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current custom fields</CardTitle>
          <CardDescription>Estos campos aparecen en crear y editar garment. Puedes archivarlos sin borrar el historial.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(customFieldsQuery.data ?? []).map((field) => (
              <div key={field.id} className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{field.label}</div>
                    <div className="text-xs text-muted-foreground">{field.key}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground">{field.options.length} option(s)</div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        const confirmed = window.confirm(`Archive configurable field "${field.label}"? It will disappear from the forms but existing garments will keep their saved values.`);
                        if (confirmed) deleteFieldMutation.mutate(field.id);
                      }}
                      disabled={deleteFieldMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {field.options.slice(0, 6).map((option) => (
                    <span key={option.id} className="text-xs rounded-full border px-2 py-1">{option.label}</span>
                  ))}
                  {field.options.length > 6 && <span className="text-xs text-muted-foreground">+{field.options.length - 6} more</span>}
                </div>
              </div>
            ))}
            {customFieldsQuery.data?.length === 0 && <div className="text-sm text-muted-foreground">No configurable fields yet.</div>}
          </div>
        </CardContent>
      </Card>

      {taxonomySummary && (
        <Card>
          <CardHeader>
            <CardTitle>Last taxonomy import</CardTitle>
            <CardDescription>Hoja procesada: {taxonomySummary.sheet}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Rows parsed" value={taxonomySummary.rows} />
              <MetricCard label="Processed rows" value={taxonomySummary.processedRows} />
              <MetricCard label="Categories inserted" value={taxonomySummary.categoriesInserted} />
              <MetricCard label="Types inserted" value={taxonomySummary.typesInserted} />
              <MetricCard label="Collections inserted" value={taxonomySummary.collectionsInserted} />
              <MetricCard label="Years inserted" value={taxonomySummary.yearsInserted} />
              <MetricCard label="Lots inserted" value={taxonomySummary.lotsInserted} />
              <MetricCard label="Skipped rows" value={taxonomySummary.skippedRows} />
            </div>
          </CardContent>
        </Card>
      )}

      {customFieldSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Last custom fields import</CardTitle>
            <CardDescription>Resumen de la última importación de campos extra.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard label="Rows parsed" value={customFieldSummary.rows} />
              <MetricCard label="Fields inserted" value={customFieldSummary.fieldsInserted} />
              <MetricCard label="Fields updated" value={customFieldSummary.fieldsUpdated} />
              <MetricCard label="Options inserted" value={customFieldSummary.optionsInserted} />
              <MetricCard label="Options skipped" value={customFieldSummary.optionsSkipped} />
              <MetricCard label="Skipped rows" value={customFieldSummary.skippedRows} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
