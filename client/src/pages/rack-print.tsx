import { useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Printer, QrCode as QrCodeIcon } from "lucide-react";

type QrResp = {
  rackId: string;
  code: string;
  rackUrl: string;
  qrUrl: string;
};

export default function RackPrintPage() {
  const [, params] = useRoute("/rack/:code/print");
  const rackCode = params?.code ? decodeURIComponent(params.code) : "";

  const { data, isLoading, error } = useQuery<QrResp>({
    queryKey: ["/api/racks/by-code", rackCode, "qr"],
    enabled: !!rackCode,
  });

  const imgRef = useRef<HTMLImageElement | null>(null);

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
        <Link href={rackCode ? `/rack/${encodeURIComponent(rackCode)}` : "/search"}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>

        <div className="flex-1">
          <div className="text-lg font-semibold">Print Rack QR</div>
          <div className="text-sm text-muted-foreground font-mono">{rackCode || "—"}</div>
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
                Rack QR Code
              </CardTitle>
              <CardDescription className="font-mono">
                {rackCode}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading QR…</div>
              ) : error || !data?.qrUrl ? (
                <div className="text-sm text-destructive">Could not load QR.</div>
              ) : (
                <>
                  <img
                    ref={imgRef}
                    src={data.qrUrl}
                    alt={`QR Code for ${data.code}`}
                    className="w-72 h-72"
                  />
                  <div className="text-xs text-muted-foreground text-center break-all">
                    {data.rackUrl}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
