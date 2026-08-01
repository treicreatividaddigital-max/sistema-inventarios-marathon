import { Link } from "wouter";
import { AlertTriangle, CheckCircle2, Download, LifeBuoy, Loader2, RefreshCcw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { QzPrinterConnectionSnapshot } from "@/lib/qzTray";

const QZ_TRAY_DOWNLOAD_URL = "https://qz.io/download/";

type PrinterUiState = "checking" | "disconnected" | "no-printer" | "ready";

function derivePrinterUiState(snapshot: QzPrinterConnectionSnapshot | null): PrinterUiState {
  if (!snapshot) return "checking";
  if (!snapshot.connected) return "disconnected";
  if (!snapshot.selectedPrinter?.trim()) return "no-printer";
  return "ready";
}

function StatusBadge({ state }: { state: PrinterUiState }) {
  if (state === "ready") {
    return (
      <Badge variant="secondary" className="gap-1.5 border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Printer ready
      </Badge>
    );
  }
  if (state === "no-printer") {
    return (
      <Badge variant="outline" className="gap-1.5 border-amber-500/50 text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-3.5 w-3.5" />
        QZ Tray active, no printer
      </Badge>
    );
  }
  if (state === "disconnected") {
    return (
      <Badge variant="destructive" className="gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5" />
        QZ Tray not connected
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1.5 text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      Checking printer…
    </Badge>
  );
}

export function PrinterStatusCard({
  snapshot,
  onDetect,
  onHelp,
  isDetecting,
}: {
  snapshot: QzPrinterConnectionSnapshot | null;
  onDetect: () => void;
  onHelp: () => void;
  isDetecting: boolean;
}) {
  const state = derivePrinterUiState(snapshot);

  // STATE 1 — QZ Tray not connected: large, proactive guide, without waiting for user action.
  if (state === "disconnected") {
    return (
      <div className="space-y-2">
        <StatusBadge state={state} />
        <Alert variant="destructive" className="space-y-3 p-5">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-base">You need QZ Tray to print labels</AlertTitle>
          <AlertDescription className="space-y-4">
            <p>
              Browsers can't send data directly to a thermal printer. <strong>QZ Tray</strong> is
              a small app you install on your computer that bridges ARCHIVE and your printer.
            </p>
            <p className="text-sm">Without QZ Tray open and running, you won't be able to print thermal labels.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" asChild>
                <a href={QZ_TRAY_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Download QZ Tray
                </a>
              </Button>
              <Button type="button" variant="outline" onClick={onDetect} disabled={isDetecting}>
                <RefreshCcw className={`mr-2 h-4 w-4 ${isDetecting ? "animate-spin" : ""}`} />
                {isDetecting ? "Checking…" : "I installed it, retry"}
              </Button>
              <Link href="/help/printing">
                <Button type="button" variant="ghost">
                  <LifeBuoy className="mr-2 h-4 w-4" />
                  Help
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // STATE 2 — QZ Tray connects but doesn't detect/match a printer: short message, distinct from State 1.
  if (state === "no-printer") {
    return (
      <div className="space-y-2">
        <StatusBadge state={state} />
        <Alert className="border-amber-500/50">
          <Search className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle>QZ Tray is connected, but we can't find your printer</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>Check that it's powered on and connected, then try again.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="secondary" onClick={onDetect} disabled={isDetecting}>
                <RefreshCcw className={`mr-2 h-4 w-4 ${isDetecting ? "animate-spin" : ""}`} />
                {isDetecting ? "Searching…" : "Find printer"}
              </Button>
              <Link href="/help/printing">
                <Button type="button" variant="ghost">
                  <LifeBuoy className="mr-2 h-4 w-4" />
                  Help
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // STATE 3 — ready: discreet green indicator.
  if (state === "ready") {
    return (
      <div className="space-y-2">
        <StatusBadge state={state} />
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle className="flex flex-wrap items-center gap-2">
            Printer ready
            <Badge variant="outline">{snapshot?.selectedPrinter}</Badge>
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{snapshot?.message || "The printer is available for printing."}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={onDetect} disabled={isDetecting}>
                <RefreshCcw className={`mr-2 h-4 w-4 ${isDetecting ? "animate-spin" : ""}`} />
                {isDetecting ? "Updating…" : "Refresh printers"}
              </Button>
              <Button type="button" variant="ghost" onClick={onHelp}>
                <LifeBuoy className="mr-2 h-4 w-4" />
                I'm having printing issues
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // STATE "checking" — snapshot hasn't arrived yet (first render); discreet indicator, no alarm.
  return <StatusBadge state={state} />;
}
