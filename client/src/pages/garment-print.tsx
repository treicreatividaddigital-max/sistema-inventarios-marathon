import { useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { QRCodeSVG } from "qrcode.react";

type PrintPreset = "thermal-50";

const PRINT_CONFIG: Record<
  PrintPreset,
  {
    pageMm: number;
    qrMm: number;
    fontPx: number;
    codeFontPx: number;
    label: string;
  }
> = {
  "thermal-50": {
    pageMm: 50,
    qrMm: 28,
    fontPx: 9,
    codeFontPx: 7,
    label: "ARCHIVE",
  },
};

function readGarmentId(options: {
  params?: { id?: string; garmentId?: string };
  path: string;
}): string {
  const fromParams = options.params?.id ?? options.params?.garmentId;
  if (fromParams && fromParams.trim()) return fromParams.trim();

  if (typeof window !== "undefined") {
    const search = new URLSearchParams(window.location.search);
    const fromQuery = search.get("id") ?? search.get("garmentId");
    if (fromQuery && fromQuery.trim()) return fromQuery.trim();
  }

  const path = options.path || "";
  const patterns = [
    /\/garments\/([^/]+)\/print\/?$/i,
    /\/garment\/([^/]+)\/print\/?$/i,
    /\/garment-print\/([^/]+)\/?$/i,
    /\/print\/([^/]+)\/?$/i,
    /\/garments\/([^/]+)\/?$/i,
    /\/garment\/([^/]+)\/?$/i,
  ];

  for (const pattern of patterns) {
    const match = path.match(pattern);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }

  return "";
}

export default function GarmentPrintPage() {
  const params = useParams<{ id?: string; garmentId?: string }>();
  const [location, navigate] = useLocation();

  const preset: PrintPreset = "thermal-50";
  const config = PRINT_CONFIG[preset];

  const garmentId = useMemo(() => {
    return readGarmentId({
      params,
      path: location,
    });
  }, [params, location]);

  const qrValue = useMemo(() => {
    if (typeof window === "undefined" || !garmentId) return "";
    const base = window.location.origin;
    return `${base}/garment/${garmentId}`;
  }, [garmentId]);

  useEffect(() => {
    if (!garmentId) return;

    const timeout = window.setTimeout(() => {
      window.print();
    }, 400);

    const handleAfterPrint = () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        navigate(`/garment/${garmentId}`);
      }
    };

    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, [garmentId, navigate]);

  if (!garmentId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white p-6 text-center">
        <div className="max-w-md">
          <h1 className="text-lg font-semibold">No se pudo generar el QR</h1>
          <p className="text-sm text-neutral-600 mt-2">
            Falta el identificador del garment.
          </p>
          <p className="text-xs text-neutral-500 mt-3 break-all">
            Ruta detectada: {location || "(vacía)"}
          </p>
          {typeof window !== "undefined" && window.location.search ? (
            <p className="text-xs text-neutral-500 mt-1 break-all">
              Query detectada: {window.location.search}
            </p>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <>
      <style>{`
        @page {
          size: 50mm 50mm;
          margin: 0;
        }

        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          background: #ffffff;
        }

        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          background: #ffffff;
        }

        .qr-print-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          padding: 24px;
          box-sizing: border-box;
        }

        .qr-print-area {
          width: 50mm;
          height: 50mm;
          background: #ffffff;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e5e7eb;
        }

        .qr-print-card {
          width: 50mm;
          height: 50mm;
          background: #ffffff;
          box-sizing: border-box;
          padding: 3mm 3mm 3mm 3mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1.2mm;
          overflow: hidden;
        }

        .qr-box {
          width: 28mm;
          height: 28mm;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          overflow: hidden;
          flex: 0 0 auto;
        }

        .qr-svg {
          width: 100%;
          height: 100%;
          display: block;
        }

        .qr-label {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 9px;
          line-height: 1;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #000000;
          flex: 0 0 auto;
        }

        .qr-code-text {
          max-width: 42mm;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 7px;
          line-height: 1.1;
          font-weight: 600;
          color: #000000;
          text-align: center;
          word-break: break-word;
          overflow-wrap: anywhere;
          flex: 0 0 auto;
        }

        @media print {
          html, body, #root {
            width: 50mm !important;
            height: 50mm !important;
            min-height: 50mm !important;
            overflow: hidden !important;
            background: #ffffff !important;
          }

          body * {
            visibility: hidden !important;
          }

          #qr-print-area,
          #qr-print-area * {
            visibility: visible !important;
          }

          #qr-print-area {
            position: fixed !important;
            inset: 0 !important;
            left: 0 !important;
            top: 0 !important;
            width: 50mm !important;
            height: 50mm !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            z-index: 2147483647 !important;
            background: #ffffff !important;
          }

          .qr-print-card {
            width: 50mm !important;
            height: 50mm !important;
            padding: 3mm 3mm 3mm 3mm !important;
            gap: 1.2mm !important;
          }

          .qr-box {
            width: 28mm !important;
            height: 28mm !important;
          }

          .qr-label {
            font-size: 9px !important;
          }

          .qr-code-text {
            font-size: 7px !important;
            max-width: 42mm !important;
          }
        }
      `}</style>

      <main className="qr-print-screen">
        <section
          id="qr-print-area"
          className="qr-print-area"
          aria-label="Etiqueta QR para impresión"
        >
          <div className="qr-print-card">
            <div className="qr-box">
              <QRCodeSVG
                value={qrValue}
                size={512}
                level="M"
                includeMargin={true}
                bgColor="#FFFFFF"
                fgColor="#000000"
                className="qr-svg"
              />
            </div>

            <div className="qr-label" style={{ fontSize: `${config.fontPx}px` }}>
              {config.label}
            </div>

            <div
              className="qr-code-text"
              style={{ fontSize: `${config.codeFontPx}px` }}
              title={garmentId}
            >
              {garmentId}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
