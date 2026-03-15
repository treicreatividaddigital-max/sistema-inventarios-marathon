import { generateThermalLabel, type ThermalLabelInput, type ThermalLabelSettings, type ThermalLanguage } from "@/lib/labelGenerator";

const QZ_LOCAL_SCRIPT = "/vendor/qz/qz-tray.js";
const QZ_REMOTE_SCRIPT = "https://demo.qz.io/js/qz-tray.js";
const QZ_REMOTE_HOST = "demo.qz.io";

const QZ_RECOVERY_WAIT_MS = 350;
const QZ_DISCONNECT_WAIT_MS = 1200;
const QZ_STATE_POLL_MS = 100;

let qzLoaderPromise: Promise<QzTrayApi> | null = null;

const THERMAL_PRINTER_HINTS = [
  "label",
  "thermal",
  "zebra",
  "tsc",
  "tspl",
  "zpl",
  "barcode",
  "qr",
  "gk",
  "gx",
  "zd",
  "ql",
  "avivar",
];

export type QzConnectionSeverity = "ready" | "warning" | "error";

export type QzPrinterConnectionSnapshot = {
  connected: boolean;
  installedPrinters: string[];
  defaultPrinter: string;
  selectedPrinter: string;
  rememberedPrinter?: string;
  message: string;
  severity: QzConnectionSeverity;
  checkedAt: number;
};

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

function findLikelyThermalPrinter(installedPrinters: string[]) {
  const ranked = installedPrinters
    .map((printer) => ({
      printer,
      score: THERMAL_PRINTER_HINTS.reduce((total, hint) => total + (normalizePrinterName(printer).includes(hint) ? 1 : 0), 0),
    }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score ? ranked[0].printer : null;
}

function getWindowQz(): QzTrayApi | null {
  if (typeof window === "undefined") return null;
  return window.qz ?? null;
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function isQzActive(qz: QzTrayApi) {
  return Boolean(await qz.websocket.isActive());
}

async function waitForQzState(qz: QzTrayApi, expectedActive: boolean, timeoutMs: number) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if ((await isQzActive(qz)) === expectedActive) return true;
    await sleep(QZ_STATE_POLL_MS);
  }
  return (await isQzActive(qz)) === expectedActive;
}

async function safeDisconnectQz(qz: QzTrayApi) {
  try {
    if (await isQzActive(qz)) {
      await qz.websocket.disconnect();
    }
  } catch {
    // noop
  }

  await waitForQzState(qz, false, QZ_DISCONNECT_WAIT_MS);
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
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
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

async function connectQz(qz: QzTrayApi) {
  if (await isQzActive(qz)) return;

  try {
    await qz.websocket.connect({ retries: 2, delay: 0.5 });
  } catch {
    if (!(await isQzActive(qz))) {
      await qz.websocket.connect({ host: QZ_REMOTE_HOST, retries: 2, delay: 0.5 });
    }
  }

  const becameActive = await waitForQzState(qz, true, 2000);
  if (!becameActive) {
    throw new Error("QZ Tray no respondió después del intento de conexión.");
  }
}

export async function ensureQzConnection(): Promise<QzTrayApi> {
  const qz = await loadQzTray();
  await connectQz(qz);
  return qz;
}

async function warmupPrinterSession(qz: QzTrayApi, preferredPrinterName?: string) {
  const preferredTrimmed = (preferredPrinterName || "").trim();

  let installedPrinters: string[] = [];
  try {
    const printers = await qz.printers.find();
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

  let matchedPreferred = findMatchingPrinterName(installedPrinters, preferredTrimmed);
  if (!matchedPreferred && preferredTrimmed) {
    try {
      const found = await qz.printers.find(preferredTrimmed);
      if (typeof found === "string" && found.trim()) {
        matchedPreferred = findMatchingPrinterName(installedPrinters, found) || found.trim();
      }
    } catch {
      matchedPreferred = null;
    }
  }

  const matchedDefault = findMatchingPrinterName(installedPrinters, defaultPrinter);
  const likelyThermalPrinter = findLikelyThermalPrinter(installedPrinters);
  const selectedPrinter = matchedPreferred || matchedDefault || likelyThermalPrinter || installedPrinters[0] || "";

  return {
    installedPrinters,
    defaultPrinter: matchedDefault || defaultPrinter,
    selectedPrinter,
    matchedPreferred,
  };
}

export async function resolvePreferredPrinterSelection(preferredPrinterName?: string): Promise<{
  selectedPrinter: string;
  installedPrinters: string[];
  defaultPrinter: string;
}> {
  const preferredTrimmed = (preferredPrinterName || "").trim();
  const snapshot = await getQzPrinterConnectionSnapshot(preferredTrimmed);

  return {
    selectedPrinter: snapshot.selectedPrinter,
    installedPrinters: snapshot.installedPrinters,
    defaultPrinter: snapshot.defaultPrinter,
  };
}

async function resolvePrinterName(qz: QzTrayApi, printerName: string) {
  const trimmed = printerName.trim();
  if (!trimmed) {
    throw new Error("Falta el nombre de la impresora.");
  }

  const warmedUp = await warmupPrinterSession(qz, trimmed);
  const matched = findMatchingPrinterName(warmedUp.installedPrinters, trimmed) || findMatchingPrinterName(warmedUp.installedPrinters, warmedUp.selectedPrinter);
  if (matched) return matched;

  try {
    const found = await qz.printers.find(trimmed);
    if (typeof found === "string" && found.trim()) return found.trim();
  } catch {
    // noop
  }

  throw new Error(`No se encontró la impresora ${trimmed}.`);
}

export async function reconnectQzPrinter(preferredPrinterName?: string) {
  const qz = await loadQzTray();
  const wasActive = await isQzActive(qz);

  if (!wasActive) {
    await safeDisconnectQz(qz);
    await connectQz(qz);
    await sleep(QZ_RECOVERY_WAIT_MS);
  }

  await warmupPrinterSession(qz, preferredPrinterName);
  return getQzPrinterConnectionSnapshot(preferredPrinterName);
}

export async function getQzPrinterConnectionSnapshot(preferredPrinterName?: string): Promise<QzPrinterConnectionSnapshot> {
  const preferredTrimmed = (preferredPrinterName || "").trim();

  try {
    const qz = await ensureQzConnection();
    const connected = await isQzActive(qz);

    const { installedPrinters, defaultPrinter, selectedPrinter, matchedPreferred } = await warmupPrinterSession(qz, preferredTrimmed);

    if (!connected) {
      return {
        connected: false,
        installedPrinters,
        defaultPrinter,
        selectedPrinter: "",
        rememberedPrinter: preferredTrimmed,
        message: "No se pudo conectar con QZ Tray.",
        severity: "error",
        checkedAt: Date.now(),
      };
    }

    if (!installedPrinters.length) {
      return {
        connected: true,
        installedPrinters,
        defaultPrinter: "",
        selectedPrinter: "",
        rememberedPrinter: preferredTrimmed,
        message: "No se ha podido encontrar tu impresora. Revisa que esté encendida y conectada, luego vuelve a intentar.",
        severity: "warning",
        checkedAt: Date.now(),
      };
    }

    if (preferredTrimmed && !matchedPreferred && selectedPrinter) {
      return {
        connected: true,
        installedPrinters,
        defaultPrinter,
        selectedPrinter,
        rememberedPrinter: preferredTrimmed,
        message: `Tu impresora guardada no estaba disponible. Se seleccionó automáticamente ${selectedPrinter}.`,
        severity: "warning",
        checkedAt: Date.now(),
      };
    }

    return {
      connected: true,
      installedPrinters,
      defaultPrinter,
      selectedPrinter,
      rememberedPrinter: preferredTrimmed,
      message: selectedPrinter
        ? `QZ Tray conectado. Impresora seleccionada: ${selectedPrinter}.`
        : "QZ Tray conectado. Selecciona una impresora para continuar.",
      severity: "ready",
      checkedAt: Date.now(),
    };
  } catch (error) {
    return {
      connected: false,
      installedPrinters: [],
      defaultPrinter: "",
      selectedPrinter: "",
      rememberedPrinter: preferredTrimmed,
      message: describeQzError(error),
      severity: "error",
      checkedAt: Date.now(),
    };
  }
}

export async function getDefaultPrinterName(): Promise<string> {
  const qz = await ensureQzConnection();
  return qz.printers.getDefault();
}

export async function getInstalledPrinters(): Promise<string[]> {
  const qz = await ensureQzConnection();
  const printers = await qz.printers.find();
  return Array.isArray(printers) ? printers : [];
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
  if (/already exists/i.test(message)) {
    return "QZ Tray ya estaba conectado. ARCHIVE volverá a consultar la impresora sin abrir una segunda conexión.";
  }
  if (/specified printer could not be found|no se encontró la impresora|printer could not be found/i.test(message)) {
    return "No se ha podido encontrar tu impresora. Revisa que esté encendida y conectada, luego vuelve a intentar.";
  }
  if (/load/i.test(message) && /qz/i.test(message)) {
    return "No se pudo cargar qz-tray.js. Revisa la red o copia el archivo en /client/public/vendor/qz/.";
  }
  if (/connect|websocket|localhost|demo\.qz\.io|8181|8182/i.test(message)) {
    return "No se pudo conectar con QZ Tray. Verifica que la app de escritorio esté abierta y vuelve a intentar.";
  }
  if (/printer/i.test(message)) {
    return "No se ha podido encontrar tu impresora. Revisa que esté encendida y conectada, luego vuelve a intentar.";
  }
  return message;
}
