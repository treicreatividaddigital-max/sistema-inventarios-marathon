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
  year?: { id: string; year: number; label?: string | null } | null;
  customAttributes?: Record<string, string> | null;
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


function SmartImage({
  src,
  alt,
  className,
  loading = "lazy",
  decoding = "async",
  fetchPriority,
  sizes,
  onClick,
}: {
  src: string;
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  decoding?: "async" | "sync" | "auto";
  fetchPriority?: "high" | "low" | "auto";
  sizes?: string;
  onClick?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  return (
    <div className="relative h-full w-full bg-muted">
      {!loaded && !failed ? <Skeleton className="absolute inset-0 h-full w-full" /> : null}
      {failed ? (
        <div className="flex h-full w-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
          Could not load image
        </div>
      ) : null}
      <img
        src={src}
        alt={alt}
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        sizes={sizes}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        onClick={onClick}
        className={`${className ?? ""} ${loaded && !failed ? "opacity-100" : "opacity-0"} transition-opacity duration-200`}
      />
    </div>
  );
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
  const noteText = garment?.description?.trim() || "";
  const customAttributes = garment?.customAttributes ?? {};
  const customAttributesEntries = Object.entries(customAttributes);

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
      <div className="p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Garment not found</CardTitle>
            <CardDescription>Missing garment code.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/search">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
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
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
      <div className="p-4 sm:p-6">
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
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Link href="/search">
            <Button variant="outline" size="icon" aria-label="Back" className="shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="min-w-0">
            <h1 className="flex min-w-0 items-center gap-2 text-xl font-semibold sm:text-2xl">
              <Package className="h-5 w-5 shrink-0" />
              <span data-testid="text-code" className="min-w-0 break-all font-mono">
                {garment.code}
              </span>
            </h1>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant(garment.status) as any}>
                {statusLabel(garment.status)}
              </Badge>
              <span className="break-words text-sm text-muted-foreground">
                {garment.gender} • {garment.size} • {garment.color}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Photos</CardTitle>
            <CardDescription>
              {hasPhotos ? `${photoIndex + 1} / ${photoUrls.length}` : "No photos"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="relative overflow-hidden rounded-lg border bg-muted">
              {currentPhoto ? (
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => setPhotoDialogOpen(true)}
                  aria-label="Open photo"
                >
                  <SmartImage
                    src={currentPhoto}
                    alt="Garment"
                    className="h-[320px] w-full object-cover sm:h-[360px]"
                    loading="eager"
                    fetchPriority="high"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                </button>
              ) : (
                <div className="flex h-[320px] w-full items-center justify-center text-sm text-muted-foreground sm:h-[360px]">
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
                    <ChevronLeft className="h-4 w-4" />
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
                    <ChevronRight className="h-4 w-4" />
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
                    className={`overflow-hidden rounded-md border ${i === photoIndex ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setPhotoIndex(i)}
                    aria-label={`Photo ${i + 1}`}
                  >
                    <SmartImage
                      src={url}
                      alt={`Photo ${i + 1}`}
                      className="h-16 w-full object-cover"
                      loading="lazy"
                      fetchPriority="low"
                      sizes="96px"
                    />
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Metadata and location</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-6 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="mb-1 text-sm font-medium text-muted-foreground">Category</p>
              <p className="break-words text-base" data-testid="text-category">
                {garment.category?.name ?? "—"}
              </p>
            </div>

            <div className="min-w-0">
              <p className="mb-1 text-sm font-medium text-muted-foreground">Type</p>
              <p className="break-words text-base" data-testid="text-type">
                {garment.garmentType?.name ?? "—"}
              </p>
            </div>

            <div className="min-w-0">
              <p className="mb-1 text-sm font-medium text-muted-foreground">Collection</p>
              <p className="break-words text-base" data-testid="text-collection">
                {garment.collection?.name ?? "—"}
              </p>
            </div>

            <div className="min-w-0">
              <p className="mb-1 text-sm font-medium text-muted-foreground">Lot</p>
              <p className="break-words font-mono text-base" data-testid="text-lot">
                {garment.lot ? `${garment.lot.code} — ${garment.lot.name}` : "—"}
              </p>
            </div>

            <div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">Gender</p>
              <p className="text-base" data-testid="text-gender">
                {garment.gender}
              </p>
            </div>

            <div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">Size</p>
              <p className="text-base" data-testid="text-size">
                {garment.size}
              </p>
            </div>

            <div className="min-w-0">
              <p className="mb-1 text-sm font-medium text-muted-foreground">Color</p>
              <p className="break-words text-base" data-testid="text-color">
                {garment.color}
              </p>
            </div>

            <div>
              <p className="mb-1 text-sm font-medium text-muted-foreground">Status</p>
              <p className="text-base" data-testid="text-status">
                {statusLabel(garment.status)}
              </p>
            </div>

            {(garment.year || noteText || customAttributesEntries.length > 0) && (
              <div className="space-y-4 sm:col-span-2">
                {garment.year && (
                  <div>
                    <p className="mb-1 text-sm font-medium text-muted-foreground">Year</p>
                    <div className="rounded-md border p-3 text-sm font-medium">
                      {garment.year.label || garment.year.year}
                    </div>
                  </div>
                )}

                {noteText && (
                  <div>
                    <p className="mb-1 text-sm font-medium text-muted-foreground">Note</p>
                    <div className="rounded-md border p-3 text-sm whitespace-pre-wrap break-words" data-testid="text-note">
                      {noteText}
                    </div>
                  </div>
                )}

                {customAttributesEntries.length > 0 && (
                  <div>
                    <p className="mb-1 text-sm font-medium text-muted-foreground">Custom attributes</p>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {customAttributesEntries.map(([key, value]) => (
                        <div key={key} className="rounded-md border p-3 min-w-0">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            {key.replace(/_/g, " ")}
                          </p>
                          <p className="mt-1 break-words text-sm font-medium">
                            {String(value || "—")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <Separator className="sm:col-span-2" />

            <div className="flex flex-col gap-4 sm:col-span-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-sm font-medium text-muted-foreground">Garment QR</p>

                <div className="flex min-w-0 items-start gap-2">
                  <QrCodeIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p className="min-w-0 break-all text-sm text-muted-foreground">
                    {garmentQr?.garmentUrl || garment.garmentUrl || "—"}
                  </p>
                </div>
              </div>

              <Link href={`/garment/${encodeURIComponent(garment.code)}/print`}>
                <Button variant="outline" size="sm" data-testid="button-print-garment-small" className="w-full sm:w-auto">
                  <Printer className="mr-2 h-4 w-4" />
                  Print Label
                </Button>
              </Link>
            </div>

            <div className="sm:col-span-2">
              {garment.qrUrl ? (
                <div className="flex items-center justify-center rounded-lg border bg-muted p-4">
                  <SmartImage
                    src={garmentQr?.qrUrl || garment.qrUrl}
                    alt="Garment QR"
                    className="max-h-[220px] max-w-full object-contain"
                    loading="lazy"
                    fetchPriority="low"
                    sizes="220px"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
                  No QR available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Rack
          </CardTitle>
          <CardDescription>Where to find this garment</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {garment.rack ? (
            <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="min-w-0">
                <p className="break-all font-mono font-medium" data-testid="text-rack-code">
                  {garment.rack.code}
                </p>
                <p className="break-words text-sm text-muted-foreground">
                  {`${garment.rack.name} • ${garment.rack.zone}`}
                </p>
              </div>

              <Link href={`/rack/${garment.rack.code}`}>
                <Button variant="outline" size="sm" data-testid="button-view-rack" className="w-full sm:w-auto">
                  View Rack
                </Button>
              </Link>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No rack assigned</div>
          )}

          {garment.rack?.qrUrl ? (
            <Link href={`/rack/${encodeURIComponent(garment.rack.code)}/print`}>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <Printer className="mr-2 h-4 w-4" />
                Print Rack Label
              </Button>
            </Link>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span>
                {garment.code} — photo {photoIndex + 1} of {photoUrls.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPhotoDialogOpen(false)}
                aria-label="Close photo"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-lg border bg-muted">
              {currentPhoto ? (
                <SmartImage
                  src={currentPhoto}
                  alt="Garment enlarged"
                  className="max-h-[75vh] w-full object-contain"
                  loading="eager"
                  fetchPriority="high"
                  sizes="100vw"
                />
              ) : (
                <div className="flex h-[50vh] items-center justify-center text-sm text-muted-foreground">
                  No photo
                </div>
              )}

              {hasPhotos && photoUrls.length > 1 && (
                <>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    onClick={goPrev}
                    disabled={photoIndex === 0}
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    onClick={goNext}
                    disabled={photoIndex === photoUrls.length - 1}
                    aria-label="Next photo"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            {hasPhotos && photoUrls.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {photoUrls.map((url, i) => (
                  <button
                    key={`${url}-dialog`}
                    type="button"
                    className={`overflow-hidden rounded-md border ${i === photoIndex ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setPhotoIndex(i)}
                    aria-label={`Photo ${i + 1}`}
                  >
                    <SmartImage
                      src={url}
                      alt={`Photo ${i + 1}`}
                      className="h-16 w-full object-cover"
                      loading="lazy"
                      fetchPriority="low"
                      sizes="96px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
