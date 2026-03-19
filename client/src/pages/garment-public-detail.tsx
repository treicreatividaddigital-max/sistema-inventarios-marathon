import { useRoute } from "wouter";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Package, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getQueryFn } from "@/lib/queryClient";

type PublicGarment = {
  code: string;
  name?: string | null;
  description?: string | null;
  size?: string | null;
  color?: string | null;
  gender?: "MALE" | "FEMALE" | "UNISEX" | null;
  status?: "IN_STOCK" | "IN_TRANSIT" | "SOLD" | "RESERVED" | "DAMAGED" | string | null;
  photoUrl?: string | null;
  photoUrls?: string[] | null;
  category?: { name?: string | null } | null;
  garmentType?: { name?: string | null } | null;
  collection?: { name?: string | null } | null;
  year?: { year?: number | null; label?: string | null } | number | null;
  customAttributes?: Record<string, string> | null;
  lot?: { code?: string | null; name?: string | null } | string | null;
  rack?: { code?: string | null; name?: string | null; zone?: string | null } | string | null;
};

function normalizePhotoUrls(garment?: PublicGarment | null): string[] {
  if (!garment) return [];
  const urls = Array.isArray(garment.photoUrls) ? garment.photoUrls : [];
  if (urls.length > 0) return urls.filter(Boolean).slice(0, 4);
  if (garment.photoUrl) return [garment.photoUrl].filter(Boolean).slice(0, 1);
  return [];
}

function statusLabel(status?: PublicGarment["status"]) {
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
      return status || "—";
  }
}

function statusVariant(status?: PublicGarment["status"]) {
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

function formatLot(lot?: PublicGarment["lot"]) {
  if (!lot) return "—";
  if (typeof lot === "string") return lot;
  if (lot.code && lot.name) return `${lot.code} — ${lot.name}`;
  return lot.code || lot.name || "—";
}

function formatRack(rack?: PublicGarment["rack"]) {
  if (!rack) return "—";
  if (typeof rack === "string") return rack;
  const parts = [rack.code, rack.name, rack.zone].filter(Boolean);
  return parts.length > 0 ? parts.join(" • ") : "—";
}

function formatYear(year?: PublicGarment["year"]) {
  if (!year) return "—";
  if (typeof year === "number") return String(year);
  return year.label || (year.year != null ? String(year.year) : "—");
}

function PublicField({ label, value, testId }: { label: string; value?: string | null; testId?: string }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-sm font-medium text-muted-foreground">{label}</p>
      <p className="break-words text-base" data-testid={testId}>
        {value && String(value).trim() ? value : "—"}
      </p>
    </div>
  );
}

export default function GarmentPublicDetailPage() {
  const [, params] = useRoute("/garment/:code");
  const garmentCode = params?.code ? decodeURIComponent(params.code) : "";
  const [photoIndex, setPhotoIndex] = useState(0);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);

  const { data: garment, isLoading, error } = useQuery<PublicGarment>({
    queryKey: ["/api/public/garments", garmentCode],
    enabled: Boolean(garmentCode),
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const photoUrls = useMemo(() => normalizePhotoUrls(garment), [garment]);
  const customAttributesEntries = Object.entries(garment?.customAttributes ?? {});
  const hasPhotos = photoUrls.length > 0;
  const currentPhoto = hasPhotos ? photoUrls[Math.min(photoIndex, photoUrls.length - 1)] : null;

  useEffect(() => {
    setPhotoIndex(0);
  }, [garment?.code]);

  const goPrev = () => setPhotoIndex((i) => Math.max(0, i - 1));
  const goNext = () => setPhotoIndex((i) => Math.min(photoUrls.length - 1, i + 1));

  if (!garmentCode) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Garment not found</CardTitle>
            <CardDescription>Missing garment code.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 p-4 sm:p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[420px] w-full" />
          <Skeleton className="h-[420px] w-full" />
        </div>
      </div>
    );
  }

  if (error || !garment) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Failed to load garment</CardTitle>
            <CardDescription>{String((error as any)?.message || "Unknown error")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex min-w-0 items-center gap-2 text-xl font-semibold sm:text-2xl">
            <Package className="h-5 w-5 shrink-0" />
            <span data-testid="text-code" className="min-w-0 break-all font-mono">
              {garment.code}
            </span>
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={statusVariant(garment.status) as any}>{statusLabel(garment.status)}</Badge>
            {garment.name ? <span className="text-sm text-muted-foreground">{garment.name}</span> : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Photos</CardTitle>
            <CardDescription>{hasPhotos ? `${photoIndex + 1} / ${photoUrls.length}` : "No photos"}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="relative overflow-hidden rounded-lg border bg-muted">
              {currentPhoto ? (
                <button type="button" className="block w-full" onClick={() => setPhotoDialogOpen(true)} aria-label="Open photo">
                  <img
                    src={currentPhoto}
                    alt={garment.name || garment.code}
                    className="h-[320px] w-full object-cover sm:h-[360px]"
                    decoding="async"
                  />
                </button>
              ) : (
                <div className="flex h-[320px] w-full items-center justify-center text-sm text-muted-foreground sm:h-[360px]">No photos</div>
              )}

              {hasPhotos && photoUrls.length > 1 ? (
                <>
                  <Button type="button" size="icon" variant="secondary" className="absolute left-2 top-1/2 -translate-y-1/2" onClick={goPrev} disabled={photoIndex === 0} aria-label="Previous photo">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={goNext} disabled={photoIndex === photoUrls.length - 1} aria-label="Next photo">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              ) : null}
            </div>

            {hasPhotos && photoUrls.length > 1 ? (
              <div className="grid grid-cols-4 gap-2">
                {photoUrls.map((url, i) => (
                  <button key={url} type="button" className={`overflow-hidden rounded-md border ${i === photoIndex ? "ring-2 ring-primary" : ""}`} onClick={() => setPhotoIndex(i)} aria-label={`Photo ${i + 1}`}>
                    <img src={url} alt={`Photo ${i + 1}`} className="h-16 w-full object-cover" loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>Public read-only garment information</CardDescription>
          </CardHeader>

          <CardContent className="grid gap-6 sm:grid-cols-2">
            <PublicField label="Name" value={garment.name} testId="text-name" />
            <PublicField label="Category" value={garment.category?.name} testId="text-category" />
            <PublicField label="Type" value={garment.garmentType?.name} testId="text-type" />
            <PublicField label="Collection" value={garment.collection?.name} testId="text-collection" />
            <PublicField label="Lot" value={formatLot(garment.lot)} testId="text-lot" />
            <PublicField label="Year" value={formatYear(garment.year)} testId="text-year" />
            <PublicField label="Gender" value={garment.gender || null} testId="text-gender" />
            <PublicField label="Size" value={garment.size || null} testId="text-size" />
            <PublicField label="Color" value={garment.color || null} testId="text-color" />
            <PublicField label="Rack" value={formatRack(garment.rack)} testId="text-rack" />

            {garment.description ? (
              <div className="space-y-2 sm:col-span-2">
                <Separator />
                <div>
                  <p className="mb-1 text-sm font-medium text-muted-foreground">Description</p>
                  <div className="rounded-md border p-3 text-sm whitespace-pre-wrap break-words" data-testid="text-description">
                    {garment.description}
                  </div>
                </div>
              </div>
            ) : null}

            {customAttributesEntries.length > 0 ? (
              <div className="space-y-3 sm:col-span-2">
                <Separator />
                <div>
                  <p className="mb-1 text-sm font-medium text-muted-foreground">Custom attributes</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {customAttributesEntries.map(([key, value]) => (
                      <div key={key} className="rounded-md border p-3 min-w-0">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{key.replace(/_/g, " ")}</p>
                        <p className="mt-1 break-words text-sm font-medium">{String(value || "—")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span>{garment.code} — photo {photoIndex + 1} of {photoUrls.length}</span>
              <Button variant="ghost" size="icon" onClick={() => setPhotoDialogOpen(false)} aria-label="Close photo">
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-lg border bg-muted">
              {currentPhoto ? (
                <img src={currentPhoto} alt="Garment enlarged" className="max-h-[75vh] w-full object-contain" decoding="async" />
              ) : (
                <div className="flex h-[50vh] items-center justify-center text-sm text-muted-foreground">No photo</div>
              )}

              {hasPhotos && photoUrls.length > 1 ? (
                <>
                  <Button type="button" size="icon" variant="secondary" className="absolute left-3 top-1/2 -translate-y-1/2" onClick={goPrev} disabled={photoIndex === 0} aria-label="Previous photo">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="secondary" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={goNext} disabled={photoIndex === photoUrls.length - 1} aria-label="Next photo">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              ) : null}
            </div>

            {hasPhotos && photoUrls.length > 1 ? (
              <div className="grid grid-cols-4 gap-2">
                {photoUrls.map((url, i) => (
                  <button key={`${url}-dialog`} type="button" className={`overflow-hidden rounded-md border ${i === photoIndex ? "ring-2 ring-primary" : ""}`} onClick={() => setPhotoIndex(i)} aria-label={`Photo ${i + 1}`}>
                    <img src={url} alt={`Photo ${i + 1}`} className="h-16 w-full object-cover" loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
