import { ExternalLink } from "lucide-react";

export function ThermalPrintSupportNote() {
  return (
    <p className="mt-2 text-xs leading-5 text-muted-foreground">
      Thermal printing requires{" "}
      <a
        href="https://qz.io/download/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-medium underline underline-offset-2 hover:text-foreground"
      >
        QZ Tray <ExternalLink className="h-3.5 w-3.5" />
      </a>
      {" "}installed on desktop for compatible thermal printers.
    </p>
  );
}
