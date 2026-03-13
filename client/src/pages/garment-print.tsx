import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, Printer, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  type ThermalLabelSettings,
  type ThermalLanguage,
} from "@/lib/labelGenerator";
import { describeQzError, printRawThermalLabels, resolvePreferredPrinterSelection } from "@/lib/qzTray";

type GarmentResponse = {
  id: string;
  code: string;
};

type StoredState = {
  printerName: string;
  language: ThermalLanguage;
  qrMode: QrPayloadMode;
  presetKey: string;
  settings: ThermalLabelSettings;
};

function readStoredSettings(): StoredState {
  if (typeof window === "undefined") {
    return {
      printerName: "",
      language: "tspl",
      qrMode: "code",
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
      language: "tspl",
      qrMode: "code",
      presetKey: "40x25",
      settings: { ...DEFAULT_THERMAL_LABEL_SETTINGS },
    };
  }
}

export default function GarmentPrintPage() {
  const params = useParams<{ code?: string }>();
  const garmentCode = params?.code ? decodeURIComponent(params.code) : "";
  const stored = useMemo(() => readStoredSettings(), []);
  const [printerName, setPrinterName] = useState<string>(stored.printerName);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [language, setLanguage] = useState<ThermalLanguage>(stored.language);
  const [qrMode, setQrMode] = useState<QrPayloadMode>(stored.qrMode);
  const [presetKey, setPresetKey] = useState<string>(stored.presetKey);
  const [settings, setSettings] = useState<ThermalLabelSettings>(stored.settings);
  const [isPrintingThermal, setIsPrintingThermal] = useState(false);
  const [isDetectingPrinter, setIsDetectingPrinter] = useState(false);
  const { toast } = useToast();

  const { data: garment, isLoading } = useQuery<GarmentResponse>({
    queryKey: [`/api/garments/by-code/${encodeURIComponent(garmentCode)}`],
    enabled: Boolean(garmentCode),
  });

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
          return resolved.installedPrinters.includes(currentTrimmed) ? currentTrimmed : resolved.selectedPrinter;
        });
      } catch {
        // keep manual input available
      }
    })();
    return () => {
      active = false;
    };
  }, [stored.printerName]);

  const qrValue = useMemo(() => {
    return buildQrValue({
      baseUrl: typeof window !== "undefined" ? window.location.origin : "",
      code: garment?.code || garmentCode,
      mode: qrMode,
      entityPath: "garment",
    });
  }, [garment?.code, garmentCode, qrMode]);

  const applyPreset = (key: string) => {
    setPresetKey(key);
    const preset = THERMAL_LABEL_PRESETS.find((item) => item.key === key);
    if (!preset) return;
    setSettings((prev) => ({ ...prev, ...preset.settings, title: prev.title || preset.settings.title }));
  };

  const handleBrowserPrint = () => window.print();

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
    if (!garment?.code) return;
    try {
      setIsPrintingThermal(true);
      await printRawThermalLabels({
        printerName,
        language,
        settings,
        labels: [{ code: garment.code, title: settings.title, qrValue }],
        jobName: `Archive garment ${garment.code}`,
      });
      toast({ title: "Etiqueta enviada", description: `${garment.code} enviado a ${printerName || "la impresora"}` });
    } catch (error) {
      toast({ title: "No se pudo imprimir", description: describeQzError(error), variant: "destructive" });
    } finally {
      setIsPrintingThermal(false);
    }
  };

  const cssVars = {
    "--label-width": `${settings.widthMm}mm`,
    "--label-height": `${settings.heightMm}mm`,
  } as CSSProperties;

  return (
    <>
      <style>{`
        @page { size: var(--label-width) var(--label-height); margin: 0; }
        @media print {
          body * { visibility: hidden !important; }
          #browser-label-preview, #browser-label-preview * { visibility: visible !important; }
          #browser-label-preview {
            position: fixed !important;
            inset: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: white !important;
          }
        }
      `}</style>
      <div className="space-y-6 overflow-x-hidden" style={cssVars}>
        <div className="flex items-start gap-3 sm:items-center sm:gap-4">
          <Link href={garmentCode ? `/garment/${encodeURIComponent(garmentCode)}` : "/search"}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold sm:text-3xl">Print Garment Label</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Etiqueta térmica individual usando el mismo motor que la impresión masiva.
            </p>
            <ThermalPrintSupportNote />
          </div>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Card className="order-2 min-w-0 xl:order-1">
            <CardHeader>
              <CardTitle>Configuración de impresión</CardTitle>
              <CardDescription>El preview responde en tiempo real a tamaño, offsets, QR y encabezado.</CardDescription>
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
                    <SelectTrigger className="min-w-0">
                      <SelectValue placeholder="Selecciona impresora" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePrinters.map((printer) => (
                        <SelectItem key={printer} value={printer}>{printer}</SelectItem>
                      ))}
                      <SelectItem value="__manual__">Escribir manualmente</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={handleDetectPrinter} disabled={isDetectingPrinter}>
                    <RefreshCcw className={`h-4 w-4 ${isDetectingPrinter ? "animate-spin" : ""}`} />
                  </Button>
                </div>
                <Input value={printerName} onChange={(e) => setPrinterName(e.target.value)} placeholder="Avicar_THERM" />
              </div>

              <div className="space-y-2">
                <PrintSettingLabel help="TSPL es la opción recomendada para esta impresora. Usa ZPL solo si tu hardware lo soporta y ya lo validaste.">Lenguaje térmico</PrintSettingLabel>
                <Select value={language} onValueChange={(value) => setLanguage(value as ThermalLanguage)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tspl">TSPL</SelectItem>
                    <SelectItem value="zpl">ZPL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <PrintSettingLabel help="Presets rápidos para tamaños comunes. Custom mantiene tus valores manuales.">Preset de etiqueta</PrintSettingLabel>
                <Select value={presetKey} onValueChange={applyPreset}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {THERMAL_LABEL_PRESETS.map((preset) => <SelectItem key={preset.key} value={preset.key}>{preset.label}</SelectItem>)}
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <PrintSettingLabel help="Ancho total de la etiqueta. Tu rollo validado actual es 40 mm.">Ancho (mm)</PrintSettingLabel>
                  <Input type="number" value={settings.widthMm} onChange={(e) => setSettings((prev) => ({ ...prev, widthMm: Number(e.target.value) || prev.widthMm }))} />
                </div>
                <div className="space-y-2">
                  <PrintSettingLabel help="Alto total de la etiqueta. Tu rollo validado actual es 25 mm.">Alto (mm)</PrintSettingLabel>
                  <Input type="number" value={settings.heightMm} onChange={(e) => setSettings((prev) => ({ ...prev, heightMm: Number(e.target.value) || prev.heightMm }))} />
                </div>
                <div className="space-y-2">
                  <PrintSettingLabel help="Distancia entre etiquetas. Si salta una etiqueta, este valor suele ser el primero que debes revisar.">Gap (mm)</PrintSettingLabel>
                  <Input type="number" value={settings.gapMm} onChange={(e) => setSettings((prev) => ({ ...prev, gapMm: Number(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <PrintSettingLabel help="Tamaño objetivo del QR. Si no cabe, el motor lo reduce automáticamente para evitar que se monte sobre el título o el código.">QR (mm)</PrintSettingLabel>
                  <Input type="number" value={settings.qrSizeMm} onChange={(e) => setSettings((prev) => ({ ...prev, qrSizeMm: Number(e.target.value) || prev.qrSizeMm }))} />
                </div>
                <div className="space-y-2">
                  <PrintSettingLabel help="Desplaza todo el contenido horizontalmente en dots. Úsalo solo para microajustes finos de impresora.">Offset X (dots)</PrintSettingLabel>
                  <Input type="number" value={settings.offsetX} onChange={(e) => setSettings((prev) => ({ ...prev, offsetX: Number(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <PrintSettingLabel help="Desplaza todo el contenido verticalmente en dots. Útil para alinear mejor con el gap real del papel.">Offset Y (dots)</PrintSettingLabel>
                  <Input type="number" value={settings.offsetY} onChange={(e) => setSettings((prev) => ({ ...prev, offsetY: Number(e.target.value) || 0 }))} />
                </div>
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

              <div className="space-y-2">
                <PrintSettingLabel help="Texto superior opcional. Cuando está activo, el motor recalcula el espacio para no montar el QR sobre el título.">Título</PrintSettingLabel>
                <Input value={settings.title} onChange={(e) => setSettings((prev) => ({ ...prev, title: e.target.value }))} />
              </div>

              <div className="space-y-2">
                <PrintSettingLabel help="El QR puede contener solo el código o la URL completa del garment.">Contenido del QR</PrintSettingLabel>
                <Select value={qrMode} onValueChange={(value) => setQrMode(value as QrPayloadMode)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="code">Solo código</SelectItem>
                    <SelectItem value="url">URL del garment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="font-medium">Mostrar título</p>
                  <p className="text-xs text-muted-foreground">Encabezado superior.</p>
                </div>
                <Switch checked={settings.showTitle} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, showTitle: checked }))} />
              </div>

              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="font-medium">Incluir QR</p>
                  <p className="text-xs text-muted-foreground">El preview y la impresión responden al instante.</p>
                </div>
                <Switch checked={settings.includeQr} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, includeQr: checked }))} />
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={handleThermalPrint} disabled={!garment?.code || !printerName.trim() || isPrintingThermal} className="flex-1">
                  <Printer className="mr-2 h-4 w-4" />
                  {isPrintingThermal ? "Enviando..." : "Imprimir térmica"}
                </Button>
                <Button variant="outline" onClick={handleBrowserPrint} className="flex-1">Imprimir navegador</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="order-1 min-w-0 xl:order-2">
            <CardHeader>
              <CardTitle>Preview en tiempo real</CardTitle>
              <CardDescription>Lo que ves aquí usa el mismo layout lógico del motor térmico.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div id="browser-label-preview" className="flex min-h-[280px] items-center justify-center overflow-auto rounded-lg border bg-muted/30 p-4 sm:min-h-[320px] sm:p-6">
                <ThermalLabelPreview
                  title={settings.title}
                  code={garment?.code || garmentCode || "GAR-000"}
                  qrValue={qrValue}
                  settings={settings}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-md border p-3">
                  <p className="text-sm font-medium">Código</p>
                  <p className="mt-1 break-all font-mono text-sm text-muted-foreground">{garment?.code || garmentCode || "-"}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-sm font-medium">Payload QR</p>
                  <p className="mt-1 break-all text-sm text-muted-foreground">{qrValue || "-"}</p>
                </div>
              </div>
              {isLoading && <p className="text-sm text-muted-foreground">Cargando garment…</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
