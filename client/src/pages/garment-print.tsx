import { useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Printer, QrCode as QrCodeIcon } from "lucide-react";

type GarmentResp = {
  code: string;
  qrUrl?: string | null;
};

export default function GarmentPrintPage() {
  const [, params] = useRoute("/garment/:code/print");
  const garmentCode = params?.code ? decodeURIComponent(params.code) : "";

  const endpoint = garmentCode
    ? `/api/garments/by-code/${encodeURIComponent(garmentCode)}`
    : "";

  const { data, isLoading, error } = useQuery<GarmentResp>({
    queryKey: [endpoint],
    enabled: !!endpoint,
  });

  const imgRef = useRef<HTMLImageElement | null>(null);

  // Auto-print when image is ready (with button fallback)
  useEffect(() => {
    if (!data?.qrUrl) return;
    const img = imgRef.current;
    if (!img) return;

    const doPrint = () => setTimeout(() => window.print(), 250);

    if (img.complete) doPrint();
    else img.addEventListener("load", doPrint, { once: true });
  }, [data?.qrUrl]);

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print flex items-center gap-3 mb-6">
        <Link href={garmentCode ? `/garment/${encodeURIComponent(garmentCode)}` : "/search"}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>

        <div className="flex-1">
          <div className="text-lg font-semibold">Print Garment QR</div>
          <div className="text-sm text-muted-foreground font-mono">{garmentCode || "—"}</div>
        </div>

        <Button variant="outline" onClick={() => window.print()} disabled={!data?.qrUrl}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      <div id="print-area" className="flex justify-center">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCodeIcon className="h-5 w-5" />
                Garment QR Code
              </CardTitle>
              <CardDescription className="font-mono">{garmentCode}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading QR…</div>
              ) : error || !data?.qrUrl ? (
                <div className="text-sm text-destructive">Could not load QR.</div>
              ) : (
                <div className="qr-box"><img
                  ref={imgRef}
                  src={data.qrUrl}
                  alt={`QR Code for ${data.code}`}
                  className="qr-img w-72 h-72"
                /></div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
