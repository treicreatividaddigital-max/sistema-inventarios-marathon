import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FilterX, Printer, QrCode, RefreshCcw } from "lucide-react";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { ThermalLabelPreview } from "@/components/thermal-label-preview";
import { ThermalPrintSupportNote } from "@/components/thermal-print-support-note";
import { PrintSettingLabel } from "@/components/print-setting-label";
import { PrinterIssueDialog, type PrinterIssueDialogMode } from "@/components/printer-issue-dialog";
import { PrinterStatusCard } from "@/components/printer-status-card";
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
import {
  describeQzError,
  getQzPrinterConnectionSnapshot,
  printRawThermalLabels,
  reconnectQzPrinter,
  resolvePreferredPrinterSelection,
  type QzPrinterConnectionSnapshot,
} from "@/lib/qzTray";

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

function PrintSettingsCard({
  printerName,
  setPrinterName,
  availablePrinters,
  language,
  setLanguage,
  presetKey,
  applyPreset,
  settings,
  setSettings,
  qrMode,
  setQrMode,
  onDetectPrinter,
  onHelp,
  isDetectingPrinter,
  selectedLabelsLength,
  onThermalPrint,
  onBrowserPrint,
  isPrintingThermal,
}: {
  printerName: string;
  setPrinterName: (value: string) => void;
  availablePrinters: string[];
  onHelp: () => void;
  language: ThermalLanguage;
  setLanguage: (value: ThermalLanguage) => void;
  presetKey: string;
  applyPreset: (value: string) => void;
  settings: ThermalLabelSettings;
  setSettings: React.Dispatch<React.SetStateAction<ThermalLabelSettings>>;
  qrMode: QrPayloadMode;
  setQrMode: (value: QrPayloadMode) => void;
  onDetectPrinter: () => void;
  isDetectingPrinter: boolean;
  selectedLabelsLength: number;
  onThermalPrint: () => void;
  onBrowserPrint: () => void;
  isPrintingThermal: boolean;
}) {
  return (
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
                {availablePrinters.map((printer) => (
                  <SelectItem key={printer} value={printer}>{printer}</SelectItem>
                ))}
                <SelectItem value="__manual__">Escribir manualmente</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={onDetectPrinter} disabled={isDetectingPrinter}>
              <RefreshCcw className={`mr-2 h-4 w-4 ${isDetectingPrinter ? "animate-spin" : ""}`} />
              Detectar
            </Button>
          </div>
          {!availablePrinters.includes(printerName) && (
            <Input placeholder="Nombre manual de impresora" value={printerName} onChange={(e) => setPrinterName(e.target.value)} />
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><PrintSettingLabel help="TSPL suele ser la mejor opción para etiquetas térmicas compactas.">Lenguaje</PrintSettingLabel><Select value={language} onValueChange={(value) => setLanguage(value as ThermalLanguage)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tspl">TSPL</SelectItem><SelectItem value="zpl">ZPL</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><PrintSettingLabel help="Aplica proporciones listas para 40x25 o 50x30 sin recalibrar a mano desde cero.">Preset</PrintSettingLabel><Select value={presetKey} onValueChange={applyPreset}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{THERMAL_LABEL_PRESETS.map((preset) => (<SelectItem key={preset.key} value={preset.key}>{preset.label}</SelectItem>))}<SelectItem value="custom">Custom</SelectItem></SelectContent></Select></div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2"><PrintSettingLabel help="Mueve todo el texto horizontalmente sin alterar el tamaño de la etiqueta.">Offset texto X (dots)</PrintSettingLabel><Input type="number" value={settings.textOffsetX} onChange={(e) => setSettings((prev) => ({ ...prev, textOffsetX: Number(e.target.value) || 0 }))} /></div>
          <div className="space-y-2"><PrintSettingLabel help="Mueve todo el texto verticalmente sin afectar el QR.">Offset texto Y (dots)</PrintSettingLabel><Input type="number" value={settings.textOffsetY} onChange={(e) => setSettings((prev) => ({ ...prev, textOffsetY: Number(e.target.value) || 0 }))} /></div>
          <div className="space-y-2"><PrintSettingLabel help="Mueve solo el QR horizontalmente, sin afectar los textos.">Offset QR X (dots)</PrintSettingLabel><Input type="number" value={settings.qrOffsetX} onChange={(e) => setSettings((prev) => ({ ...prev, qrOffsetX: Number(e.target.value) || 0 }))} /></div>
          <div className="space-y-2"><PrintSettingLabel help="Mueve solo el QR verticalmente, sin afectar los textos.">Offset QR Y (dots)</PrintSettingLabel><Input type="number" value={settings.qrOffsetY} onChange={(e) => setSettings((prev) => ({ ...prev, qrOffsetY: Number(e.target.value) || 0 }))} /></div>
        </div>

        <div className="space-y-2"><PrintSettingLabel help="Texto superior opcional. Cuando está activo, el motor recalcula el espacio para no montar el QR sobre el título.">Título</PrintSettingLabel><Input value={settings.title} onChange={(e) => setSettings((prev) => ({ ...prev, title: e.target.value }))} /></div>
        <div className="space-y-2"><PrintSettingLabel help="El QR puede contener solo el código o la URL completa del item.">Contenido del QR</PrintSettingLabel><Select value={qrMode} onValueChange={(value) => setQrMode(value as QrPayloadMode)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="code">Solo código</SelectItem><SelectItem value="url">URL</SelectItem></SelectContent></Select></div>
        <div className="flex items-center justify-between rounded-md border p-3"><div><p className="font-medium">Mostrar título</p><p className="text-xs text-muted-foreground">Encabezado superior.</p></div><Switch checked={settings.showTitle} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, showTitle: checked }))} /></div>
        <div className="flex items-center justify-between rounded-md border p-3"><div><p className="font-medium">Incluir QR</p><p className="text-xs text-muted-foreground">Déjalo apagado si necesitas máxima compatibilidad.</p></div><Switch checked={settings.includeQr} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, includeQr: checked }))} /></div>
        <div className="flex flex-col gap-2">
          <Button onClick={onThermalPrint} disabled={!selectedLabelsLength || isPrintingThermal}><Printer className="mr-2 h-4 w-4" />{isPrintingThermal ? "Enviando..." : `Imprimir térmica (${selectedLabelsLength})`}</Button>
          <Button variant="outline" onClick={onBrowserPrint}>Imprimir navegador</Button>
          <Button type="button" variant="ghost" onClick={onHelp}>Tengo problemas con mi impresión</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CuratorPrintQRsPage() {
  const isMobile = useIsMobile();
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
  const [isRefreshingConnection, setIsRefreshingConnection] = useState(false);
  const [printerSnapshot, setPrinterSnapshot] = useState<QzPrinterConnectionSnapshot | null>(null);
  const [isReconnectDialogOpen, setIsReconnectDialogOpen] = useState(false);
  const [printerIssueMessage, setPrinterIssueMessage] = useState("");
  const [printerDialogMode, setPrinterDialogMode] = useState<PrinterIssueDialogMode>("manual-help");
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);
  const { toast } = useToast();

  const { data: racks = [], isLoading: racksLoading } = useQuery<Rack[]>({ queryKey: ["/api/racks"] });

  const garmentsQueryUrl = useMemo(() => buildGarmentsQueryUrl(garmentSearch, selectedRackFilter), [garmentSearch, selectedRackFilter]);

  const { data: garmentsSearch, isLoading: garmentsLoading, isFetching: garmentsFetching, refetch: refetchGarments } = useQuery<GarmentSearchResponse>({ queryKey: [garmentsQueryUrl] });

  const garments = garmentsSearch?.items ?? [];
  const selectedRackMeta = racks.find((rack) => rack.id === selectedRackFilter);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(THERMAL_PRINT_STORAGE_KEY, JSON.stringify({ printerName, language, qrMode, presetKey, settings }));
  }, [printerName, language, qrMode, presetKey, settings]);

  const syncPrinterState = async ({ reconnect = false, silent = false } = {}) => {
    try {
      reconnect ? setIsRefreshingConnection(true) : setIsDetectingPrinter(true);
      const snapshot = reconnect ? await reconnectQzPrinter(printerName) : await getQzPrinterConnectionSnapshot(printerName);
      setPrinterSnapshot(snapshot);
      setAvailablePrinters(snapshot.installedPrinters);
      if (snapshot.selectedPrinter) setPrinterName(snapshot.selectedPrinter);
      if (snapshot.severity === "ready") {
        setPrinterIssueMessage("");
      }
      if (!silent) {
        toast({ title: snapshot.severity === "ready" ? "Impresora lista" : "Revisa la conexión de impresión", description: snapshot.message, variant: snapshot.severity === "error" ? "destructive" : "default" });
      }
      return snapshot;
    } catch (error) {
      const description = describeQzError(error);
      const failedSnapshot = { connected: false, installedPrinters: [], defaultPrinter: "", selectedPrinter: printerName, message: description, severity: "error" as const, checkedAt: Date.now() };
      setPrinterSnapshot(failedSnapshot);
      setPrinterIssueMessage(description);
      if (!silent) {
        toast({ title: "No se pudo revisar la impresora", description, variant: "destructive" });
      }
      return failedSnapshot;
    } finally {
      setIsDetectingPrinter(false);
      setIsRefreshingConnection(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const resolved = await resolvePreferredPrinterSelection(stored.printerName);
        if (!active) return;
        setAvailablePrinters(resolved.installedPrinters);
        setPrinterName((current) => {
          const currentTrimmed = current.trim();
          if (!currentTrimmed) return resolved.selectedPrinter;
          return resolved.installedPrinters.includes(currentTrimmed) ? currentTrimmed : resolved.selectedPrinter;
        });
      } catch {
        // manual input remains available
      }
      if (active) {
        void syncPrinterState({ silent: true });
      }
    })();
    return () => { active = false; };
  }, [stored.printerName]);

  useEffect(() => {
    setSelectedGarments((prev) => prev.filter((id) => garments.some((garment) => garment.id === id)));
  }, [garments]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncPrinterState({ silent: true });
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [printerName]);

  useEffect(() => {
    if (printerSnapshot?.severity === "ready" && isReconnectDialogOpen && printerDialogMode !== "manual-help") {
      setIsReconnectDialogOpen(false);
      setPrinterIssueMessage("");
    }
  }, [printerSnapshot?.severity, isReconnectDialogOpen, printerDialogMode]);

  const handleBrowserPrint = () => window.print();
  const handleDetectPrinter = async () => { await syncPrinterState({ silent: false }); };

  const handleOpenPrinterHelp = () => {
    setPrinterDialogMode("manual-help");
    setPrinterIssueMessage(printerSnapshot?.message || "La impresora aparece conectada, pero puedes reconectar QZ Tray o enviar una impresión de prueba.");
    setIsReconnectDialogOpen(true);
  };

  const handleReconnectPrinter = async () => {
    const snapshot = await syncPrinterState({ reconnect: true, silent: false });
    if (snapshot?.severity !== "ready" || !snapshot?.selectedPrinter.trim()) {
      setPrinterDialogMode("missing-printer");
      setPrinterIssueMessage("No se ha podido encontrar tu impresora. Revisa que esté conectada correctamente y vuelve a intentar.");
      setIsReconnectDialogOpen(true);
      return;
    }

    setPrinterIssueMessage(`QZ Tray se reconectó correctamente con ${snapshot.selectedPrinter}.`);
  };

  const toggleGarment = (id: string) => setSelectedGarments((prev) => prev.includes(id) ? prev.filter((garmentId) => garmentId !== id) : [...prev, id]);
  const toggleRack = (id: string) => setSelectedRacks((prev) => prev.includes(id) ? prev.filter((rackId) => rackId !== id) : [...prev, id]);
  const selectAllVisibleGarments = () => setSelectedGarments(garments.map((garment) => garment.id));
  const clearVisibleGarments = () => setSelectedGarments([]);
  const selectAllRacks = () => setSelectedRacks(racks.map((rack) => rack.id));
  const clearAllRacks = () => setSelectedRacks([]);

  const selectedGarmentData = garments.filter((garment) => selectedGarments.includes(garment.id));
  const selectedRackData = racks.filter((rack) => selectedRacks.includes(rack.id));

  const selectedLabels = useMemo<ThermalLabelInput[]>(() => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return [
      ...selectedGarmentData.map((garment) => ({ code: garment.code, title: settings.title, qrValue: buildQrValue({ baseUrl, code: garment.code, mode: qrMode, entityPath: "garment" }) })),
      ...selectedRackData.map((rack) => ({ code: rack.code, title: settings.title, qrValue: buildQrValue({ baseUrl, code: rack.code, mode: qrMode, entityPath: "rack" }) })),
    ];
  }, [selectedGarmentData, selectedRackData, settings.title, qrMode]);

  const previewLabel = selectedLabels[0] || {
    code: "GAR-000",
    title: settings.title,
    qrValue: buildQrValue({ baseUrl: typeof window !== "undefined" ? window.location.origin : "", code: "GAR-000", mode: qrMode, entityPath: "garment" }),
  };

  const applyPreset = (key: string) => {
    setPresetKey(key);
    const preset = THERMAL_LABEL_PRESETS.find((item) => item.key === key);
    if (preset) {
      setSettings((prev) => ({ ...prev, ...preset.settings, title: prev.title || preset.settings.title }));
    }
  };

  const handleThermalPrint = async () => {
    if (!selectedLabels.length) return;
    const snapshot = await syncPrinterState({ silent: true });
    if (!snapshot?.connected || !snapshot.selectedPrinter.trim()) {
      const message = "No se ha podido encontrar tu impresora. Revisa que esté conectada correctamente y vuelve a intentar.";
      setPrinterDialogMode("missing-printer");
      setPrinterIssueMessage(message);
      setIsReconnectDialogOpen(true);
      toast({ title: "Impresora no lista", description: message, variant: "destructive" });
      return;
    }
    try {
      setIsPrintingThermal(true);
      await printRawThermalLabels({ printerName: snapshot.selectedPrinter, language, labels: selectedLabels, settings, jobName: `Archive batch ${selectedLabels.length}` });
      setPrinterIssueMessage("");
      setIsReconnectDialogOpen(false);
      toast({ title: "Etiquetas enviadas", description: `${selectedLabels.length} etiqueta(s) enviadas a ${snapshot.selectedPrinter}` });
    } catch (error) {
      const description = describeQzError(error);
      setPrinterDialogMode("print-error");
      setPrinterIssueMessage(description);
      toast({ title: "No se pudo imprimir", description, variant: "destructive" });
      setPrinterSnapshot((prev) => prev ? { ...prev, message: description, severity: "error", checkedAt: Date.now() } : prev);
      setIsReconnectDialogOpen(true);
    } finally {
      setIsPrintingThermal(false);
    }
  };

  const handleTestPrint = async () => {
    const snapshot = await syncPrinterState({ silent: true });
    if (!snapshot?.connected || !snapshot.selectedPrinter.trim()) {
      const message = "No se ha podido encontrar tu impresora. Revisa que esté conectada correctamente y vuelve a intentar.";
      setPrinterDialogMode("missing-printer");
      setPrinterIssueMessage(message);
      setIsReconnectDialogOpen(true);
      toast({ title: "No se pudo imprimir la prueba", description: message, variant: "destructive" });
      return;
    }
    try {
      setIsTestingPrinter(true);
      await printRawThermalLabels({
        printerName: snapshot.selectedPrinter,
        language,
        settings,
        labels: [{ code: "TEST-PRINT", title: settings.title || "ARCHIVE", qrValue: "TEST-PRINT" }],
        jobName: "Archive test print",
      });
      setPrinterIssueMessage("");
      setIsReconnectDialogOpen(false);
      toast({ title: "Prueba enviada", description: `Se envió una etiqueta de prueba a ${snapshot.selectedPrinter}.` });
      await syncPrinterState({ silent: true });
    } catch (error) {
      const description = describeQzError(error);
      setPrinterDialogMode("print-error");
      setPrinterIssueMessage(description);
      setIsReconnectDialogOpen(true);
      toast({ title: "La prueba no se pudo enviar", description, variant: "destructive" });
    } finally {
      setIsTestingPrinter(false);
    }
  };

  const printSettingsCard = (
    <PrintSettingsCard
      printerName={printerName}
      setPrinterName={setPrinterName}
      availablePrinters={availablePrinters}
      language={language}
      setLanguage={setLanguage}
      presetKey={presetKey}
      applyPreset={applyPreset}
      settings={settings}
      setSettings={setSettings}
      qrMode={qrMode}
      setQrMode={setQrMode}
      onDetectPrinter={handleDetectPrinter}
      onHelp={handleOpenPrinterHelp}
      isDetectingPrinter={isDetectingPrinter}
      selectedLabelsLength={selectedLabels.length}
      onThermalPrint={handleThermalPrint}
      onBrowserPrint={handleBrowserPrint}
      isPrintingThermal={isPrintingThermal}
    />
  );

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
      <PrinterIssueDialog
        open={isReconnectDialogOpen}
        onOpenChange={setIsReconnectDialogOpen}
        snapshot={printerSnapshot}
        issueMessage={printerIssueMessage || printerSnapshot?.message || "No pudimos completar la impresión."}
        mode={printerDialogMode}
        onReconnect={() => void handleReconnectPrinter()}
        onRefreshPrinters={() => void handleDetectPrinter()}
        onTestPrint={() => void handleTestPrint()}
        isReconnecting={isRefreshingConnection}
        isRefreshing={isDetectingPrinter}
        isTesting={isTestingPrinter}
      />

      <div className="no-print space-y-6 overflow-x-hidden">
        <div className="flex items-center gap-4">
          <Link href="/curator"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-semibold">Print QR Codes</h1>
            <p className="mt-2 text-muted-foreground">Masivo: navegador o térmica usando el mismo motor que las pantallas individuales.</p>
            <ThermalPrintSupportNote />
          </div>
        </div>

        <PrinterStatusCard
          snapshot={printerSnapshot}
          onDetect={handleDetectPrinter}
          onHelp={handleOpenPrinterHelp}
          isDetecting={isDetectingPrinter}
        />

        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <div className={isMobile ? "order-2" : "order-1"}>{!isMobile ? printSettingsCard : null}</div>

          <div className={isMobile ? "order-1 min-w-0 space-y-6" : "order-2 min-w-0 space-y-6"}>
            <Card>
              <CardHeader>
                <CardTitle>Preview en tiempo real</CardTitle>
                <CardDescription>Vista previa fiel al layout lógico aplicado a la primera etiqueta seleccionada.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex min-h-[240px] max-w-full overflow-auto items-center justify-center rounded-lg border bg-muted/30 p-4 sm:p-6">
                  <ThermalLabelPreview title={settings.title} code={previewLabel.code} qrValue={previewLabel.qrValue || previewLabel.code} settings={settings} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-md border p-3"><p className="text-sm font-medium">Primera etiqueta</p><p className="mt-1 font-mono text-sm text-muted-foreground break-all">{previewLabel.code}</p></div>
                  <div className="rounded-md border p-3"><p className="text-sm font-medium">Payload QR</p><p className="mt-1 break-all text-sm text-muted-foreground">{previewLabel.qrValue || "-"}</p></div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="garments" className="min-w-0">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="garments">Garments ({garmentsSearch?.total ?? garments.length})</TabsTrigger>
                <TabsTrigger value="racks">Racks ({racks.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="garments" className="space-y-4 min-w-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Filter garments</CardTitle>
                    <CardDescription>Busca por código o filtra por rack para imprimir solo lo que está dentro de un rack específico.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto]">
                      <Input placeholder="Search garment code, color or description" value={garmentSearch} onChange={(e) => setGarmentSearch(e.target.value)} />
                      <Select value={selectedRackFilter} onValueChange={setSelectedRackFilter}>
                        <SelectTrigger><SelectValue placeholder="Filter by rack" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All racks</SelectItem>
                          {racks.map((rack) => (
                            <SelectItem key={rack.id} value={rack.id}>{rack.code} · {rack.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" onClick={() => { setGarmentSearch(""); setSelectedRackFilter("all"); }}>
                        <FilterX className="mr-2 h-4 w-4" />Clear
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedRackMeta ? <Badge variant="secondary">Rack filter: {selectedRackMeta.code} · {selectedRackMeta.name}</Badge> : <Badge variant="outline">Showing garments from all racks</Badge>}
                      {!!garmentSearch.trim() && <Badge variant="secondary">Search: {garmentSearch.trim()}</Badge>}
                      <Badge variant="outline">Visible garments: {garmentsSearch?.total ?? garments.length}</Badge>
                      <Badge variant="outline">Selected: {selectedGarments.length}</Badge>
                    </div>
                  </CardContent>
                </Card>

                {garmentsLoading ? (
                  <Card><CardContent className="flex items-center justify-center py-16"><p className="text-lg text-muted-foreground">Loading garments...</p></CardContent></Card>
                ) : garments.length === 0 ? (
                  <Card><CardContent className="flex flex-col items-center justify-center py-16"><QrCode className="mb-4 h-16 w-16 text-muted-foreground" /><p className="text-lg text-muted-foreground">No garments available</p><p className="mt-2 text-sm text-muted-foreground">Adjust the search or rack filter and try again.</p></CardContent></Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div><CardTitle>Select Garments</CardTitle><CardDescription>{selectedRackMeta ? `Printing garments assigned to ${selectedRackMeta.code}.` : "Choose garments to print."}</CardDescription></div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => void refetchGarments()}><RefreshCcw className={`mr-2 h-4 w-4 ${garmentsFetching ? "animate-spin" : ""}`} />Refresh</Button>
                          <Button variant="outline" size="sm" onClick={clearVisibleGarments}>Clear selected</Button>
                          <Button variant="outline" size="sm" onClick={selectAllVisibleGarments}>Select visible</Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-[28rem] space-y-3 overflow-y-auto overflow-x-hidden">
                        {garments.map((garment) => (
                          <div key={garment.id} className="cursor-pointer rounded-lg border p-3 transition-colors hover:bg-muted/40" onClick={() => toggleGarment(garment.id)}>
                            <div className="flex items-start gap-4">
                              <Checkbox checked={selectedGarments.includes(garment.id)} onCheckedChange={() => toggleGarment(garment.id)} />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <p className="truncate font-mono text-sm font-medium">{garment.code}</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    <Badge variant="outline" className="text-xs">{garment.size}</Badge>
                                    <Badge variant="outline" className="text-xs">{garment.color}</Badge>
                                    {garment.rack?.code && <Badge variant="secondary" className="text-xs">{garment.rack.code}</Badge>}
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

              <TabsContent value="racks" className="space-y-4 min-w-0">
                {racksLoading ? (
                  <Card><CardContent className="flex items-center justify-center py-16"><p className="text-lg text-muted-foreground">Loading racks...</p></CardContent></Card>
                ) : racks.length === 0 ? (
                  <Card><CardContent className="flex flex-col items-center justify-center py-16"><QrCode className="mb-4 h-16 w-16 text-muted-foreground" /><p className="text-lg text-muted-foreground">No racks available</p></CardContent></Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div><CardTitle>Select Racks</CardTitle><CardDescription>Choose racks to print.</CardDescription></div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={clearAllRacks}>Clear selected</Button>
                          <Button variant="outline" size="sm" onClick={selectAllRacks}>Select all</Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-[28rem] space-y-3 overflow-y-auto overflow-x-hidden">
                        {racks.map((rack) => (
                          <div key={rack.id} className="cursor-pointer rounded-lg border p-3 transition-colors hover:bg-muted/40" onClick={() => toggleRack(rack.id)}>
                            <div className="flex items-start gap-4">
                              <Checkbox checked={selectedRacks.includes(rack.id)} onCheckedChange={() => toggleRack(rack.id)} />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="truncate font-mono text-sm font-medium">{rack.code}</p><Badge variant="outline" className="w-fit text-xs">{rack.zone}</Badge></div>
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

            {isMobile ? printSettingsCard : null}
          </div>
        </div>
      </div>

      <div id="print-area" className="hidden print:block">
        <div className="print-grid">
          {selectedGarmentData.map((garment) => {
            const value = buildQrValue({ baseUrl: typeof window !== "undefined" ? window.location.origin : "", code: garment.code, mode: qrMode, entityPath: "garment" });
            return <div key={garment.id} className="print-item"><QRCodeSVG value={value} size={512} level="M" includeMargin={true} /><p className="mt-2 font-mono text-base font-semibold">{garment.code}</p>{garment.rack?.code ? <p className="text-sm text-muted-foreground">{garment.rack.code}</p> : null}</div>;
          })}
          {selectedRackData.map((rack) => {
            const value = buildQrValue({ baseUrl: typeof window !== "undefined" ? window.location.origin : "", code: rack.code, mode: qrMode, entityPath: "rack" });
            return <div key={rack.id} className="print-item"><QRCodeSVG value={value} size={512} level="M" includeMargin={true} /><p className="mt-2 font-mono text-base font-semibold">{rack.code}</p><p className="text-sm text-muted-foreground">{rack.name} • {rack.zone}</p></div>;
          })}
        </div>
      </div>
    </>
  );
}
