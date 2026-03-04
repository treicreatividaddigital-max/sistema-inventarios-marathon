// client/src/pages/garment-detail.tsx
import { useRoute, Link } from "wouter";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Package,
  QrCode as QrCodeIcon,
  Printer,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getQueryFn } from "@/lib/queryClient";

type Garment = {
  id: string;
  code: string;
  size: string;
  color: string;
  gender: "MALE" | "FEMALE" | "UNISEX";
  status: "IN_STOCK" | "IN_TRANSIT" | "SOLD" | "RESERVED" | "DAMAGED";
  description?: string | null;
  photoUrl?: string | null;
  photoUrls?: string[] | null;
  qrUrl?: string | null;
  garmentUrl?: string | null;

  category?: { id: string; name: string } | null;
  garmentType?: { id: string; name: string } | null;
  collection?: { id: string; name: string } | null;
  lot?: { id: string; code: string; name: string } | null;

  rack?: {
    id: string;
    code: string;
    name: string;
    zone: string;
    qrUrl?: string | null;
  } | null;
};

function normalizePhotoUrls(garment?: Garment | null): string[] {
  if (!garment) return [];
  const urls = Array.isArray(garment.photoUrls) ? garment.photoUrls : [];
  if (urls.length > 0) return urls.filter(Boolean).slice(0, 4);
  if (garment.photoUrl) return [garment.photoUrl].filter(Boolean).slice(0, 1);
  return [];
}

function statusLabel(status?: Garment["status"]) {
  switch (status) {
    case "IN_STOCK":
      return "In stock";
    case "IN_TRANSIT":
      return "In transit";
    case "SOLD":
      return "Sold";
    case "RESERVED":
      return "Reserved";
    case "DAMAGED":
      return "Damaged";
    default:
      return "—";
  }
}

function statusVariant(status?: Garment["status"]) {
  switch (status) {
    case "IN_STOCK":
      return "default";
    case "IN_TRANSIT":
      return "secondary";
    case "SOLD":
      return "outline";
    case "RESERVED":
      return "secondary";
    case "DAMAGED":
      return "destructive";
    default:
      return "outline";
  }
}

export default function GarmentDetailPage() {
  const [, params] = useRoute("/garment/:code");
  const garmentCode = params?.code ? decodeURIComponent(params.code) : "";

  const { data: garment, isLoading, error } = useQuery<Garment>({
    queryKey: ["/api/garments/by-code", garmentCode],
    enabled: Boolean(garmentCode),
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const { data: garmentQr } = useQuery<{
    garmentId: string;
    code: string;
    garmentUrl: string;
    qrUrl: string;
  }>({
    queryKey: ["/api/garments/by-code", garmentCode, "qr"],
    enabled: Boolean(garmentCode),
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const photoUrls = useMemo(() => normalizePhotoUrls(garment), [garment]);

  const [photoIndex, setPhotoIndex] = useState(0);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);

  useEffect(() => {
    setPhotoIndex(0);
  }, [garment?.id]);

  const hasPhotos = photoUrls.length > 0;
  const currentPhoto = hasPhotos ? photoUrls[Math.min(photoIndex, photoUrls.length - 1)] : null;

  const goPrev = () => setPhotoIndex((i) => Math.max(0, i - 1));
  const goNext = () => setPhotoIndex((i) => Math.min(photoUrls.length - 1, i + 1));

  if (!garmentCode) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Garment not found</CardTitle>
            <CardDescription>Missing garment code.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/search">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-28" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[420px] w-full" />
          <Skeleton className="h-[420px] w-full" />
        </div>
      </div>
    );
  }

  if (error || !garment) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Failed to load garment</CardTitle>
            <CardDescription>
              {String((error as any)?.message || "Unknown error")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/search">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/search">
            <Button variant="outline" size="icon" aria-label="Back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>

          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Package className="w-5 h-5" />
              <span data-testid="text-code" className="font-mono">
                {garment.code}
              </span>
            </h1>

            <div className="flex items-center gap-2 mt-1">
              <Badge variant={statusVariant(garment.status) as any}>
                {statusLabel(garment.status)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {garment.gender} • {garment.size} • {garment.color}
              </span>
            </div>
          </div>
        </div>

        {/* Removed duplicate Print button (kept the one near the QR) */}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
            <CardDescription>
              {hasPhotos ? `${photoIndex + 1} / ${photoUrls.length}` : "No photos"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="relative rounded-lg overflow-hidden border bg-muted">
              {currentPhoto ? (
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => setPhotoDialogOpen(true)}
                  aria-label="Open photo"
                >
                  <img
                    src={currentPhoto}
                    alt="Garment"
                    className="w-full h-[360px] object-cover"
                  />
                </button>
              ) : (
                <div className="w-full h-[360px] flex items-center justify-center text-sm text-muted-foreground">
                  No photos
                </div>
              )}

              {hasPhotos && photoUrls.length > 1 && (
                <>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute left-2 top-1/2 -translate-y-1/2"
                    onClick={goPrev}
                    disabled={photoIndex === 0}
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={goNext}
                    disabled={photoIndex === photoUrls.length - 1}
                    aria-label="Next photo"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>

            {hasPhotos && photoUrls.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {photoUrls.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    className={`rounded-md overflow-hidden border ${i === photoIndex ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setPhotoIndex(i)}
                    aria-label={`Photo ${i + 1}`}
                  >
                    <img
                      src={url}
                      alt={`Photo ${i + 1}`}
                      className="w-full h-16 object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Metadata and location</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Category</p>
              <p className="text-base" data-testid="text-category">
                {garment?.category?.name ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Type</p>
              <p className="text-base" data-testid="text-type">
                {garment?.garmentType?.name ?? "—"}
              </p>
            </div>

            {garment?.description && garment.description.trim().length > 0 && (
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-muted-foreground mb-1">Note</p>
                <p className="text-base whitespace-pre-wrap break-words" data-testid="text-note">
                  {garment.description}
                </p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Collection</p>
              <p className="text-base" data-testid="text-collection">
                {garment?.collection?.name ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Lot</p>
              <p className="text-base font-mono" data-testid="text-lot">
                {garment?.lot ? `${garment.lot.code} — ${garment.lot.name}` : "—"}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Gender</p>
              <p className="text-base" data-testid="text-gender">
                {garment.gender}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Size</p>
              <p className="text-base" data-testid="text-size">
                {garment.size}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Color</p>
              <p className="text-base" data-testid="text-color">
                {garment.color}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Status</p>
              <p className="text-base" data-testid="text-status">
                {statusLabel(garment.status)}
              </p>
            </div>

            <Separator className="sm:col-span-2" />

            <div className="sm:col-span-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Garment QR</p>

                <div className="flex items-center gap-2">
                  <QrCodeIcon className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {garmentQr?.garmentUrl || garment.garmentUrl || "—"}
                  </p>
                </div>
              </div>

              <Link href={`/garment/${encodeURIComponent(garment.code)}/print`}>
                <Button variant="outline" size="sm" data-testid="button-print-garment-small">
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </Link>
            </div>

            <div className="sm:col-span-2">
              {garment.qrUrl ? (
                <div className="rounded-lg border bg-muted p-4 flex items-center justify-center">
                  <img
                    src={garmentQr?.qrUrl || garment.qrUrl}
                    alt="Garment QR"
                    className="max-h-[220px]"
                  />
                </div>
              ) : (
                <div className="rounded-lg border bg-muted p-4 text-sm text-muted-foreground flex items-center justify-center">
                  No QR available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Rack
          </CardTitle>
          <CardDescription>Where to find this garment</CardDescription>
        </CardHeader>

        <CardContent className="flex items-center justify-between gap-3">
          {garment.rack ? (
            <div className="flex items-center gap-3">
              <div>
                <p className="font-medium font-mono" data-testid="text-rack-code">
                  {garment.rack.code}
                </p>
                <p className="text-sm text-muted-foreground">
                  {garment?.rack ? `${garment.rack.name} • ${garment.rack.zone}` : "—"}
                </p>
              </div>

              <Link href={`/rack/${garment.rack.code}`}>
                <Button variant="outline" size="sm" data-testid="button-view-rack">
                  View Rack
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No rack assigned</div>
          )}

          {garment.rack?.qrUrl ? (
            <div className="flex items-center gap-2">
              <Link href={`/rack/${encodeURIComponent(garment.rack.code)}/print`}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const code = garment.rack?.code;
                    if (!code) return;
                    window.location.href = `/rack/${encodeURIComponent(code)}/print`;
                  }}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Rack
                </Button>
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span>Photo</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPhotoDialogOpen(false)}
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {currentPhoto ? (
            <div className="rounded-lg overflow-hidden border bg-muted">
              <img src={currentPhoto} alt="Garment" className="w-full max-h-[70vh] object-contain" />
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No photo</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
