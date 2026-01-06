import { useMemo, useState } from "react";
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
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

  // --- Rack actions state (must be before any conditional returns) ---
  const [moveOpen, setMoveOpen] = useState(false);
  const [toRackId, setToRackId] = useState<string>("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMoving, setIsMoving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const { data: allRacks } = useQuery<Rack[]>({
    queryKey: ["/api/racks"],
    enabled: moveOpen,
  });

  const destinationRacks = useMemo(() => {
    const currentRackId = data?.id;
    return (allRacks || []).filter((r) => r.id !== currentRackId);
  }, [allRacks, data?.id]);

  const rackGarments = useMemo(() => (data?.garments || []), [data]);
  const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);
  const allSelected = useMemo(
    () => rackGarments.length > 0 && selectedIds.size === rackGarments.length,
    [selectedIds, rackGarments.length]
  );

  const toggleAll = (checked: boolean) => {
    if (checked) setSelectedIds(new Set(rackGarments.map((g) => g.id)));
    else setSelectedIds(new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handlePrintQr = () => {
    const rackCode = data?.code;
    if (!rackCode) return;
    // No popups: abrir pantalla de impresión en la misma pestaña
    window.location.href = `/rack/${encodeURIComponent(rackCode)}/print`;
  };

  const handleOpenMove = (open: boolean) => {
    setMoveOpen(open);
    if (open) {
      setToRackId("");
      setSelectedIds(new Set(rackGarments.map((g) => g.id))); // default all
    }
  };

  const handleMove = async () => {
    const rackId = data?.id;
    if (!rackId) return;

    if (!toRackId) {
      toast({ title: "Select destination rack", variant: "destructive" });
      return;
    }
    if (selectedIds.size === 0) {
      toast({ title: "Select at least 1 garment", variant: "destructive" });
      return;
    }

    setIsMoving(true);
    try {
      const ids = Array.from(selectedIds);
      const payload: any = { toRackId };
      if (ids.length !== rackGarments.length) payload.garmentIds = ids;

      const resp = await apiRequest("POST", `/api/racks/${rackId}/move-garments`, payload);
      toast({ title: "Moved", description: `Moved ${resp.movedCount} garment(s).` });

      handleOpenMove(false);
      queryClient.invalidateQueries();
    } catch (e: any) {
      toast({ title: "Move failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setIsMoving(false);
    }
  };


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
              <Button className="w-full" variant="outline" data-testid="button-print-qr" onClick={handlePrintQr} disabled={isPrinting}>
                <QrCodeIcon className="h-4 w-4 mr-2" />
                {isPrinting ? "Preparing print…" : "Print QR Code"}
              </Button>
              <Button className="w-full" variant="outline" data-testid="button-move-all" onClick={() => handleOpenMove(true)} disabled={garments.length === 0}>
                <Package className="h-4 w-4 mr-2" />
                Move All Garments
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    
      <Dialog open={moveOpen} onOpenChange={handleOpenMove}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Move garments</DialogTitle>
            <DialogDescription>
              From rack <span className="font-mono">{rack.code}</span>. Select destination and what to move.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Destination rack</div>
              <Select value={toRackId} onValueChange={setToRackId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a rack…" />
                </SelectTrigger>
                <SelectContent>
                  {destinationRacks.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.code} — {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(v) => toggleAll(v === true)}
                />
                <span className="text-sm">Select all</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Selected: {selectedCount}/{garments.length}
              </div>
            </div>

            <ScrollArea className="h-56 rounded-md border p-3">
              <div className="space-y-2">
                {garments.map((g) => (
                  <div key={g.id} className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedIds.has(g.id)}
                      onCheckedChange={(v) => toggleOne(g.id, v === true)}
                    />
                    <div className="min-w-0">
                      <div className="font-mono text-sm truncate">{g.code}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {g.size} • {g.color} • {g.gender}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleOpenMove(false)} disabled={isMoving}>
              Cancel
            </Button>
            <Button onClick={handleMove} disabled={isMoving || !toRackId || selectedIds.size === 0}>
              {isMoving ? "Moving…" : "Move"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

</div>
  );
}
