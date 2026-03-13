import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer, QrCode, RefreshCcw, FilterX } from "lucide-react";
import { Link } from "wouter";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ThermalLabelPreview } from "@/components/thermal-label-preview";
import { ThermalPrintSupportNote } from "@/components/thermal-print-support-note";
import { PrintSettingLabel } from "@/components/print-setting-label";
import {
  buildQrValue,
  DEFAULT_THERMAL_LABEL_SETTINGS,
  THERMAL_LABEL_PRESETS,
  THERMAL_PRINT_STORAGE_KEY,
  type QrPayloadMode,
  type ThermalLabelInput,
  type ThermalLabelSettings,
  type ThermalLanguage,
} from "@/lib/labelGenerator";
import { describeQzError, printRawThermalLabels, resolvePreferredPrinterSelection } from "@/lib/qzTray";

type Garment = {
  id: string;
  code: string;
  size: string;
  color: string;
  status: string;
  qrUrl: string | null;
  rackId?: string | null;
  rack?: { id: string; code: string; name: string } | null;
  category?: { name: string };
  garmentType?: { name: string };
};

type Rack = {
  id: string;
  code: string;
  name: string;
  zone: string;
  qrUrl: string | null;
};

type GarmentSearchResponse = {
  items: Garment[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

const GARMENT_BATCH_LIMIT = 250;

function readStoredSettings() {
  if (typeof window === "undefined") {
    return {
      printerName: "",
      language: "tspl" as ThermalLanguage,
      qrMode: "code" as QrPayloadMode,
      presetKey: "40x25",
      settings: { ...DEFAULT_THERMAL_LABEL_SETTINGS },
    };
  }

  try {
    const parsed = JSON.parse(localStorage.getItem(THERMAL_PRINT_STORAGE_KEY) || "{}");
    return {
      printerName: parsed.printerName || "",
      language: parsed.language === "zpl" ? "zpl" : "tspl",
      qrMode: parsed.qrMode === "url" ? "url" : "code",
      presetKey: parsed.presetKey || "40x25",
      settings: { ...DEFAULT_THERMAL_LABEL_SETTINGS, ...(parsed.settings || {}) },
    };
  } catch {
    return {
      printerName: "",
      language: "tspl" as ThermalLanguage,
      qrMode: "code" as QrPayloadMode,
      presetKey: "40x25",
      settings: { ...DEFAULT_THERMAL_LABEL_SETTINGS },
    };
  }
}

function buildGarmentsQueryUrl(searchTerm: string, rackId: string) {
  const params = new URLSearchParams();
  if (searchTerm.trim()) params.set("q", searchTerm.trim());
  if (rackId && rackId !== "all") params.set("rackId", rackId);
  params.set("limit", String(GARMENT_BATCH_LIMIT));
  params.set("offset", "0");
  return `/api/garments/search?${params.toString()}`;
}

export default function CuratorPrintQRsPage() {
  const [selectedGarments, setSelectedGarments] = useState<string[]>([]);
  const [selectedRacks, setSelectedRacks] = useState<string[]>([]);
  const [garmentSearch, setGarmentSearch] = useState("");
  const [selectedRackFilter, setSelectedRackFilter] = useState<string>("all");
  const stored = useMemo(() => readStoredSettings(), []);
  const [printerName, setPrinterName] = useState<string>(stored.printerName);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [language, setLanguage] = useState<ThermalLanguage>(stored.language as ThermalLanguage);
  const [qrMode, setQrMode] = useState<QrPayloadMode>(stored.qrMode as QrPayloadMode);
  const [presetKey, setPresetKey] = useState<string>(stored.presetKey);
  const [settings, setSettings] = useState<ThermalLabelSettings>(stored.settings);
  const [isPrintingThermal, setIsPrintingThermal] = useState(false);
  const [isDetectingPrinter, setIsDetectingPrinter] = useState(false);
  const { toast } = useToast();

  const { data: racks = [], isLoading: racksLoading } = useQuery<Rack[]>({
    queryKey: ["/api/racks"],
  });

  const garmentsQueryUrl = useMemo(
    () => buildGarmentsQueryUrl(garmentSearch, selectedRackFilter),
    [garmentSearch, selectedRackFilter],
  );

  const {
    data: garmentsSearch,
    isLoading: garmentsLoading,
    isFetching: garmentsFetching,
    refetch: refetchGarments,
  } = useQuery<GarmentSearchResponse>({
    queryKey: [garmentsQueryUrl],
  });

  const garments = garmentsSearch?.items ?? [];
  const selectedRackMeta = racks.find((rack) => rack.id === selectedRackFilter);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      THERMAL_PRINT_STORAGE_KEY,
      JSON.stringify({ printerName, language, qrMode, presetKey, settings }),
    );
  }, [printerName, language, qrMode, presetKey, settings]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const resolved = await resolvePreferredPrinterSelection();
        if (!active) return;
        setAvailablePrinters(resolved.installedPrinters);
        setPrinterName((current) => {
          const currentTrimmed = current.trim();
          if (!currentTrimmed) return resolved.selectedPrinter;
          return resolved.installedPrinters.includes(currentTrimmed)
            ? currentTrimmed
            : resolved.selectedPrinter;
        });
      } catch {
        // manual input remains available
      }
    })();
    return () => {
      active = false;
    };
  }, [stored.printerName]);

  useEffect(() => {
    setSelectedGarments((prev) => prev.filter((id) => garments.some((garment) => garment.id === id)));
  }, [garments]);

  const handleBrowserPrint = () => window.print();

  const toggleGarment = (id: string) => {
    setSelectedGarments((prev) =>
      prev.includes(id) ? prev.filter((garmentId) => garmentId !== id) : [...prev, id],
    );
  };

  const toggleRack = (id: string) => {
    setSelectedRacks((prev) =>
      prev.includes(id) ? prev.filter((rackId) => rackId !== id) : [...prev, id],
    );
  };

  const selectAllVisibleGarments = () => setSelectedGarments(garments.map((garment) => garment.id));
  const clearVisibleGarments = () => setSelectedGarments([]);
  const selectAllRacks = () => setSelectedRacks(racks.map((rack) => rack.id));
  const clearAllRacks = () => setSelectedRacks([]);

  const selectedGarmentData = garments.filter((garment) => selectedGarments.includes(garment.id));
  const selectedRackData = racks.filter((rack) => selectedRacks.includes(rack.id));

  const selectedLabels = useMemo<ThermalLabelInput[]>(() => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return [
      ...selectedGarmentData.map((garment) => ({
        code: garment.code,
        title: settings.title,
        qrValue: buildQrValue({
          baseUrl,
          code: garment.code,
          mode: qrMode,
          entityPath: "garment",
        }),
      })),
      ...selectedRackData.map((rack) => ({
        code: rack.code,
        title: settings.title,
        qrValue: buildQrValue({
          baseUrl,
          code: rack.code,
          mode: qrMode,
          entityPath: "rack",
        }),
      })),
    ];
  }, [selectedGarmentData, selectedRackData, settings.title, qrMode]);

  const previewLabel = selectedLabels[0] || {
    code: "GAR-000",
    title: settings.title,
    qrValue: buildQrValue({
      baseUrl: typeof window !== "undefined" ? window.location.origin : "",
      code: "GAR-000",
      mode: qrMode,
      entityPath: "garment",
    }),
  };

  const applyPreset = (key: string) => {
    setPresetKey(key);
    const preset = THERMAL_LABEL_PRESETS.find((item) => item.key === key);
    if (preset) {
      setSettings((prev) => ({
        ...prev,
        ...preset.settings,
        title: prev.title || preset.settings.title,
      }));
    }
  };

  const handleDetectPrinter = async () => {
    try {
      setIsDetectingPrinter(true);
      const resolved = await resolvePreferredPrinterSelection();
      setAvailablePrinters(resolved.installedPrinters);
      setPrinterName(resolved.selectedPrinter);
      toast({
        title: "Impresora detectada",
        description:
          resolved.defaultPrinter ||
          resolved.selectedPrinter ||
          "No se detectó una impresora por defecto.",
      });
    } catch (error) {
      toast({
        title: "No se pudo detectar la impresora",
        description: describeQzError(error),
        variant: "destructive",
      });
    } finally {
      setIsDetectingPrinter(false);
    }
  };

  const handleThermalPrint = async () => {
    if (!selectedLabels.length) return;
    try {
      setIsPrintingThermal(true);
      await printRawThermalLabels({
        printerName,
        language,
        labels: selectedLabels,
        settings,
        jobName: `Archive batch ${selectedLabels.length}`,
      });
      toast({
        title: "Etiquetas enviadas",
        description: `${selectedLabels.length} etiqueta(s) enviadas a ${printerName || "la impresora"}`,
      });
    } catch (error) {
      toast({
        title: "No se pudo imprimir",
        description: describeQzError(error),
        variant: "destructive",
      });
    } finally {
      setIsPrintingThermal(false);
    }
  };

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .print-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1cm;
            padding: 1cm;
          }
          .print-item { display: flex; flex-direction: column; align-items: center; page-break-inside: avoid; }
          .print-item svg { width: 38mm; height: 38mm; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print space-y-6 overflow-x-hidden">
        <div className="flex items-start gap-3 sm:items-center sm:gap-4">
          <Link href="/curator">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold sm:text-3xl">Print QR Codes</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Masivo: navegador o térmica usando el mismo motor que las pantallas individuales.
            </p>
            <ThermalPrintSupportNote />
          </div>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-6">
            <Tabs defaultValue="garments" className="min-w-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="garments" className="min-w-0">
                  <span className="truncate">Garments ({garmentsSearch?.total ?? garments.length})</span>
                </TabsTrigger>
                <TabsTrigger value="racks" className="min-w-0">
                  <span className="truncate">Racks ({racks.length})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="garments" className="space-y-4">
                <Card className="min-w-0">
                  <CardHeader>
                    <CardTitle>Filter garments</CardTitle>
                    <CardDescription>
                      Busca por código o filtra por rack para imprimir solo lo que está dentro de un rack específico.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                      <Input
                        placeholder="Search garment code, color or description"
                        value={garmentSearch}
                        onChange={(e) => setGarmentSearch(e.target.value)}
                      />
                      <Select value={selectedRackFilter} onValueChange={setSelectedRackFilter}>
                        <SelectTrigger className="min-w-0">
                          <SelectValue placeholder="Filter by rack" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All racks</SelectItem>
                          {racks.map((rack) => (
                            <SelectItem key={rack.id} value={rack.id}>
                              {rack.code} · {rack.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setGarmentSearch("");
                          setSelectedRackFilter("all");
                        }}
                      >
                        <FilterX className="mr-2 h-4 w-4" />
                        Clear
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {selectedRackMeta ? (
                        <Badge variant="secondary">
                          Rack filter: {selectedRackMeta.code} · {selectedRackMeta.name}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Showing garments from all racks</Badge>
                      )}
                      {!!garmentSearch.trim() && (
                        <Badge variant="secondary">Search: {garmentSearch.trim()}</Badge>
                      )}
                      <Badge variant="outline">Visible garments: {garmentsSearch?.total ?? garments.length}</Badge>
                      <Badge variant="outline">Selected: {selectedGarments.length}</Badge>
                    </div>
                  </CardContent>
                </Card>

                {garmentsLoading ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-16">
                      <p className="text-lg text-muted-foreground">Loading garments...</p>
                    </CardContent>
                  </Card>
                ) : garments.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                      <QrCode className="mb-4 h-16 w-16 text-muted-foreground" />
                      <p className="text-lg text-muted-foreground">No garments available</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Adjust the search or rack filter and try again.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="min-w-0">
                    <CardHeader>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <CardTitle>Select Garments</CardTitle>
                          <CardDescription>
                            {selectedRackMeta
                              ? `Printing garments assigned to ${selectedRackMeta.code}.`
                              : "Choose garments to print."}
                          </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => void refetchGarments()}>
                            <RefreshCcw className={`mr-2 h-4 w-4 ${garmentsFetching ? "animate-spin" : ""}`} />
                            Refresh
                          </Button>
                          <Button variant="outline" size="sm" onClick={clearVisibleGarments}>
                            Clear selected
                          </Button>
                          <Button variant="outline" size="sm" onClick={selectAllVisibleGarments}>
                            Select visible
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-[28rem] space-y-3 overflow-y-auto">
                        {garments.map((garment) => (
                          <div
                            key={garment.id}
                            className="cursor-pointer rounded-lg border p-3 transition-colors hover:bg-muted/40"
                            onClick={() => toggleGarment(garment.id)}
                          >
                            <div className="flex items-start gap-3 sm:gap-4">
                              <Checkbox
                                checked={selectedGarments.includes(garment.id)}
                                onCheckedChange={() => toggleGarment(garment.id)}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <p className="truncate font-mono text-sm font-medium">{garment.code}</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    <Badge variant="outline" className="text-xs">{garment.size}</Badge>
                                    <Badge variant="outline" className="text-xs">{garment.color}</Badge>
                                    {garment.rack?.code && (
                                      <Badge variant="secondary" className="text-xs">{garment.rack.code}</Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                  {garment.category?.name && <span>{garment.category.name}</span>}
                                  {garment.garmentType?.name && <span>• {garment.garmentType.name}</span>}
                                  {garment.rack?.name && <span>• {garment.rack.name}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="racks" className="space-y-4">
                {racksLoading ? (
                  <Card>
                    <CardContent className="flex items-center justify-center py-16">
                      <p className="text-lg text-muted-foreground">Loading racks...</p>
                    </CardContent>
                  </Card>
                ) : racks.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                      <QrCode className="mb-4 h-16 w-16 text-muted-foreground" />
                      <p className="text-lg text-muted-foreground">No racks available</p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="min-w-0">
                    <CardHeader>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <CardTitle>Select Racks</CardTitle>
                          <CardDescription>Choose racks to print.</CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={clearAllRacks}>
                            Clear selected
                          </Button>
                          <Button variant="outline" size="sm" onClick={selectAllRacks}>
                            Select all
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-[28rem] space-y-3 overflow-y-auto">
                        {racks.map((rack) => (
                          <div
                            key={rack.id}
                            className="cursor-pointer rounded-lg border p-3 transition-colors hover:bg-muted/40"
                            onClick={() => toggleRack(rack.id)}
                          >
                            <div className="flex items-start gap-3 sm:gap-4">
                              <Checkbox checked={selectedRacks.includes(rack.id)} onCheckedChange={() => toggleRack(rack.id)} />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <p className="truncate font-mono text-sm font-medium">{rack.code}</p>
                                  <Badge variant="outline" className="w-fit text-xs">{rack.zone}</Badge>
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">{rack.name}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            <Card className="min-w-0">
              <CardHeader>
                <CardTitle>Preview en tiempo real</CardTitle>
                <CardDescription>
                  Vista previa fiel al layout lógico aplicado a la primera etiqueta seleccionada.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex min-h-[240px] items-center justify-center overflow-auto rounded-lg border bg-muted/30 p-4 sm:p-6">
                  <ThermalLabelPreview
                    title={settings.title}
                    code={previewLabel.code}
                    qrValue={previewLabel.qrValue || previewLabel.code}
                    settings={settings}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-md border p-3">
                    <p className="text-sm font-medium">Primera etiqueta</p>
                    <p className="mt-1 break-all font-mono text-sm text-muted-foreground">{previewLabel.code}</p>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="text-sm font-medium">Payload QR</p>
                    <p className="mt-1 break-all text-sm text-muted-foreground">{previewLabel.qrValue || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="min-w-0 xl:sticky xl:top-6">
            <CardHeader>
              <CardTitle>Thermal batch print</CardTitle>
              <CardDescription>
                En mobile esta configuración queda al final para seguir un flujo más natural: primero eliges qué imprimir y luego cómo imprimirlo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <PrintSettingLabel help="Selecciona una impresora detectada por QZ Tray o escribe una variante cercana del nombre. El motor resolverá coincidencias simples automáticamente.">
                  Impresora
                </PrintSettingLabel>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Select
                    value={availablePrinters.includes(printerName) ? printerName : "__manual__"}
                    onValueChange={(value) => {
                      if (value === "__manual__") {
                        setPrinterName("");
                        return;
                      }
                      setPrinterName(value);
                    }}
                  >
                    <SelectTrigger className="min-w-0">
                      <SelectValue placeholder="Selecciona impresora" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePrinters.map((printer) => (
                        <SelectItem key={printer} value={printer}>
                          {printer}
                        </SelectItem>
                      ))}
                      <SelectItem value="__manual__">Escribir manualmente</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" onClick={handleDetectPrinter} disabled={isDetectingPrinter}>
                    <RefreshCcw className={`mr-2 h-4 w-4 ${isDetectingPrinter ? "animate-spin" : ""}`} />
                    Detectar
                  </Button>
                </div>
                {!availablePrinters.includes(printerName) && (
                  <Input
                    placeholder="Nombre manual de impresora"
                    value={printerName}
                    onChange={(e) => setPrinterName(e.target.value)}
                  />
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
                <div className="space-y-2">
                  <PrintSettingLabel help="TSPL suele ser la mejor opción para etiquetas térmicas compactas.">
                    Lenguaje
                  </PrintSettingLabel>
                  <Select value={language} onValueChange={(value) => setLanguage(value as ThermalLanguage)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tspl">TSPL</SelectItem>
                      <SelectItem value="zpl">ZPL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <PrintSettingLabel help="Aplica proporciones listas para 40x25 o 50x30 sin recalibrar a mano desde cero.">
                    Preset
                  </PrintSettingLabel>
                  <Select value={presetKey} onValueChange={applyPreset}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {THERMAL_LABEL_PRESETS.map((preset) => (
                        <SelectItem key={preset.key} value={preset.key}>
                          {preset.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <PrintSettingLabel help="Mueve todo el texto horizontalmente sin alterar el tamaño de la etiqueta.">
                    Offset texto X (dots)
                  </PrintSettingLabel>
                  <Input
                    type="number"
                    value={settings.textOffsetX}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, textOffsetX: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <PrintSettingLabel help="Mueve todo el texto verticalmente sin afectar el QR.">
                    Offset texto Y (dots)
                  </PrintSettingLabel>
                  <Input
                    type="number"
                    value={settings.textOffsetY}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, textOffsetY: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <PrintSettingLabel help="Mueve solo el QR horizontalmente, sin afectar los textos.">
                    Offset QR X (dots)
                  </PrintSettingLabel>
                  <Input
                    type="number"
                    value={settings.qrOffsetX}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, qrOffsetX: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <PrintSettingLabel help="Mueve solo el QR verticalmente, sin afectar los textos.">
                    Offset QR Y (dots)
                  </PrintSettingLabel>
                  <Input
                    type="number"
                    value={settings.qrOffsetY}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, qrOffsetY: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <PrintSettingLabel help="Texto superior opcional. Cuando está activo, el motor recalcula el espacio para no montar el QR sobre el título.">
                  Título
                </PrintSettingLabel>
                <Input
                  value={settings.title}
                  onChange={(e) => setSettings((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <PrintSettingLabel help="El QR puede contener solo el código o la URL completa del item.">
                  Contenido del QR
                </PrintSettingLabel>
                <Select value={qrMode} onValueChange={(value) => setQrMode(value as QrPayloadMode)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="code">Solo código</SelectItem>
                    <SelectItem value="url">URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="font-medium">Mostrar título</p>
                  <p className="text-xs text-muted-foreground">Encabezado superior.</p>
                </div>
                <Switch
                  checked={settings.showTitle}
                  onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, showTitle: checked }))}
                />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="font-medium">Incluir QR</p>
                  <p className="text-xs text-muted-foreground">
                    Déjalo apagado si necesitas máxima compatibilidad.
                  </p>
                </div>
                <Switch
                  checked={settings.includeQr}
                  onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, includeQr: checked }))}
                />
              </div>

              <div className="rounded-md border bg-muted/20 p-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Etiquetas: {selectedLabels.length}</Badge>
                  <Badge variant="outline">Garments: {selectedGarmentData.length}</Badge>
                  <Badge variant="outline">Racks: {selectedRackData.length}</Badge>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleThermalPrint}
                  disabled={!selectedLabels.length || !printerName.trim() || isPrintingThermal}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  {isPrintingThermal ? "Enviando..." : `Imprimir térmica (${selectedLabels.length})`}
                </Button>
                <Button variant="outline" onClick={handleBrowserPrint}>
                  Imprimir navegador
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div id="print-area" className="hidden print:block">
        <div className="print-grid">
          {selectedGarmentData.map((garment) => {
            const value = buildQrValue({
              baseUrl: typeof window !== "undefined" ? window.location.origin : "",
              code: garment.code,
              mode: qrMode,
              entityPath: "garment",
            });
            return (
              <div key={garment.id} className="print-item">
                <QRCodeSVG value={value} size={512} level="M" includeMargin={true} />
                <p className="mt-2 font-mono text-base font-semibold">{garment.code}</p>
                {garment.rack?.code ? (
                  <p className="text-sm text-muted-foreground">{garment.rack.code}</p>
                ) : null}
              </div>
            );
          })}
          {selectedRackData.map((rack) => {
            const value = buildQrValue({
              baseUrl: typeof window !== "undefined" ? window.location.origin : "",
              code: rack.code,
              mode: qrMode,
              entityPath: "rack",
            });
            return (
              <div key={rack.id} className="print-item">
                <QRCodeSVG value={value} size={512} level="M" includeMargin={true} />
                <p className="mt-2 font-mono text-base font-semibold">{rack.code}</p>
                <p className="text-sm text-muted-foreground">
                  {rack.name} • {rack.zone}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
