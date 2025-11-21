import { useRoute, Link } from "wouter";
import { ArrowLeft, MapPin, Package, QrCode as QrCodeIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GarmentCard } from "@/components/garment-card";
import type { Rack, Garment } from "@shared/schema";

type RackWithGarments = Rack & {
  garments: Garment[];
};

export default function RackDetailPage() {
  const [, params] = useRoute("/rack/:code");
  const rackCode = params?.code;

  const { data, isLoading, error } = useQuery<RackWithGarments>({
    queryKey: ["/api/racks/by-code", rackCode],
    enabled: !!rackCode,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-destructive">Rack not found</div>
      </div>
    );
  }

  const rack = data;
  const garments = data.garments || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/curator/racks">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold">Rack Details</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            {rack.code}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-mono" data-testid="text-rack-code">
                    {rack.code}
                  </CardTitle>
                  <CardDescription>{rack.name}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Zone
                  </p>
                  <Badge variant="secondary" data-testid="badge-zone">
                    {rack.zone}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Total Garments
                  </p>
                  <p className="text-2xl font-bold" data-testid="text-garment-count">
                    {garments.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Garments in this Rack</CardTitle>
              <CardDescription>
                Currently stored items
              </CardDescription>
            </CardHeader>
            <CardContent>
              {garments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Package className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground">No garments</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    This rack is currently empty
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                  {garments.map((garment) => (
                    <GarmentCard key={garment.id} garment={garment} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Rack QR Code</CardTitle>
              <CardDescription>Scan to view rack details</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {rack.qrUrl ? (
                <img
                  src={rack.qrUrl}
                  alt={`QR Code for ${rack.code}`}
                  className="w-64 h-64"
                />
              ) : (
                <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                  <QrCodeIcon className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              <p className="font-mono text-sm mt-4 text-center" data-testid="text-qr-code">
                {rack.code}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" variant="outline" data-testid="button-print-qr">
                <QrCodeIcon className="h-4 w-4 mr-2" />
                Print QR Code
              </Button>
              <Button className="w-full" variant="outline" data-testid="button-move-all">
                <Package className="h-4 w-4 mr-2" />
                Move All Garments
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
