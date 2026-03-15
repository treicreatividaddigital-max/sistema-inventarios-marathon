import { AlertTriangle, CheckCircle2, LifeBuoy, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { QzPrinterConnectionSnapshot } from "@/lib/qzTray";

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
  const hasPrinter = Boolean(snapshot?.connected && snapshot?.selectedPrinter?.trim());

  if (hasPrinter) {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle className="flex flex-wrap items-center gap-2">
          Impresora lista
          <Badge variant="secondary">QZ conectado</Badge>
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
    );
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>No se ha podido encontrar tu impresora</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>Revisa que esté conectada correctamente y vuelve a intentar.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="secondary" onClick={onDetect} disabled={isDetecting}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${isDetecting ? "animate-spin" : ""}`} />
            {isDetecting ? "Buscando…" : "Buscar impresora"}
          </Button>
          <Button type="button" variant="outline" onClick={onHelp}>
            <LifeBuoy className="mr-2 h-4 w-4" />
            Abrir ayuda de impresión
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
