export type ThermalLanguage = "tspl" | "zpl";
export type QrPayloadMode = "url" | "code";

export const THERMAL_PRINT_STORAGE_KEY = "archive:thermal-print-settings:v2";

export interface ThermalLabelSettings {
  widthMm: number;
  heightMm: number;
  gapMm: number;
  offsetX: number; // dots
  offsetY: number; // dots
  textOffsetX: number; // dots
  textOffsetY: number; // dots
  qrOffsetX: number; // dots
  qrOffsetY: number; // dots
  qrSizeMm: number;
  title: string;
  showTitle: boolean;
  includeQr: boolean;
  codeFontMultiplier: number;
  titleFontMultiplier: number;
  dpi: number;
}

export interface ThermalLabelInput {
  code: string;
  title?: string;
  qrValue?: string;
}

export interface ThermalLayoutLine {
  kind: "title" | "code";
  text: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  fontMultiplier: number;
}

export interface ThermalLayoutResult {
  title: string;
  code: string;
  qrValue: string;
  effectiveQrSizeMm: number;
  qrXmm: number;
  qrYmm: number;
  lines: ThermalLayoutLine[];
}

export const DEFAULT_THERMAL_LABEL_SETTINGS: ThermalLabelSettings = {
  widthMm: 40,
  heightMm: 25,
  gapMm: 2,
  offsetX: 0,
  offsetY: 0,
  textOffsetX: 0,
  textOffsetY: 0,
  qrOffsetX: 0,
  qrOffsetY: 0,
  qrSizeMm: 12,
  title: "ARCHIVE",
  showTitle: true,
  includeQr: true,
  codeFontMultiplier: 1,
  titleFontMultiplier: 1,
  dpi: 203,
};

export const THERMAL_LABEL_PRESETS: Array<{ key: string; label: string; settings: ThermalLabelSettings }> = [
  {
    key: "40x25",
    label: "40 × 25 mm",
    settings: { ...DEFAULT_THERMAL_LABEL_SETTINGS, widthMm: 40, heightMm: 25, gapMm: 2, qrSizeMm: 12 },
  },
  {
    key: "50x30",
    label: "50 × 30 mm",
    settings: { ...DEFAULT_THERMAL_LABEL_SETTINGS, widthMm: 50, heightMm: 30, gapMm: 3, qrSizeMm: 16 },
  },
];

export function buildQrValue(params: {
  baseUrl?: string;
  code: string;
  mode: QrPayloadMode;
  entityPath?: "garment" | "rack" | string;
}) {
  const code = (params.code || "").trim();
  if (!code) return "";

  if (params.mode === "code") {
    return code;
  }

  const rawBaseUrl = (params.baseUrl || "").trim().replace(/\/$/, "");
  const entityPath = (params.entityPath || "garment").replace(/^\/+|\/+$/g, "");

  if (!rawBaseUrl) {
    return code;
  }

  return `${rawBaseUrl}/${entityPath}/${encodeURIComponent(code)}`;
}

function sanitizeTspl(value: string) {
  return (value || "").replace(/"/g, "'").replace(/\r?\n+/g, " ").trim();
}

function sanitizeZpl(value: string) {
  return (value || "").replace(/[\^~]/g, " ").replace(/\r?\n+/g, " ").trim();
}

export function mmToDots(mm: number, dpi: number) {
  return Math.max(0, Math.round((mm / 25.4) * dpi));
}

function dotsToMm(dots: number, dpi: number) {
  return (dots / dpi) * 25.4;
}

function textWidthMm(text: string, multiplier: number) {
  const chars = Math.max(1, text.length);
  return Math.max(8, chars * (1.55 * multiplier));
}

function textHeightMm(multiplier: number) {
  return Math.max(2.8, 2.8 * multiplier);
}

export function computeThermalLayout(input: ThermalLabelInput, settings: ThermalLabelSettings): ThermalLayoutResult {
  const title = sanitizeTspl(input.title || settings.title || "ARCHIVE");
  const code = sanitizeTspl(input.code);
  const qrValue = sanitizeTspl(input.qrValue || code);

  const offsetXmm = dotsToMm(settings.offsetX || 0, settings.dpi);
  const offsetYmm = dotsToMm(settings.offsetY || 0, settings.dpi);
  const textOffsetXmm = dotsToMm(settings.textOffsetX || 0, settings.dpi);
  const textOffsetYmm = dotsToMm(settings.textOffsetY || 0, settings.dpi);
  const qrOffsetXmm = dotsToMm(settings.qrOffsetX || 0, settings.dpi);
  const qrOffsetYmm = dotsToMm(settings.qrOffsetY || 0, settings.dpi);

  const outerPaddingMm = 2;
  const lineGapMm = 1.1;
  const qrGapMm = 1.3;
  const topBottomPaddingMm = 1.6;

  const titleHeightMm = settings.showTitle && title ? textHeightMm(settings.titleFontMultiplier) : 0;
  const codeHeightMm = textHeightMm(settings.codeFontMultiplier);

  const reservedWithoutQr = topBottomPaddingMm * 2 + titleHeightMm + codeHeightMm + (settings.showTitle && title ? lineGapMm : 0);
  const maxQrSizeMm = Math.max(0, settings.heightMm - reservedWithoutQr - qrGapMm);

  const requestedQrSizeMm = settings.includeQr && qrValue ? settings.qrSizeMm : 0;
  const effectiveQrSizeMm = requestedQrSizeMm > 0 ? Math.max(6, Math.min(requestedQrSizeMm, maxQrSizeMm)) : 0;
  const includeQr = effectiveQrSizeMm >= 6 && settings.includeQr && !!qrValue;

  const effectiveContentHeightMm =
    titleHeightMm +
    (settings.showTitle && title ? lineGapMm : 0) +
    (includeQr ? effectiveQrSizeMm + qrGapMm : 0) +
    codeHeightMm;

  const originYMm = Math.max(topBottomPaddingMm, (settings.heightMm - effectiveContentHeightMm) / 2 + offsetYmm);
  let cursorY = originYMm;
  const lines: ThermalLayoutLine[] = [];

  if (settings.showTitle && title) {
    const widthMm = textWidthMm(title, settings.titleFontMultiplier);
    lines.push({
      kind: "title",
      text: title,
      xMm: Math.max(outerPaddingMm, (settings.widthMm - widthMm) / 2 + offsetXmm + textOffsetXmm),
      yMm: cursorY + textOffsetYmm,
      widthMm,
      heightMm: titleHeightMm,
      fontMultiplier: settings.titleFontMultiplier,
    });
    cursorY += titleHeightMm + lineGapMm;
  }

  const qrXmm = Math.max(outerPaddingMm, (settings.widthMm - effectiveQrSizeMm) / 2 + offsetXmm + qrOffsetXmm);
  const qrYmm = cursorY + qrOffsetYmm;

  if (includeQr) {
    cursorY += effectiveQrSizeMm + qrGapMm;
  }

  const codeWidthMm = textWidthMm(code, settings.codeFontMultiplier);
  lines.push({
    kind: "code",
    text: code,
    xMm: Math.max(outerPaddingMm, (settings.widthMm - codeWidthMm) / 2 + offsetXmm + textOffsetXmm),
    yMm: cursorY + textOffsetYmm,
    widthMm: codeWidthMm,
    heightMm: codeHeightMm,
    fontMultiplier: settings.codeFontMultiplier,
  });

  return { title, code, qrValue, effectiveQrSizeMm: includeQr ? effectiveQrSizeMm : 0, qrXmm, qrYmm, lines };
}

export function generateTSPLLabel(input: ThermalLabelInput, settings: ThermalLabelSettings): string {
  const layout = computeThermalLayout(input, settings);
  const lines: string[] = [
    `SIZE ${settings.widthMm} mm,${settings.heightMm} mm`,
    `GAP ${settings.gapMm} mm,0 mm`,
    "CLS",
  ];

  for (const line of layout.lines) {
    const x = mmToDots(line.xMm, settings.dpi);
    const y = mmToDots(line.yMm, settings.dpi);
    lines.push(`TEXT ${x},${y},"3",0,${line.fontMultiplier},${line.fontMultiplier},"${line.text}"`);
  }

  if (layout.effectiveQrSizeMm > 0) {
    const x = mmToDots(layout.qrXmm, settings.dpi);
    const y = mmToDots(layout.qrYmm, settings.dpi);
    const moduleSize = settings.widthMm <= 40 ? 3 : 4;
    lines.push(`QRCODE ${x},${y},L,${moduleSize},A,0,"${layout.qrValue}"`);
  }

  lines.push("PRINT 1", "");
  return lines.join("\n");
}

export function generateZPLLabel(input: ThermalLabelInput, settings: ThermalLabelSettings): string {
  const layout = computeThermalLayout(input, settings);
  const widthDots = mmToDots(settings.widthMm, settings.dpi);
  const heightDots = mmToDots(settings.heightMm, settings.dpi);
  const lines: string[] = ["^XA", `^PW${widthDots}`, `^LL${heightDots}`];

  for (const line of layout.lines) {
    const x = mmToDots(line.xMm, settings.dpi);
    const y = mmToDots(line.yMm, settings.dpi);
    const fontSize = line.kind === "title" ? 24 * line.fontMultiplier : 26 * line.fontMultiplier;
    lines.push(`^FO${x},${y}^A0N,${fontSize},${fontSize}^FD${sanitizeZpl(line.text)}^FS`);
  }

  if (layout.effectiveQrSizeMm > 0) {
    const x = mmToDots(layout.qrXmm, settings.dpi);
    const y = mmToDots(layout.qrYmm, settings.dpi);
    const mag = settings.widthMm <= 40 ? 4 : 5;
    lines.push(`^FO${x},${y}^BQN,2,${mag}^FDLA,${sanitizeZpl(layout.qrValue)}^FS`);
  }

  lines.push("^XZ", "");
  return lines.join("\n");
}

export function generateThermalLabel(language: ThermalLanguage, input: ThermalLabelInput, settings: ThermalLabelSettings) {
  if (language === "zpl") {
    return generateZPLLabel(input, settings);
  }

  return generateTSPLLabel(input, settings);
}
