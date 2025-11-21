import { useRoute } from "wouter";
import { ArrowLeft, Download, MapPin, Package, QrCode as QrCodeIcon } from "lucide-react";
import { Link } from "wouter";
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
import { Separator } from "@/components/ui/separator";
import type { Garment, Category, GarmentType, Collection, Lot, Rack, Movement, User } from "@shared/schema";

type GarmentWithRelations = Garment & {
  category: Category;
  garmentType: GarmentType;
  collection: Collection;
  lot: Lot;
  rack: Rack | null;
  movements: (Movement & {
    fromRack?: Rack | null;
    toRack?: Rack | null;
    movedBy?: User;
  })[];
};

const statusColors = {
  IN_STOCK: "bg-green-500",
  IN_TRANSIT: "bg-blue-500",
  SOLD: "bg-gray-500",
  RESERVED: "bg-yellow-500",
  DAMAGED: "bg-red-500",
};

export default function GarmentDetailPage() {
  const [, params] = useRoute("/garment/:code");
  const garmentCode = params?.code;

  const { data, isLoading, error } = useQuery<GarmentWithRelations>({
    queryKey: ["/api/garments/by-code", garmentCode],
    enabled: !!garmentCode,
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
        <div className="text-lg text-destructive">Garment not found</div>
      </div>
    );
  }

  const garment = data;
  const movements = data.movements || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/search">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-semibold">Garment Details</h1>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            {garment.code}
          </p>
        </div>
        <Button variant="outline" data-testid="button-download-qr">
          <Download className="h-4 w-4 mr-2" />
          Download QR
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Category
                </p>
                <p className="text-base" data-testid="text-category">
                  {garment.category.name}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Type
                </p>
                <p className="text-base" data-testid="text-type">
                  {garment.garmentType.name}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Collection
                </p>
                <p className="text-base" data-testid="text-collection">
                  {garment.collection.name}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Lot
                </p>
                <p className="text-base font-mono" data-testid="text-lot">
                  {garment.lot.code}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Size
                </p>
                <Badge variant="secondary" data-testid="badge-size">
                  {garment.size}
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Color
                </p>
                <p className="text-base" data-testid="text-color">
                  {garment.color}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Gender
                </p>
                <Badge variant="outline" data-testid="badge-gender">
                  {garment.gender}
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Status
                </p>
                <Badge
                  className={statusColors[garment.status as keyof typeof statusColors]}
                  data-testid="badge-status"
                >
                  {garment.status.replace("_", " ")}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {garment.rack && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Current Location
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium font-mono" data-testid="text-rack-code">
                      {garment.rack.code}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {garment.rack.name} • {garment.rack.zone}
                    </p>
                  </div>
                  <Link href={`/rack/${garment.rack.code}`}>
                    <Button variant="outline" size="sm" data-testid="button-view-rack">
                      View Rack
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Movement History</CardTitle>
              <CardDescription>
                Track all location and status changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {movements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No movements recorded</p>
                  </div>
                ) : (
                  movements.map((movement, index) => (
                    <div key={movement.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full ${index === 0 ? "bg-primary" : "bg-muted"}`} />
                        {index !== movements.length - 1 && (
                          <div className="w-0.5 h-full bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium">
                              {movement.fromRack
                                ? `Moved from ${movement.fromRack.code} to ${movement.toRack?.code}`
                                : `Added to ${movement.toRack?.code}`}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Status: {movement.toStatus.replace("_", " ")}
                            </p>
                            {movement.note && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {movement.note}
                              </p>
                            )}
                          </div>
                          <div className="text-right text-sm text-muted-foreground whitespace-nowrap">
                            <p>{new Date(movement.movedAt).toLocaleDateString()}</p>
                            <p>{new Date(movement.movedAt).toLocaleTimeString()}</p>
                          </div>
                        </div>
                        {movement.movedBy && (
                          <p className="text-xs text-muted-foreground mt-2">
                            By {movement.movedBy.name}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Photo</CardTitle>
            </CardHeader>
            <CardContent>
              {garment.photoUrl ? (
                <img
                  src={garment.photoUrl}
                  alt={garment.code}
                  className="w-full aspect-[3/4] object-cover rounded-lg"
                />
              ) : (
                <div className="w-full aspect-[3/4] bg-muted rounded-lg flex items-center justify-center">
                  <Package className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Garment QR Code</CardTitle>
              <CardDescription>Scan to view garment details</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {garment.qrUrl ? (
                <img
                  src={garment.qrUrl}
                  alt={`QR Code for ${garment.code}`}
                  className="w-64 h-64"
                />
              ) : (
                <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                  <QrCodeIcon className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              <p className="font-mono text-sm mt-4 text-center" data-testid="text-qr-code">
                {garment.code}
              </p>
            </CardContent>
          </Card>

          {garment.rack && (
            <Card>
              <CardHeader>
                <CardTitle>Rack QR Code</CardTitle>
                <CardDescription>Scan to view rack location</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                {garment.rack.qrUrl ? (
                  <img
                    src={garment.rack.qrUrl}
                    alt={`QR Code for ${garment.rack.code}`}
                    className="w-64 h-64"
                  />
                ) : (
                  <div className="w-64 h-64 bg-muted rounded-lg flex items-center justify-center">
                    <QrCodeIcon className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
                <p className="font-mono text-sm mt-4 text-center" data-testid="text-rack-qr-code">
                  {garment.rack.code}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
