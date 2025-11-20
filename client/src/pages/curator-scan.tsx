import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Camera, X } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CuratorScanPage() {
  const [, setLocation] = useLocation();
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startScanning = () => {
    setIsScanning(true);
    setError(null);
    // TODO: Implement react-qr-reader integration
  };

  const stopScanning = () => {
    setIsScanning(false);
  };

  const handleScan = (data: string | null) => {
    if (data) {
      // Detect if it's a garment or rack QR code
      if (data.includes("/garment/")) {
        const garmentId = data.split("/garment/")[1];
        setLocation(`/garment/${garmentId}`);
      } else if (data.includes("/rack/")) {
        const rackId = data.split("/rack/")[1];
        setLocation(`/rack/${rackId}`);
      }
    }
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
                {/* TODO: Integrate react-qr-reader component here */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 border-4 border-primary rounded-lg"></div>
                </div>
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
