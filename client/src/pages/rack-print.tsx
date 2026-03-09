import { useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";

type QrResp = {
  rackId: string;
  code: string;
  rackUrl: string;
  qrUrl: string;
};

export default function RackPrintPage() {
  const [, params] = useRoute("/rack/:code/print");
  const rackCode = params?.code ? decodeURIComponent(params.code) : "";

  const qrEndpoint = rackCode
    ? `/api/racks/by-code/${encodeURIComponent(rackCode)}/qr`
    : "";

  const { data, isLoading, error } = useQuery<QrResp>({
    queryKey: [qrEndpoint],
    enabled: !!qrEndpoint,
  });

  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!data?.qrUrl) return;
    const img = imgRef.current;
    if (!img) return;

    const doPrint = () => {
      window.setTimeout(() => window.print(), 300);
    };

    if (img.complete) {
      doPrint();
      return;
    }

    img.addEventListener("load", doPrint, { once: true });
    return () => {
      img.removeEventListener("load", doPrint);
    };
  }, [data?.qrUrl]);

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

        .rack-print-screen {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #ffffff;
          box-sizing: border-box;
        }

        .rack-print-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
          background: #ffffff;
        }

        .rack-print-toolbar-title {
          flex: 1;
          min-width: 0;
        }

        .rack-print-toolbar-title-main {
          font-size: 18px;
          font-weight: 600;
          line-height: 1.1;
        }

        .rack-print-toolbar-title-code {
          font-size: 12px;
          line-height: 1.2;
          color: #6b7280;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          margin-top: 4px;
          word-break: break-all;
        }

        .rack-print-stage {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          padding: 24px;
          box-sizing: border-box;
        }

        #rack-print-area {
          width: 50mm;
          height: 50mm;
          background: #ffffff;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e5e7eb;
        }

        .rack-print-card {
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

        .rack-qr-box {
          width: 28mm;
          height: 28mm;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          overflow: hidden;
          flex: 0 0 auto;
        }

        .rack-qr-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
          image-rendering: crisp-edges;
        }

        .rack-print-label {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 9px;
          line-height: 1;
          font-weight: 700;
          letter-spacing: 0.08em;
          color: #000000;
          flex: 0 0 auto;
          text-align: center;
        }

        .rack-print-code {
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

        .rack-print-state {
          font-size: 14px;
          line-height: 1.4;
          color: #6b7280;
          text-align: center;
          max-width: 320px;
        }

        .rack-print-state-error {
          color: #b91c1c;
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

          #rack-print-area,
          #rack-print-area * {
            visibility: visible !important;
          }

          #rack-print-area {
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

          .rack-print-card {
            width: 50mm !important;
            height: 50mm !important;
            padding: 3mm 3mm 3mm 3mm !important;
            gap: 1.2mm !important;
          }

          .rack-qr-box {
            width: 28mm !important;
            height: 28mm !important;
          }

          .rack-print-label {
            font-size: 9px !important;
          }

          .rack-print-code {
            font-size: 7px !important;
            max-width: 42mm !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <main className="rack-print-screen">
        <div className="rack-print-toolbar no-print">
          <Link href={rackCode ? `/rack/${encodeURIComponent(rackCode)}` : "/search"}>
            <Button variant="ghost" size="icon" aria-label="Back to rack">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>

          <div className="rack-print-toolbar-title">
            <div className="rack-print-toolbar-title-main">Print Rack QR</div>
            <div className="rack-print-toolbar-title-code">{rackCode || "—"}</div>
          </div>

          <Button variant="outline" onClick={() => window.print()} disabled={!data?.qrUrl}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>

        <div className="rack-print-stage">
          {isLoading ? (
            <div className="rack-print-state no-print">Loading QR…</div>
          ) : error || !data?.qrUrl ? (
            <div className="rack-print-state rack-print-state-error no-print">
              Could not load QR.
            </div>
          ) : (
            <section
              id="rack-print-area"
              aria-label="Rack QR label for printing"
            >
              <div className="rack-print-card">
                <div className="rack-qr-box">
                  <img
                    ref={imgRef}
                    src={data.qrUrl}
                    alt={`QR Code for ${data.code}`}
                    className="rack-qr-image"
                  />
                </div>

                <div className="rack-print-label">ARCHIVE</div>

                <div className="rack-print-code" title={data.code}>
                  {data.code}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
