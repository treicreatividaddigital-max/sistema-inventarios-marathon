import { generateThermalLabel, type ThermalLabelInput, type ThermalLabelSettings, type ThermalLanguage } from "@/lib/labelGenerator";

const QZ_LOCAL_SCRIPT = "/vendor/qz/qz-tray.js";
const QZ_REMOTE_SCRIPT = "https://demo.qz.io/js/qz-tray.js";
const QZ_REMOTE_HOST = "demo.qz.io";

let qzLoaderPromise: Promise<QzTrayApi> | null = null;

export function normalizePrinterName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}


export function findMatchingPrinterName(installedPrinters: string[], candidate: string) {
  const trimmed = candidate.trim();
  if (!trimmed) return null;

  const exact = installedPrinters.find((item) => item === trimmed);
  if (exact) return exact;

  const normalizedTarget = normalizePrinterName(trimmed);
  const caseInsensitive = installedPrinters.find((item) => normalizePrinterName(item) === normalizedTarget);
  if (caseInsensitive) return caseInsensitive;

  const partial = installedPrinters.filter(
    (item) => normalizePrinterName(item).includes(normalizedTarget) || normalizedTarget.includes(normalizePrinterName(item)),
  );
  if (partial.length === 1) return partial[0];

  return null;
}

export async function resolvePreferredPrinterSelection(preferredPrinterName?: string): Promise<{
  selectedPrinter: string;
  installedPrinters: string[];
  defaultPrinter: string;
}> {
  const preferredTrimmed = (preferredPrinterName || "").trim();
  const qz = await ensureQzConnection();

  let installedPrinters: string[] = [];
  try {
    const printers = await qz.printers.getPrinters();
    installedPrinters = Array.isArray(printers)
      ? printers.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
  } catch {
    installedPrinters = [];
  }

  let defaultPrinter = "";
  try {
    defaultPrinter = await qz.printers.getDefault();
  } catch {
    defaultPrinter = "";
  }

  const matchedDefault = findMatchingPrinterName(installedPrinters, defaultPrinter);
  const matchedPreferred = findMatchingPrinterName(installedPrinters, preferredTrimmed);

  return {
    selectedPrinter: matchedDefault || matchedPreferred || defaultPrinter || installedPrinters[0] || preferredTrimmed,
    installedPrinters,
    defaultPrinter: matchedDefault || defaultPrinter,
  };
}

async function resolvePrinterName(qz: QzTrayApi, printerName: string) {
  const trimmed = printerName.trim();
  if (!trimmed) {
    throw new Error("Falta el nombre de la impresora.");
  }

  let installed: string[] = [];
  try {
    const printers = await qz.printers.getPrinters();
    installed = Array.isArray(printers)
      ? printers.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
  } catch {
    installed = [];
  }

  const matched = findMatchingPrinterName(installed, trimmed);
  if (matched) return matched;

  try {
    const found = await qz.printers.find(trimmed);
    if (typeof found === "string" && found.trim()) return found;
  } catch {
    // seguimos al fallback final
  }

  return trimmed;
}


function getWindowQz(): QzTrayApi | null {
  if (typeof window === "undefined") return null;
  return window.qz ?? null;
}

function appendScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-qz-src="${src}"]`) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.qzSrc = src;
    script.addEventListener("load", () => {
      script.dataset.loaded = "true";
      resolve();
    }, { once: true });
    script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
    document.head.appendChild(script);
  });
}

function configureQzSecurity(qz: QzTrayApi) {
  if (!qz.security) return;
  qz.security.setCertificatePromise((resolve: QzPromiseResolver) => resolve(undefined));
  qz.security.setSignaturePromise(() => (resolve: QzPromiseResolver) => resolve(""));
}

export async function loadQzTray(): Promise<QzTrayApi> {
  if (typeof window === "undefined") {
    throw new Error("QZ Tray solo puede cargarse en el navegador.");
  }

  const readyQz = getWindowQz();
  if (readyQz) return readyQz;

  if (!qzLoaderPromise) {
    qzLoaderPromise = (async () => {
      try {
        await appendScript(QZ_LOCAL_SCRIPT);
      } catch {
        await appendScript(QZ_REMOTE_SCRIPT);
      }
      const loadedQz = getWindowQz();
      if (!loadedQz) throw new Error("No se pudo inicializar qz-tray.js.");
      configureQzSecurity(loadedQz);
      return loadedQz;
    })().catch((error) => {
      qzLoaderPromise = null;
      throw error;
    });
  }

  return qzLoaderPromise;
}

export async function ensureQzConnection(): Promise<QzTrayApi> {
  const qz = await loadQzTray();
  if (!qz.websocket.isActive()) {
    try {
      await qz.websocket.connect();
    } catch {
      await qz.websocket.connect({ host: QZ_REMOTE_HOST });
    }
  }
  return qz;
}

export async function getDefaultPrinterName(): Promise<string> {
  const qz = await ensureQzConnection();
  return qz.printers.getDefault();
}

export async function getInstalledPrinters(): Promise<string[]> {
  const qz = await ensureQzConnection();
  return qz.printers.getPrinters();
}

export async function printRawThermalLabels(params: {
  printerName: string;
  language: ThermalLanguage;
  labels: ThermalLabelInput[];
  settings: ThermalLabelSettings;
  jobName?: string;
}) {
  const qz = await ensureQzConnection();
  const printerName = params.printerName.trim();
  if (!printerName) throw new Error("Falta el nombre de la impresora.");

  const foundPrinter = await resolvePrinterName(qz, printerName);
  const config = qz.configs.create(foundPrinter, {
    jobName: params.jobName || `Archive ${params.labels.length} label(s)`,
    encoding: "UTF-8",
    copies: 1,
  });

  const rawLabels = params.labels.map((label) => generateThermalLabel(params.language, label, params.settings));
  await qz.print(config, rawLabels);
}

export async function printRawThermalLabel(params: {
  printerName: string;
  language: ThermalLanguage;
  label: ThermalLabelInput;
  settings: ThermalLabelSettings;
}) {
  await printRawThermalLabels({
    printerName: params.printerName,
    language: params.language,
    labels: [params.label],
    settings: params.settings,
    jobName: `Archive ${params.label.code}`,
  });
}

export function describeQzError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error || "Error desconocido");
  if (/load/i.test(message) && /qz/i.test(message)) {
    return "No se pudo cargar qz-tray.js. Revisa la red o copia el archivo en /client/public/vendor/qz/.";
  }
  if (/connect|websocket|localhost|demo\.qz\.io|8181|8182/i.test(message)) {
    return "No se pudo conectar con QZ Tray. Verifica que la app de escritorio esté abierta y que el navegador permita la conexión local.";
  }
  if (/printer/i.test(message)) {
    return "QZ Tray no encontró la impresora. Usa exactamente el nombre que aparece instalado en el sistema.";
  }
  return message;
}
