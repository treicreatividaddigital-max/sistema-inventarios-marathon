import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowLeft, Printer, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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

type RackResponse = {
  id: string;
  code: string;
  name?: string;
  zone?: string;
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

export default function RackPrintPage() {
  const params = useParams<{ code?: string }>();
  const rackCode = params?.code ? decodeURIComponent(params.code) : "";
  const stored = useMemo(() => readStoredSettings(), []);
  const [printerName, setPrinterName] = useState<string>(stored.printerName);
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);
  const [language, setLanguage] = useState<ThermalLanguage>(stored.language);
  const [qrMode, setQrMode] = useState<QrPayloadMode>(stored.qrMode);
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

  const { data: rack, isLoading } = useQuery<RackResponse>({
    queryKey: [`/api/racks/by-code/${encodeURIComponent(rackCode)}`],
    enabled: Boolean(rackCode),
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      THERMAL_PRINT_STORAGE_KEY,
      JSON.stringify({ printerName, language, qrMode, presetKey, settings }),
    );
  }, [printerName, language, qrMode, presetKey, settings]);

  const syncPrinterState = async ({ reconnect = false, silent = false } = {}) => {
    try {
      reconnect ? setIsRefreshingConnection(true) : setIsDetectingPrinter(true);
      const snapshot = reconnect
        ? await reconnectQzPrinter(printerName)
        : await getQzPrinterConnectionSnapshot(printerName);
      setPrinterSnapshot(snapshot);
      setAvailablePrinters(snapshot.installedPrinters);
      if (snapshot.selectedPrinter) {
        setPrinterName(snapshot.selectedPrinter);
      }
      if (snapshot.severity === "ready") {
        setPrinterIssueMessage("");
      }
      if (!silent) {
        toast({
          title: snapshot.severity === "ready" ? "Printer ready" : "Check print connection",
          description: snapshot.message,
          variant: snapshot.severity === "error" ? "destructive" : "default",
        });
      }
      return snapshot;
    } catch (error) {
      const description = describeQzError(error);
      const failedSnapshot = {
        connected: false,
        installedPrinters: [],
        defaultPrinter: "",
        selectedPrinter: printerName,
        message: description,
        severity: "error" as const,
        checkedAt: Date.now(),
      };
      setPrinterSnapshot(failedSnapshot);
      setPrinterIssueMessage(description);
      if (!silent) {
        toast({ title: "Couldn't check printer", description, variant: "destructive" });
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
        // keep manual input available
      }
      if (active) {
        void syncPrinterState({ silent: true });
      }
    })();
    return () => {
      active = false;
    };
  }, [stored.printerName]);

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

  const qrValue = useMemo(() => buildQrValue({
    baseUrl: typeof window !== "undefined" ? window.location.origin : "",
    code: rack?.code || rackCode,
    mode: qrMode,
    entityPath: "rack",
  }), [rack?.code, rackCode, qrMode]);

  const applyPreset = (key: string) => {
    setPresetKey(key);
    const preset = THERMAL_LABEL_PRESETS.find((item) => item.key === key);
    if (preset) setSettings((prev) => ({ ...prev, ...preset.settings, title: prev.title || preset.settings.title }));
  };

  const handleDetectPrinter = async () => {
    const snapshot = await syncPrinterState({ silent: false });
    if (!snapshot?.connected || !snapshot.selectedPrinter.trim()) {
      setPrinterDialogMode("missing-printer");
      setPrinterIssueMessage("Couldn't find your printer. Check it's connected properly and try again.");
      setIsReconnectDialogOpen(true);
    }
  };

  const handleOpenPrinterHelp = () => {
    setPrinterDialogMode("manual-help");
    setPrinterIssueMessage(printerSnapshot?.message || "Printer appears connected, but you can reconnect QZ Tray or send a test print.");
    setIsReconnectDialogOpen(true);
  };

  const handleReconnectPrinter = async () => {
    const snapshot = await syncPrinterState({ reconnect: true, silent: false });
    if (snapshot?.severity !== "ready" || !snapshot?.selectedPrinter.trim()) {
      setPrinterDialogMode("missing-printer");
      setPrinterIssueMessage("Couldn't find your printer. Check it's connected properly and try again.");
      setIsReconnectDialogOpen(true);
      return;
    }

    setPrinterIssueMessage(`QZ Tray reconnected successfully with ${snapshot.selectedPrinter}.`);
  };

  const handleThermalPrint = async () => {
    if (!rack?.code) return;
    const snapshot = await syncPrinterState({ silent: true });
    if (!snapshot?.connected || !snapshot.selectedPrinter.trim()) {
      const message = "We couldn't find your printer. Check that it's powered on and connected, then try again.";
      setPrinterDialogMode("missing-printer");
      setPrinterIssueMessage(message);
      setIsReconnectDialogOpen(true);
      toast({
        title: "Printer not ready",
        description: message,
        variant: "destructive",
      });
      return;
    }
    try {
      setIsPrintingThermal(true);
      await printRawThermalLabels({
        printerName: snapshot.selectedPrinter,
        language,
        settings,
        labels: [{ code: rack.code, title: settings.title, qrValue }],
        jobName: `Archive rack ${rack.code}`,
      });
      setPrinterIssueMessage("");
      setIsReconnectDialogOpen(false);
      toast({ title: "Label sent", description: `${rack.code} sent to ${snapshot.selectedPrinter}` });
    } catch (error) {
      const description = describeQzError(error);
      setPrinterDialogMode("print-error");
      setPrinterIssueMessage(description);
      toast({ title: "Couldn't print", description, variant: "destructive" });
      setPrinterSnapshot((prev) => prev ? { ...prev, message: description, severity: "error", checkedAt: Date.now() } : prev);
      setIsReconnectDialogOpen(true);
    } finally {
      setIsPrintingThermal(false);
    }
  };

  const handleTestPrint = async () => {
    const snapshot = await syncPrinterState({ silent: true });
    if (!snapshot?.connected || !snapshot.selectedPrinter.trim()) {
      const message = "We couldn't find your printer. Check that it's powered on and connected, then try again.";
      setPrinterDialogMode("missing-printer");
      setPrinterIssueMessage(message);
      setIsReconnectDialogOpen(true);
      toast({ title: "Couldn't print test", description: message, variant: "destructive" });
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
      toast({ title: "Test sent", description: `A test label was sent to ${snapshot.selectedPrinter}.` });
      await syncPrinterState({ silent: true });
    } catch (error) {
      const description = describeQzError(error);
      setPrinterDialogMode("print-error");
      setPrinterIssueMessage(description);
      setIsReconnectDialogOpen(true);
      toast({ title: "Test couldn't be sent", description, variant: "destructive" });
    } finally {
      setIsTestingPrinter(false);
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
      <PrinterIssueDialog
        open={isReconnectDialogOpen}
        onOpenChange={setIsReconnectDialogOpen}
        snapshot={printerSnapshot}
        issueMessage={printerIssueMessage || printerSnapshot?.message || "We couldn't complete the print."}
        mode={printerDialogMode}
        onReconnect={() => void handleReconnectPrinter()}
        onRefreshPrinters={() => void handleDetectPrinter()}
        onTestPrint={() => void handleTestPrint()}
        isReconnecting={isRefreshingConnection}
        isRefreshing={isDetectingPrinter}
        isTesting={isTestingPrinter}
      />
      <div className="space-y-6" style={cssVars}>
        <div className="flex items-center gap-4">
          <Link href={rackCode ? `/rack/${encodeURIComponent(rackCode)}` : "/curator/racks"}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-semibold">Print Rack Label</h1>
            <p className="text-muted-foreground mt-2">Individual thermal label using the same engine as batch printing.</p>
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
          <Card>
            <CardHeader><CardTitle>Print settings</CardTitle><CardDescription>Shares the same preset and thermal logic as the batch module.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <PrintSettingLabel help="Select a printer detected by QZ Tray or type a close variant. The engine will resolve simple matches automatically.">Printer</PrintSettingLabel>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Select value={availablePrinters.includes(printerName) ? printerName : "__manual__"} onValueChange={(value) => { if (value === "__manual__") { setPrinterName(""); return; } setPrinterName(value); }}>
                    <SelectTrigger><SelectValue placeholder="Select printer" /></SelectTrigger>
                    <SelectContent>{availablePrinters.map((printer) => <SelectItem key={printer} value={printer}>{printer}</SelectItem>)}<SelectItem value="__manual__">Type manually</SelectItem></SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={handleDetectPrinter} disabled={isDetectingPrinter}><RefreshCcw className={`h-4 w-4 ${isDetectingPrinter ? "animate-spin" : ""}`} /></Button>
                </div>
                <Input value={printerName} onChange={(e) => setPrinterName(e.target.value)} placeholder="Avicar_THERM" />
              </div>

              <div className="space-y-2"><PrintSettingLabel help="TSPL is recommended for this printer. Use ZPL only if your hardware supports it and you've validated it.">Thermal language</PrintSettingLabel><Select value={language} onValueChange={(value) => setLanguage(value as ThermalLanguage)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="tspl">TSPL</SelectItem><SelectItem value="zpl">ZPL</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><PrintSettingLabel help="Quick presets for common sizes. Custom keeps your manual values.">Label preset</PrintSettingLabel><Select value={presetKey} onValueChange={applyPreset}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{THERMAL_LABEL_PRESETS.map((preset) => <SelectItem key={preset.key} value={preset.key}>{preset.label}</SelectItem>)}<SelectItem value="custom">Custom</SelectItem></SelectContent></Select></div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><PrintSettingLabel help="Total label width. Your current validated roll is 40 mm.">Width (mm)</PrintSettingLabel><Input type="number" value={settings.widthMm} onChange={(e) => setSettings((prev) => ({ ...prev, widthMm: Number(e.target.value) || prev.widthMm }))} /></div>
                <div className="space-y-2"><PrintSettingLabel help="Total label height. Your current validated roll is 25 mm.">Height (mm)</PrintSettingLabel><Input type="number" value={settings.heightMm} onChange={(e) => setSettings((prev) => ({ ...prev, heightMm: Number(e.target.value) || prev.heightMm }))} /></div>
                <div className="space-y-2"><PrintSettingLabel help="Distance between labels. If a label skips, this is usually the first value to check.">Gap (mm)</PrintSettingLabel><Input type="number" value={settings.gapMm} onChange={(e) => setSettings((prev) => ({ ...prev, gapMm: Number(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><PrintSettingLabel help="Target QR size. If it doesn't fit, the engine reduces it to prevent overlap with title or code.">QR (mm)</PrintSettingLabel><Input type="number" value={settings.qrSizeMm} onChange={(e) => setSettings((prev) => ({ ...prev, qrSizeMm: Number(e.target.value) || prev.qrSizeMm }))} /></div>
                <div className="space-y-2"><PrintSettingLabel help="Shifts all content horizontally in dots for fine printer adjustments.">Offset X (dots)</PrintSettingLabel><Input type="number" value={settings.offsetX} onChange={(e) => setSettings((prev) => ({ ...prev, offsetX: Number(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><PrintSettingLabel help="Shifts all content vertically in dots. Useful for aligning with actual paper gap.">Offset Y (dots)</PrintSettingLabel><Input type="number" value={settings.offsetY} onChange={(e) => setSettings((prev) => ({ ...prev, offsetY: Number(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><PrintSettingLabel help="Moves only texts horizontally, without affecting QR.">Text Offset X (dots)</PrintSettingLabel><Input type="number" value={settings.textOffsetX} onChange={(e) => setSettings((prev) => ({ ...prev, textOffsetX: Number(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><PrintSettingLabel help="Moves only texts vertically, without affecting QR.">Text Offset Y (dots)</PrintSettingLabel><Input type="number" value={settings.textOffsetY} onChange={(e) => setSettings((prev) => ({ ...prev, textOffsetY: Number(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><PrintSettingLabel help="Moves only QR horizontally, without affecting texts.">QR Offset X (dots)</PrintSettingLabel><Input type="number" value={settings.qrOffsetX} onChange={(e) => setSettings((prev) => ({ ...prev, qrOffsetX: Number(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><PrintSettingLabel help="Moves only QR vertically, without affecting texts.">QR Offset Y (dots)</PrintSettingLabel><Input type="number" value={settings.qrOffsetY} onChange={(e) => setSettings((prev) => ({ ...prev, qrOffsetY: Number(e.target.value) || 0 }))} /></div>
              </div>

              <div className="space-y-2"><PrintSettingLabel help="Optional header text. When active, the engine recalculates space to prevent QR overlap with title.">Title</PrintSettingLabel><Input value={settings.title} onChange={(e) => setSettings((prev) => ({ ...prev, title: e.target.value }))} /></div>
              <div className="space-y-2"><PrintSettingLabel help="QR can contain only the code or the full rack URL.">QR content</PrintSettingLabel><Select value={qrMode} onValueChange={(value) => setQrMode(value as QrPayloadMode)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="code">Code only</SelectItem><SelectItem value="url">Rack URL</SelectItem></SelectContent></Select></div>

              <div className="flex items-center justify-between rounded-md border p-3 gap-3"><div className="min-w-0"><p className="font-medium">Show title</p><p className="text-xs text-muted-foreground">Header above.</p></div><Switch checked={settings.showTitle} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, showTitle: checked }))} /></div>
              <div className="flex items-center justify-between rounded-md border p-3 gap-3"><div className="min-w-0"><p className="font-medium">Include QR</p><p className="text-xs text-muted-foreground">Preview and print update instantly.</p></div><Switch checked={settings.includeQr} onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, includeQr: checked }))} /></div>
              <div className="flex flex-col gap-2 sm:flex-row"><Button onClick={handleThermalPrint} disabled={!rack?.code || isPrintingThermal} className="flex-1"><Printer className="mr-2 h-4 w-4" />{isPrintingThermal ? "Sending..." : "Print thermal"}</Button><Button variant="outline" className="flex-1" onClick={() => window.print()}>Print browser</Button></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Real-time preview</CardTitle><CardDescription>What you see here uses the same layout logic as the thermal engine.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div id="browser-label-preview" className="flex min-h-[320px] overflow-auto items-center justify-center rounded-lg border bg-muted/30 p-6"><ThermalLabelPreview title={settings.title} code={rack?.code || rackCode || "RACK-000"} qrValue={qrValue} settings={settings} /></div>
              <div className="grid gap-4 md:grid-cols-2"><div className="rounded-md border p-3"><p className="text-sm font-medium">Code</p><p className="mt-1 font-mono text-sm text-muted-foreground">{rack?.code || rackCode || "-"}</p></div><div className="rounded-md border p-3"><p className="text-sm font-medium">QR Payload</p><p className="mt-1 break-all text-sm text-muted-foreground">{qrValue || "-"}</p></div></div>
              {isLoading && <p className="text-sm text-muted-foreground">Loading rack…</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
