import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Camera, Chrome, Download, Printer, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Separator } from "@/components/ui/separator";

const QZ_TRAY_DOWNLOAD_URL = "https://qz.io/download/";

// Patrón bilingüe reutilizable: cada tutorial define su propio tipo de
// contenido y un CONTENT: Record<Lang, T>. Sin librería de i18n.
type Lang = "es" | "en";

interface HelpStep {
  title: string;
  body: string;
  screenshot?: string;
}

interface ProtocolEntry {
  protocol: string;
  brandHints: string;
}

interface PrintingHelpContent {
  pageTitle: string;
  backLabel: string;
  introHeading: string;
  introBody: string;
  protocolsHeading: string;
  protocolsIntro: string;
  protocols: ProtocolEntry[];
  tutorialHeading: string;
  tutorialIntro: string;
  steps: HelpStep[];
  chromeNoteTitle: string;
  chromeNoteBody: string;
  troubleshootHeading: string;
  troubleshootNoPrinterTitle: string;
  troubleshootNoPrinterBody: string;
  troubleshootNoProtocolTitle: string;
  troubleshootNoProtocolBody: string;
}

const CONTENT: Record<Lang, PrintingHelpContent> = {
  es: {
    pageTitle: "Ayuda para imprimir etiquetas térmicas",
    backLabel: "Volver",
    introHeading: "¿Qué es QZ Tray y por qué se necesita?",
    introBody:
      "Los navegadores no pueden enviar datos directo a una impresora térmica. QZ Tray es una app pequeña que instalas en tu computadora y que hace de puente entre ARCHIVE y tu impresora: sin QZ Tray abierto y corriendo, no vas a poder imprimir etiquetas térmicas.",
    protocolsHeading: "Identifica el protocolo de tu impresora",
    protocolsIntro:
      "Las impresoras térmicas hablan distintos \"idiomas\" (protocolos). Para saber cuál usa la tuya, revisa la caja, el manual o busca el modelo exacto en internet. Las marcas de abajo son solo una PISTA — lo que importa es el protocolo, no la marca.",
    protocols: [
      {
        protocol: "ZPL",
        brandHints: "Zebra y compatibles (TSC, Godex, algunas HP...)",
      },
      {
        protocol: "TSPL",
        brandHints: "TSC",
      },
      {
        protocol: "EPL",
        brandHints: "[Completar: marcas asociadas a EPL — pendiente de confirmar]",
      },
      {
        protocol: "ESC/POS",
        brandHints: "Epson, Star, Bixolon...",
      },
    ],
    tutorialHeading: "Tutorial: instalar y conectar QZ Tray",
    tutorialIntro: "Sigue estos pasos en orden la primera vez que configures tu impresora en esta computadora.",
    steps: [
      {
        title: "1. Qué es QZ Tray y por qué ARCHIVE lo necesita",
        body: "QZ Tray es el puente entre tu navegador y tu impresora térmica. ARCHIVE lo usa para imprimir etiquetas sin pasar por el diálogo de impresión normal del navegador.",
      },
      {
        title: "2. Descargar e instalar la app de escritorio",
        body: "Descarga QZ Tray desde el sitio oficial e instálalo como cualquier otra app en tu computadora.",
        screenshot: "Instalador de QZ Tray en Mac — pendiente",
      },
      {
        title: "2b. En Windows",
        body: "El instalador de Windows es similar: acepta los permisos que pida el sistema operativo.",
        screenshot: "Instalador de QZ Tray en Windows — pendiente",
      },
      {
        title: "3. Primer inicio: acepta el popup de seguridad",
        body: "Al abrir QZ Tray por primera vez puede aparecer un popup nativo pidiendo confiar en la conexión. Esa ventana la muestra QZ Tray (la app que instalaste), no ARCHIVE — es normal y hay que aceptarla para continuar.",
        screenshot: "Popup de seguridad de QZ Tray — pendiente",
      },
      {
        title: "4. Verifica tu impresora en el sistema operativo",
        body: "Antes de volver a ARCHIVE, confirma que tu impresora aparece en el panel de impresoras de tu sistema operativo y anota su nombre exacto — lo vas a necesitar si ARCHIVE no la detecta automáticamente.",
        screenshot: "Panel de impresoras del sistema operativo — pendiente",
      },
      {
        title: "5. Vuelve a ARCHIVE y detecta la impresora",
        body: "Con QZ Tray abierto, vuelve a la pantalla de impresión en ARCHIVE y presiona \"Detectar\". Si todo salió bien, vas a ver un indicador verde confirmando que la impresora está lista.",
        screenshot: "Indicador verde \"Impresora lista\" en ARCHIVE — pendiente",
      },
      {
        title: "6. Si el indicador queda en rojo",
        body: "Revisa en este orden: que QZ Tray esté abierto y corriendo, que la impresora esté encendida y conectada (cable o red), y vuelve a presionar \"Detectar\". Si sigue en rojo, puedes usar \"Imprimir prueba\" para descartar el problema.",
        screenshot: "Indicador rojo \"QZ Tray no conectado\" — pendiente",
      },
      {
        title: "7. Calibra los offsets (dots) la primera vez",
        body: "Cada impresora puede imprimir el texto y el QR ligeramente desplazados. Imprime una etiqueta de prueba y ajusta los offsets en \"dots\" hasta que el resultado se vea centrado y legible.",
        screenshot: "Ejemplo de etiqueta impresa con offsets ajustados — pendiente",
      },
    ],
    chromeNoteTitle: "Nota sobre el navegador",
    chromeNoteBody:
      "ARCHIVE funciona en cualquier navegador moderno. QZ Tray suele dar menos problemas en Chrome, pero no es obligatorio — es solo una recomendación.",
    troubleshootHeading: "No veo mi impresora / no sé mi protocolo",
    troubleshootNoPrinterTitle: "No veo mi impresora en la lista",
    troubleshootNoPrinterBody:
      "Confirma que QZ Tray está abierto y que la impresora está encendida y conectada, luego presiona \"Detectar\" de nuevo. Si sigue sin aparecer, revisa el paso 4 de este tutorial: el nombre de la impresora en tu sistema operativo debe coincidir (o parecerse) al que buscas en ARCHIVE.",
    troubleshootNoProtocolTitle: "No sé qué protocolo usa mi impresora",
    troubleshootNoProtocolBody:
      "Revisa la caja, el manual o el modelo exacto de tu impresora (ver sección \"Identifica el protocolo\" arriba). Si no puedes confirmarlo, ARCHIVE sugiere empezar probando con TSPL, que suele ser la mejor opción para etiquetas térmicas compactas.",
  },
  en: {
    pageTitle: "Thermal label printing help",
    backLabel: "Back",
    introHeading: "What is QZ Tray and why is it needed?",
    introBody:
      "Browsers can't send data directly to a thermal printer. QZ Tray is a small app you install on your computer that bridges ARCHIVE and your printer: without QZ Tray open and running, you won't be able to print thermal labels.",
    protocolsHeading: "Identify your printer's protocol",
    protocolsIntro:
      "Thermal printers speak different \"languages\" (protocols). To find out which one yours uses, check the box, the manual, or look up the exact model online. The brands below are just a HINT — what matters is the protocol, not the brand.",
    protocols: [
      {
        protocol: "ZPL",
        brandHints: "Zebra and compatibles (TSC, Godex, some HP...)",
      },
      {
        protocol: "TSPL",
        brandHints: "TSC",
      },
      {
        protocol: "EPL",
        brandHints: "[To complete: brands associated with EPL — pending confirmation]",
      },
      {
        protocol: "ESC/POS",
        brandHints: "Epson, Star, Bixolon...",
      },
    ],
    tutorialHeading: "Tutorial: install and connect QZ Tray",
    tutorialIntro: "Follow these steps in order the first time you set up your printer on this computer.",
    steps: [
      {
        title: "1. What QZ Tray is and why ARCHIVE needs it",
        body: "QZ Tray is the bridge between your browser and your thermal printer. ARCHIVE uses it to print labels without going through the browser's normal print dialog.",
      },
      {
        title: "2. Download and install the desktop app",
        body: "Download QZ Tray from the official site and install it like any other app on your computer.",
        screenshot: "QZ Tray installer on Mac — pending",
      },
      {
        title: "2b. On Windows",
        body: "The Windows installer is similar: accept any permissions requested by the operating system.",
        screenshot: "QZ Tray installer on Windows — pending",
      },
      {
        title: "3. First launch: accept the security popup",
        body: "The first time you open QZ Tray, a native popup may appear asking you to trust the connection. That window comes from QZ Tray (the app you installed), not from ARCHIVE — it's normal and you need to accept it to continue.",
        screenshot: "QZ Tray security popup — pending",
      },
      {
        title: "4. Verify your printer on the operating system",
        body: "Before going back to ARCHIVE, confirm your printer shows up in your operating system's printer panel and note its exact name — you'll need it if ARCHIVE doesn't detect it automatically.",
        screenshot: "Operating system printer panel — pending",
      },
      {
        title: "5. Go back to ARCHIVE and detect the printer",
        body: "With QZ Tray open, go back to the printing screen in ARCHIVE and press \"Detect\". If everything went well, you'll see a green indicator confirming the printer is ready.",
        screenshot: "Green \"Printer ready\" indicator in ARCHIVE — pending",
      },
      {
        title: "6. If the indicator stays red",
        body: "Check, in this order: that QZ Tray is open and running, that the printer is powered on and connected (cable or network), and press \"Detect\" again. If it's still red, you can use \"Test print\" to rule out the issue.",
        screenshot: "Red \"QZ Tray not connected\" indicator — pending",
      },
      {
        title: "7. Calibrate the offsets (dots) the first time",
        body: "Every printer may print the text and QR code slightly offset. Print a test label and adjust the offsets in \"dots\" until the result looks centered and legible.",
        screenshot: "Example of a printed label with adjusted offsets — pending",
      },
    ],
    chromeNoteTitle: "Note about the browser",
    chromeNoteBody:
      "ARCHIVE works in any modern browser. QZ Tray tends to have fewer issues in Chrome, but it's not required — it's just a recommendation.",
    troubleshootHeading: "I can't see my printer / I don't know my protocol",
    troubleshootNoPrinterTitle: "I don't see my printer in the list",
    troubleshootNoPrinterBody:
      "Confirm QZ Tray is open and the printer is powered on and connected, then press \"Detect\" again. If it still doesn't show up, check step 4 of this tutorial: the printer name on your operating system must match (or be similar to) the one you're looking for in ARCHIVE.",
    troubleshootNoProtocolTitle: "I don't know what protocol my printer uses",
    troubleshootNoProtocolBody:
      "Check the box, the manual, or the exact model of your printer (see the \"Identify the protocol\" section above). If you can't confirm it, ARCHIVE suggests starting with TSPL, which tends to be the best option for compact thermal labels.",
  },
};

function ScreenshotPlaceholder({ label, lang }: { label: string; lang: Lang }) {
  const prefix = lang === "es" ? "Captura" : "Screenshot";
  return (
    <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
      <Camera className="h-4 w-4 shrink-0" />
      <span>
        [{prefix}: {label}]
      </span>
    </div>
  );
}

export default function HelpPrintingPage() {
  const [lang, setLang] = useState<Lang>("es");
  const t = CONTENT[lang];

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/curator/print-qrs">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.backLabel}
          </Button>
        </Link>
        <ToggleGroup type="single" value={lang} onValueChange={(value) => value && setLang(value as Lang)} variant="outline">
          <ToggleGroupItem value="es" aria-label="Español">ES</ToggleGroupItem>
          <ToggleGroupItem value="en" aria-label="English">EN</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex items-center gap-3">
        <Printer className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight">{t.pageTitle}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.introHeading}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">{t.introBody}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {t.protocolsHeading}
          </CardTitle>
          <CardDescription>{t.protocolsIntro}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {t.protocols.map((entry) => (
            <div key={entry.protocol} className="flex flex-col gap-1 rounded-md border p-3 sm:flex-row sm:items-center sm:gap-3">
              <Badge variant="secondary" className="w-fit shrink-0">{entry.protocol}</Badge>
              <p className="text-sm text-muted-foreground">{entry.brandHints}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.tutorialHeading}</CardTitle>
          <CardDescription>{t.tutorialIntro}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {t.steps.map((step, index) => (
            <div key={step.title}>
              {index > 0 && <Separator className="mb-5" />}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{step.body}</p>
                {step.screenshot && <ScreenshotPlaceholder label={step.screenshot} lang={lang} />}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Alert>
        <Chrome className="h-4 w-4" />
        <AlertTitle>{t.chromeNoteTitle}</AlertTitle>
        <AlertDescription>{t.chromeNoteBody}</AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>{t.troubleshootHeading}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">{t.troubleshootNoPrinterTitle}</h3>
            <p className="text-sm leading-6 text-muted-foreground">{t.troubleshootNoPrinterBody}</p>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">{t.troubleshootNoProtocolTitle}</h3>
            <p className="text-sm leading-6 text-muted-foreground">{t.troubleshootNoProtocolBody}</p>
          </div>
        </CardContent>
      </Card>

      <Button type="button" variant="outline" asChild>
        <a href={QZ_TRAY_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
          <Download className="mr-2 h-4 w-4" />
          {lang === "es" ? "Descargar QZ Tray" : "Download QZ Tray"}
        </a>
      </Button>
    </div>
  );
}
