import { QRCodeSVG } from "qrcode.react";
import { computeThermalLayout, type ThermalLabelSettings } from "@/lib/labelGenerator";

type ThermalLabelPreviewProps = {
  title: string;
  code: string;
  qrValue: string;
  settings: ThermalLabelSettings;
};

export function ThermalLabelPreview({ title, code, qrValue, settings }: ThermalLabelPreviewProps) {
  const layout = computeThermalLayout({ title, code, qrValue }, settings);

  return (
    <div
      className="relative inline-block overflow-hidden rounded-md border bg-white shadow-sm"
      style={{ width: `${settings.widthMm}mm`, height: `${settings.heightMm}mm` }}
    >
      {layout.lines.map((line) => (
        <div
          key={`${line.kind}-${line.text}`}
          className="absolute whitespace-nowrap font-mono uppercase leading-none text-black"
          style={{
            left: `${line.xMm}mm`,
            top: `${line.yMm}mm`,
            fontSize: `${line.kind === "title" ? 8.5 * line.fontMultiplier : 9 * line.fontMultiplier}px`,
            fontWeight: line.kind === "title" ? 700 : 600,
            letterSpacing: line.kind === "title" ? "0.12em" : "0.02em",
          }}
        >
          {line.text}
        </div>
      ))}

      {layout.effectiveQrSizeMm > 0 && (
        <div
          className="absolute flex items-center justify-center overflow-hidden bg-white"
          style={{
            left: `${layout.qrXmm}mm`,
            top: `${layout.qrYmm}mm`,
            width: `${layout.effectiveQrSizeMm}mm`,
            height: `${layout.effectiveQrSizeMm}mm`,
          }}
        >
          <QRCodeSVG
            value={layout.qrValue || code}
            size={512}
            level="M"
            includeMargin={true}
            bgColor="#FFFFFF"
            fgColor="#000000"
          />
        </div>
      )}
    </div>
  );
}
