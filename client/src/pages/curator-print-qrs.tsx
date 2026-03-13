import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer, QrCode, RefreshCcw } from "lucide-react";
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

function readStoredSettings() {
  if (typeof window === "undefined") {
    return { printerName: "", language: "tspl" as ThermalLanguage, qrMode: "code" as QrPayloadMode, presetKey: "40x25", settings: { ...DEFAULT_THERMAL_LABEL_SETTINGS } };
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
    return { printerName: "", language: "tspl" as ThermalLanguage, qrMode: "code" as QrPayloadMode, presetKey: "40x25", settings: { ...DEFAULT_THERMAL_LABEL_SETTINGS } };
  }
}

export default function CuratorPrintQRsPage() {
  const [selectedGarments, setSelectedGarments] = useState<string[]>([]);
  const [selectedRacks, setSelectedRacks] = useState<string[]>([]);
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

  const { data: garments = [], isLoading: garmentsLoading } = useQuery<Garment[]>({ queryKey: ["/api/garments"] });
  const { data: racks = [], isLoading: racksLoading } = useQuery<Rack[]>({ queryKey: ["/api/racks"] });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(THERMAL_PRINT_STORAGE_KEY, JSON.stringify({ printerName, language, qrMode, presetKey, settings }));
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
          return resolved.installedPrinters.includes(currentTrimmed) ? currentTrimmed : resolved.selectedPrinter;
        });
      } catch {
        // allow manual input
      }
    })();
    return () => {
      active = false;
    };
  }, [stored.printerName]);

  const handleBrowserPrint = () => window.print();
  const toggleGarment = (id: string) => setSelectedGarments((prev) => prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]);
  const toggleRack = (id: string) => setSelectedRacks((prev) => prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]);
  const selectAllGarments = () => setSelectedGarments(garments.map((g) => g.id));
  const selectAllRacks = () => setSelectedRacks(racks.map((r) => r.id));

  const selectedGarmentData = garments.filter((g) => selectedGarments.includes(g.id));
  const selectedRackData = racks.filter((r) => selectedRacks.includes(r.id));

  const selectedLabels = useMemo<ThermalLabelInput[]>(() => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return [
      ...selectedGarmentData.map((garment) => ({
        code: garment.code,
        title: settings.title,
        qrValue: buildQrValue({ baseUrl, code: garment.code, mode: qrMode, entityPath: "garment" }),
      })),
      ...selectedRackData.map((rack) => ({
        code: rack.code,
        title: settings.title,
        qrValue: buildQrValue({ baseUrl, code: rack.code, mode: qrMode, entityPath: "rack" }),
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
    if (preset) setSettings((prev) => ({ ...prev, ...preset.settings, title: prev.title || preset.settings.title }));
  };

  const handleDetectPrinter = async () => {
    try {
      setIsDetectingPrinter(true);
      const resolved = await resolvePreferredPrinterSelection();
      setAvailablePrinters(resolved.installedPrinters);
      setPrinterName(resolved.selectedPrinter);
      toast({
        title: "Impresora detectada",
        description: resolved.defaultPrinter || resolved.selectedPrinter || "No se detectó una impresora por defecto.",
      });
    } catch (error) {
      toast({ title: "No se pudo detectar la impresora", description: describeQzError(error), variant: "destructive" });
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
      toast({ title: "Etiquetas enviadas", description: `${selectedLabels.length} etiqueta(s) enviadas a ${printerName || "la impresora"}` });
    } catch (error) {
      toast({ title: "No se pudo imprimir", description: describeQzError(error), variant: "destructive" });
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

      <div className="space-y-6 no-print">
        <div className="flex items-center gap-4">
          <Link href="/curator"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-semibold">Print QR Codes</h1>
            <p className="text-muted-foreground mt-2">Masivo: navegador o térmica usando el mismo motor que las pantallas individuales.</p>
            <ThermalPrintSupportNote />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Thermal batch print</CardTitle>
              <CardDescription>Una sola configuración compartida para todo el sitio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <PrintSettingLabel help="Selecciona una impresora detectada por QZ Tray o escribe una variante cercana del nombre. El motor resolverá coincidencias simples automáticamente.">Impresora</PrintSettingLabel>
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
                    <SelectTrigger><SelectValue placeholder="Selecciona impresora" /></SelectTrigger>
                    <SelectContent>
                      {availablePrinters.map((printer) => <SelectItem key={printer} value={printer}>{printer}</SelectItem>)}
                      <SelectItem value="__manual__">Escribir manualmente</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={handleDetectPrinter} disabled={isDetectingPrinter}><RefreshCcw className={`h-4 w-4 ${isDetectingPrinter ? "animate-spin" : ""}`} /></Button>
                </div>
                <Input value={printerName} onChange={(e) => setPrinterName(e.target.value)} placeholder="Avicar_THERM" />
              </div>

              <div className="space-y-2"><PrintSettingLabel help="TSPL es la opción recomendada para esta impresora. Usa ZPL solo si tu hardware lo soporta y ya lo validaste.">Lenguaje térmico</PrintSettingLabel><Select value={language} onValueChange={(value) => setLanguage(value as ThermalLanguage)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tspl">TSPL</SelectItem><SelectItem value="zpl">ZPL</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><PrintSettingLabel help="Presets rápidos para tamaños comunes. Custom mantiene tus valores manuales.">Preset de etiqueta</PrintSettingLabel><Select value={presetKey} onValueChange={applyPreset}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{THERMAL_LABEL_PRESETS.map((preset) => <SelectItem key={preset.key} value={preset.key}>{preset.label}</SelectItem>)}<SelectItem value="custom">Custom</SelectItem></SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><PrintSettingLabel help="Ancho total de la etiqueta. Tu rollo validado actual es 40 mm.">Ancho (mm)</PrintSettingLabel><Input type="number" value={settings.widthMm} onChange={(e) => setSettings((prev) => ({ ...prev, widthMm: Number(e.target.value) || prev.widthMm }))} /></div>
                <div className="space-y-2"><PrintSettingLabel help="Alto total de la etiqueta. Tu rollo validado actual es 25 mm.">Alto (mm)</PrintSettingLabel><Input type="number" value={settings.heightMm} onChange={(e) => setSettings((prev) => ({ ...prev, heightMm: Number(e.target.value) || prev.heightMm }))} /></div>
                <div className="space-y-2"><PrintSettingLabel help="Distancia entre etiquetas. Si salta una etiqueta, este valor suele ser el primero que debes revisar.">Gap (mm)</PrintSettingLabel><Input type="number" value={settings.gapMm} onChange={(e) => setSettings((prev) => ({ ...prev, gapMm: Number(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><PrintSettingLabel help="Tamaño objetivo del QR. Si no cabe, el motor lo reduce automáticamente para evitar montajes.">QR (mm)</PrintSettingLabel><Input type="number" value={settings.qrSizeMm} onChange={(e) => setSettings((prev) => ({ ...prev, qrSizeMm: Number(e.target.value) || prev.qrSizeMm }))} /></div>
                <div className="space-y-2"><PrintSettingLabel help="Desplaza todo el contenido horizontalmente en dots para microajustes finos de impresora.">Offset X (dots)</PrintSettingLabel><Input type="number" value={settings.offsetX} onChange={(e) => setSettings((prev) => ({ ...prev, offsetX: Number(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><PrintSettingLabel help="Desplaza todo el contenido verticalmente en dots. Útil para alinear mejor con el gap real del papel.">Offset Y (dots)</PrintSettingLabel><Input type="number" value={settings.offsetY} onChange={(e) => setSettings((prev) => ({ ...prev, offsetY: Number(e.target.value) || 0 }))} /></div>
                <div className="space-y-2">
                  <PrintSettingLabel help="Mueve solo los textos horizontalmente, sin afectar el QR.">Offset texto X (dots)</PrintSettingLabel>
                  <Input type="number" value={settings.textOffsetX} onChange={(e) => setSettings((prev) => ({ ...prev, textOffsetX: Number(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <PrintSettingLabel help="Mueve solo los textos verticalmente, sin afectar el QR.">Offset texto Y (dots)</PrintSettingLabel>
                  <Input type="number" value={settings.textOffsetY} onChange={(e) => setSettings((prev) => ({ ...prev, textOffsetY: Number(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <PrintSettingLabel help="Mueve solo el QR horizontalmente, sin afectar los textos.">Offset QR X (dots)</PrintSettingLabel>
                  <Input type="number" value={settings.qrOffsetX} onChange={(e) => setSettings((prev) => ({ ...prev, qrOffsetX: Number(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <PrintSettingLabel help="Mueve solo el QR verticalmente, sin afectar los textos.">Offset QR Y (dots)</PrintSettingLabel>
                  <Input type="number" value={settings.qrOffsetY} onChange={(e) => setSettings((prev) => ({ ...prev, qrOffsetY: Number(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="space-y-2"><PrintSettingLabel help="Texto superior opcional. Cuando está activo, el motor recalcula el espacio para no montar el QR sobre el título.">Título</PrintSettingLabel><Input value={settings.title} onChange={(e) => setSettings((prev) => ({ ...prev, title: e.target.value }))} /></div>
              <div className="space-y-2"><PrintSettingLabel help="El QR puede contener solo el código o la URL completa del item.">Contenido del QR</PrintSettingLabel><Select value={qrMode} onValueChange={(value) => setQrMode(value as QrPayloadMode)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="code">Solo código</SelectItem><SelectItem value="url">URL</SelectItem></SelectContent></Select></div>
              <div className="flex items-center justify-between rounded-md border p-3"><div><p className="font-medium">Mostrar título</p><p className="text-xs text-muted-foreground">Encabezado superior.</p></div><Switch checked={settings.showTitle} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, showTitle: checked }))} /></div>
              <div className="flex items-center justify-between rounded-md border p-3"><div><p className="font-medium">Incluir QR</p><p className="text-xs text-muted-foreground">Déjalo apagado si necesitas máxima compatibilidad.</p></div><Switch checked={settings.includeQr} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, includeQr: checked }))} /></div>
              <div className="flex flex-col gap-2">
                <Button onClick={handleThermalPrint} disabled={!selectedLabels.length || !printerName.trim() || isPrintingThermal}><Printer className="mr-2 h-4 w-4" />{isPrintingThermal ? "Enviando..." : `Imprimir térmica (${selectedLabels.length})`}</Button>
                <Button variant="outline" onClick={handleBrowserPrint}>Imprimir navegador</Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Preview en tiempo real</CardTitle>
                <CardDescription>Vista previa fiel al layout lógico aplicado a la primera etiqueta seleccionada.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex min-h-[240px] overflow-auto items-center justify-center rounded-lg border bg-muted/30 p-6">
                  <ThermalLabelPreview title={settings.title} code={previewLabel.code} qrValue={previewLabel.qrValue || previewLabel.code} settings={settings} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-md border p-3"><p className="text-sm font-medium">Primera etiqueta</p><p className="mt-1 font-mono text-sm text-muted-foreground">{previewLabel.code}</p></div>
                  <div className="rounded-md border p-3"><p className="text-sm font-medium">Payload QR</p><p className="mt-1 break-all text-sm text-muted-foreground">{previewLabel.qrValue || "-"}</p></div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="garments">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="garments">Garments ({garments.length})</TabsTrigger>
                <TabsTrigger value="racks">Racks ({racks.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="garments" className="space-y-4">
                {garmentsLoading ? (
                  <Card><CardContent className="flex items-center justify-center py-16"><p className="text-lg text-muted-foreground">Loading garments...</p></CardContent></Card>
                ) : garments.length === 0 ? (
                  <Card><CardContent className="flex flex-col items-center justify-center py-16"><QrCode className="h-16 w-16 text-muted-foreground mb-4" /><p className="text-lg text-muted-foreground">No garments available</p></CardContent></Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div><CardTitle>Select Garments</CardTitle><CardDescription>Choose garments to print.</CardDescription></div>
                        <Button variant="outline" size="sm" onClick={selectAllGarments}>Select All</Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {garments.map((garment) => (
                          <div key={garment.id} className="flex items-center gap-4 rounded-lg border p-3 cursor-pointer" onClick={() => toggleGarment(garment.id)}>
                            <Checkbox checked={selectedGarments.includes(garment.id)} onCheckedChange={() => toggleGarment(garment.id)} />
                            <div className="flex-1 min-w-0"><p className="font-mono text-sm font-medium truncate">{garment.code}</p><div className="flex gap-2 mt-1">{garment.category && <span className="text-xs text-muted-foreground">{garment.category.name}</span>}{garment.garmentType && <span className="text-xs text-muted-foreground">• {garment.garmentType.name}</span>}</div></div>
                            <div className="flex gap-1.5"><Badge variant="outline" className="text-xs">{garment.size}</Badge><Badge variant="outline" className="text-xs">{garment.color}</Badge></div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="racks" className="space-y-4">
                {racksLoading ? (
                  <Card><CardContent className="flex items-center justify-center py-16"><p className="text-lg text-muted-foreground">Loading racks...</p></CardContent></Card>
                ) : racks.length === 0 ? (
                  <Card><CardContent className="flex flex-col items-center justify-center py-16"><QrCode className="h-16 w-16 text-muted-foreground mb-4" /><p className="text-lg text-muted-foreground">No racks available</p></CardContent></Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div><CardTitle>Select Racks</CardTitle><CardDescription>Choose racks to print.</CardDescription></div>
                        <Button variant="outline" size="sm" onClick={selectAllRacks}>Select All</Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {racks.map((rack) => (
                          <div key={rack.id} className="flex items-center gap-4 rounded-lg border p-3 cursor-pointer" onClick={() => toggleRack(rack.id)}>
                            <Checkbox checked={selectedRacks.includes(rack.id)} onCheckedChange={() => toggleRack(rack.id)} />
                            <div className="flex-1 min-w-0"><p className="font-mono text-sm font-medium truncate">{rack.code}</p><div className="flex gap-2 mt-1"><span className="text-xs text-muted-foreground">{rack.name}</span><span className="text-xs text-muted-foreground">• {rack.zone}</span></div></div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <div id="print-area" className="hidden print:block">
        <div className="print-grid">
          {selectedGarmentData.map((garment) => {
            const value = buildQrValue({ baseUrl: typeof window !== "undefined" ? window.location.origin : "", code: garment.code, mode: qrMode, entityPath: "garment" });
            return (
              <div key={garment.id} className="print-item">
                <QRCodeSVG value={value} size={512} level="M" includeMargin={true} />
                <p className="font-mono text-base font-semibold mt-2">{garment.code}</p>
              </div>
            );
          })}
          {selectedRackData.map((rack) => {
            const value = buildQrValue({ baseUrl: typeof window !== "undefined" ? window.location.origin : "", code: rack.code, mode: qrMode, entityPath: "rack" });
            return (
              <div key={rack.id} className="print-item">
                <QRCodeSVG value={value} size={512} level="M" includeMargin={true} />
                <p className="font-mono text-base font-semibold mt-2">{rack.code}</p>
                <p className="text-sm text-muted-foreground">{rack.name} • {rack.zone}</p>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
