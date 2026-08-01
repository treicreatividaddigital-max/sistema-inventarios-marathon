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
        Impresora lista
      </Badge>
    );
  }
  if (state === "no-printer") {
    return (
      <Badge variant="outline" className="gap-1.5 border-amber-500/50 text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-3.5 w-3.5" />
        QZ Tray activo, sin impresora
      </Badge>
    );
  }
  if (state === "disconnected") {
    return (
      <Badge variant="destructive" className="gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5" />
        QZ Tray no conectado
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1.5 text-muted-foreground">
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      Comprobando impresora…
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

  // ESTADO 1 — QZ Tray no conectado: guía grande y proactiva, sin esperar acción del usuario.
  if (state === "disconnected") {
    return (
      <div className="space-y-2">
        <StatusBadge state={state} />
        <Alert variant="destructive" className="space-y-3 p-5">
          <AlertTriangle className="h-5 w-5" />
          <AlertTitle className="text-base">Necesitas QZ Tray para imprimir etiquetas</AlertTitle>
          <AlertDescription className="space-y-4">
            <p>
              Los navegadores no pueden enviar datos directo a una impresora térmica. <strong>QZ Tray</strong> es
              una app pequeña que instalas en tu computadora y que hace de puente entre ARCHIVE y tu impresora.
            </p>
            <p className="text-sm">Sin QZ Tray abierto y corriendo, no vas a poder imprimir etiquetas térmicas.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" asChild>
                <a href={QZ_TRAY_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Descargar QZ Tray
                </a>
              </Button>
              <Button type="button" variant="outline" onClick={onDetect} disabled={isDetecting}>
                <RefreshCcw className={`mr-2 h-4 w-4 ${isDetecting ? "animate-spin" : ""}`} />
                {isDetecting ? "Comprobando…" : "Ya lo instalé, reintentar"}
              </Button>
              <Button type="button" variant="ghost" onClick={onHelp}>
                <LifeBuoy className="mr-2 h-4 w-4" />
                Ayuda
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ESTADO 2 — QZ Tray conecta pero no detecta/calza una impresora: mensaje corto y distinto del Estado 1.
  if (state === "no-printer") {
    return (
      <div className="space-y-2">
        <StatusBadge state={state} />
        <Alert className="border-amber-500/50">
          <Search className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle>QZ Tray funciona, pero no encuentro tu impresora</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>Revisa que esté encendida y conectada, luego vuelve a intentar.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="secondary" onClick={onDetect} disabled={isDetecting}>
                <RefreshCcw className={`mr-2 h-4 w-4 ${isDetecting ? "animate-spin" : ""}`} />
                {isDetecting ? "Buscando…" : "Buscar impresora"}
              </Button>
              <Button type="button" variant="ghost" onClick={onHelp}>
                <LifeBuoy className="mr-2 h-4 w-4" />
                Ayuda
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ESTADO 3 — listo: indicador verde discreto.
  if (state === "ready") {
    return (
      <div className="space-y-2">
        <StatusBadge state={state} />
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle className="flex flex-wrap items-center gap-2">
            Impresora lista
            <Badge variant="outline">{snapshot?.selectedPrinter}</Badge>
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{snapshot?.message || "La impresora está disponible para imprimir."}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={onDetect} disabled={isDetecting}>
                <RefreshCcw className={`mr-2 h-4 w-4 ${isDetecting ? "animate-spin" : ""}`} />
                {isDetecting ? "Actualizando…" : "Actualizar impresoras"}
              </Button>
              <Button type="button" variant="ghost" onClick={onHelp}>
                <LifeBuoy className="mr-2 h-4 w-4" />
                Tengo problemas con mi impresión
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // ESTADO "checking" — snapshot aún no llega (primer render); indicador discreto sin alarmar.
  return <StatusBadge state={state} />;
}
