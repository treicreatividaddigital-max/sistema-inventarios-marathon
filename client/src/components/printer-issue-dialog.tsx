import { AlertTriangle, LifeBuoy, PlugZap, Printer, RefreshCcw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { QzPrinterConnectionSnapshot } from "@/lib/qzTray";

export type PrinterIssueDialogMode = "missing-printer" | "manual-help" | "print-error";

export function PrinterIssueDialog({
  open,
  onOpenChange,
  snapshot,
  issueMessage,
  mode,
  onReconnect,
  onRefreshPrinters,
  onTestPrint,
  isReconnecting,
  isRefreshing,
  isTesting,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  snapshot: QzPrinterConnectionSnapshot | null;
  issueMessage: string;
  mode: PrinterIssueDialogMode;
  onReconnect: () => void;
  onRefreshPrinters: () => void;
  onTestPrint: () => void;
  isReconnecting: boolean;
  isRefreshing: boolean;
  isTesting: boolean;
}) {
  const title =
    mode === "missing-printer"
      ? "No se ha podido encontrar tu impresora"
      : mode === "print-error"
        ? "No se pudo completar la impresión"
        : "Ayuda con la impresión";

  const description =
    mode === "missing-printer"
      ? "Revisa que esté conectada correctamente y vuelve a intentar."
      : mode === "print-error"
        ? "Haz una verificación rápida y vuelve a intentar."
        : "Sigue estos pasos para recuperar la impresión.";

  const statusLabel = snapshot?.connected ? "QZ activo" : "QZ no activo";
  const statusVariant = snapshot?.connected ? "secondary" : "destructive";

  const helperMessage =
    mode === "missing-printer"
      ? "No encontramos una impresora disponible en este momento."
      : mode === "print-error"
        ? "La solicitud no pudo completarse correctamente."
        : issueMessage || "Si la impresora no respondió, usa estas acciones para recuperarla.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-24px)] max-w-md rounded-2xl p-0 sm:w-full">
        <DialogHeader className="space-y-2 border-b px-4 pb-4 pt-5 sm:px-6">
          <DialogTitle className="flex items-start gap-3 pr-8 text-left text-lg leading-tight">
            {mode === "manual-help" ? (
              <LifeBuoy className="mt-0.5 h-5 w-5 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            )}
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription className="text-left text-sm leading-6">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-4 py-4 sm:px-6">
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant}>{statusLabel}</Badge>
              {snapshot?.selectedPrinter ? (
                <Badge variant="outline">{snapshot.selectedPrinter}</Badge>
              ) : null}
            </div>

            <p className="mt-3 text-sm leading-6 text-foreground">{helperMessage}</p>

            {issueMessage && issueMessage !== helperMessage ? (
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{issueMessage}</p>
            ) : null}
          </div>

          <div className="rounded-xl border p-4">
            <p className="text-sm font-semibold">Verificación rápida</p>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <li>1. Revisa que la impresora esté conectada.</li>
              <li>2. Revisa que QZ Tray esté activo y corriendo.</li>
            </ol>
          </div>
        </div>

        <DialogFooter className="border-t px-4 py-4 sm:px-6">
          <div className="flex w-full flex-col gap-2">
            <Button type="button" onClick={onReconnect} disabled={isReconnecting} className="w-full">
              <PlugZap className={`mr-2 h-4 w-4 ${isReconnecting ? "animate-pulse" : ""}`} />
              {isReconnecting ? "Reconectando…" : "Reconectar QZ Tray"}
            </Button>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" onClick={onRefreshPrinters} disabled={isRefreshing} className="w-full">
                <RefreshCcw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Buscando…" : "Buscar impresora"}
              </Button>

              <Button type="button" variant="outline" onClick={onTestPrint} disabled={isTesting} className="w-full">
                <Printer className={`mr-2 h-4 w-4 ${isTesting ? "animate-pulse" : ""}`} />
                {isTesting ? "Enviando prueba…" : "Imprimir prueba"}
              </Button>
            </div>

            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="w-full">
              Cerrar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}