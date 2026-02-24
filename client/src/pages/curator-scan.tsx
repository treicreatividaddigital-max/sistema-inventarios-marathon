import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Camera, X } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Scanner, IDetectedBarcode } from "@yudiel/react-qr-scanner";

export default function CuratorScanPage() {
  const [, setLocation] = useLocation();
  const [isScanning, setIsScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef(false);

  const startScanning = () => {
    setIsScanning(true);
    setIsPaused(false);
    setError(null);
    processingRef.current = false;
  };

  const stopScanning = () => {
    setIsScanning(false);
    setIsPaused(false);
    processingRef.current = false;
  };

  const isValidRackCode = (code: string): boolean => {
  const c = (code || "").trim();
  return c.length > 0 && c.length <= 100 && /^[a-zA-Z0-9\-_]+$/.test(c);
};

// Garment codes in this app may contain spaces (e.g., "Prueba en Prod 1").
// Accept any non-empty code that can safely be used as a single path segment.
const isValidGarmentCode = (code: string): boolean => {
  const c = (code || "").trim();
  return c.length > 0 && c.length <= 100 && !c.includes("/") && !c.includes("\\");
};
const handleScan = (detectedCodes: IDetectedBarcode[]) => {
  if (!detectedCodes || detectedCodes.length === 0 || processingRef.current) {
    return;
  }

  const first = detectedCodes[0];
  const raw = (first?.rawValue || "").trim();
  if (!raw) return;

  const navigateSafely = (path: string) => {
    processingRef.current = true;
    setIsPaused(true);
    setTimeout(() => {
      setIsScanning(false);
      setTimeout(() => {
        setLocation(path);
      }, 50);
    }, 50);
  };

  // 1) Detect /garment/<code> or /rack/<code> anywhere in the scanned text (full URL or relative)
  const garmentMatch = raw.match(/\/garment\/([^?#\/]+)/i);
  const rackMatch = raw.match(/\/rack\/([^?#\/]+)/i);

  if (garmentMatch?.[1]) {
    const garmentCode = decodeURIComponent(garmentMatch[1]).trim();
    if (!garmentCode || !isValidGarmentCode(garmentCode)) {
      setError("Invalid garment QR code: code format is incorrect.");
      setIsScanning(false);
      processingRef.current = false;
      return;
    }
    navigateSafely(`/garment/${encodeURIComponent(garmentCode)}`);
    return;
  }

  if (rackMatch?.[1]) {
    const rackCode = decodeURIComponent(rackMatch[1]).trim();
    if (!rackCode || !isValidRackCode(rackCode)) {
      setError("Invalid rack QR code: code format is incorrect.");
      setIsScanning(false);
      processingRef.current = false;
      return;
    }
    navigateSafely(`/rack/${encodeURIComponent(rackCode)}`);
    return;
  }

  // 2) If it's a relative path without domain (e.g. "/garment/XXX")
  if (raw.startsWith("/garment/")) {
    const encoded = raw.split("/garment/")[1]?.split("/")[0] || "";
    const garmentCode = decodeURIComponent(encoded).trim();
    if (!garmentCode || !isValidGarmentCode(garmentCode)) {
      setError("Invalid garment QR code: code format is incorrect.");
      setIsScanning(false);
      processingRef.current = false;
      return;
    }
    navigateSafely(`/garment/${encodeURIComponent(garmentCode)}`);
    return;
  }

  if (raw.startsWith("/rack/")) {
    const encoded = raw.split("/rack/")[1]?.split("/")[0] || "";
    const rackCode = decodeURIComponent(encoded).trim();
    if (!rackCode || !isValidRackCode(rackCode)) {
      setError("Invalid rack QR code: code format is incorrect.");
      setIsScanning(false);
      processingRef.current = false;
      return;
    }
    navigateSafely(`/rack/${encodeURIComponent(rackCode)}`);
    return;
  }

  // 3) If it's just a code (no URL)
  if (isValidRackCode(raw)) {
    navigateSafely(`/rack/${encodeURIComponent(raw.trim())}`);
    return;
  }
  if (isValidGarmentCode(raw)) {
    navigateSafely(`/garment/${encodeURIComponent(raw.trim())}`);
    return;
  }

  setError(`Invalid QR code: must be a garment or rack code. Value: ${raw.slice(0, 80)}`);
  setIsScanning(false);
  processingRef.current = false;
};
  const handleError = (error: unknown) => {
    console.error("QR Scanner error:", error);
    setIsScanning(false);
    processingRef.current = false;

    const errorMessage = error instanceof Error ? error.message : "Failed to access camera. Please check permissions.";
    setError(errorMessage);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold">QR Scanner</h1>
          <p className="text-muted-foreground mt-2">
            Scan garment or rack QR codes
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-6">
          {!isScanning ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 mb-6">
                <Camera className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Ready to Scan</h2>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Position the QR code within the frame to automatically detect and
                redirect to the item details
              </p>
              <Button size="lg" onClick={startScanning} data-testid="button-start-scan">
                <Camera className="h-5 w-5 mr-2" />
                Start Scanning
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                <Scanner
                  onScan={handleScan}
                  onError={handleError}
                  paused={isPaused}
                  styles={{
                    container: {
                      width: "100%",
                      height: "100%",
                    },
                  }}
                  data-testid="qr-scanner"
                />
              </div>

              <div className="flex justify-center gap-4">
                <Button
                  variant="destructive"
                  onClick={stopScanning}
                  data-testid="button-stop-scan"
                >
                  <X className="h-5 w-5 mr-2" />
                  Stop Scanning
                </Button>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Align the QR code within the frame
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">Instructions</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Hold your device steady and ensure good lighting</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Position the QR code fully within the frame</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>The system will automatically detect and redirect</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>Works with both garment and rack QR codes</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
