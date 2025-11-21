import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer, QrCode, Package2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type Garment = {
  id: string;
  code: string;
  size: string;
  color: string;
  status: string;
  qrUrl: string | null;
  category?: { name: string };
  garmentType?: { name: string };
};

type Rack = {
  id: string;
  code: string;
  name: string;
  zone: string;
  qrUrl: string | null;
};

export default function CuratorPrintQRsPage() {
  const [selectedGarments, setSelectedGarments] = useState<string[]>([]);
  const [selectedRacks, setSelectedRacks] = useState<string[]>([]);

  const { data: garments = [], isLoading: garmentsLoading } = useQuery<Garment[]>({
    queryKey: ["/api/garments"],
  });

  const { data: racks = [], isLoading: racksLoading } = useQuery<Rack[]>({
    queryKey: ["/api/racks"],
  });

  const handlePrint = () => {
    window.print();
  };

  const toggleGarment = (id: string) => {
    setSelectedGarments((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  const toggleRack = (id: string) => {
    setSelectedRacks((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  };

  const selectAllGarments = () => {
    setSelectedGarments(garments.map((g) => g.id));
  };

  const selectAllRacks = () => {
    setSelectedRacks(racks.map((r) => r.id));
  };

  const selectedGarmentData = garments.filter((g) =>
    selectedGarments.includes(g.id)
  );
  const selectedRackData = racks.filter((r) => selectedRacks.includes(r.id));

  return (
    <>
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            #print-area, #print-area * {
              visibility: visible;
            }
            #print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .print-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 2cm;
              padding: 2cm;
              page-break-after: always;
            }
            .print-item {
              display: flex;
              flex-direction: column;
              align-items: center;
              page-break-inside: avoid;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>

      <div className="space-y-6 no-print">
        <div className="flex items-center gap-4">
          <Link href="/curator">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-semibold">Print QR Codes</h1>
            <p className="text-muted-foreground mt-2">
              Select items to print QR codes
            </p>
          </div>
          <Button
            size="lg"
            onClick={handlePrint}
            disabled={
              selectedGarments.length === 0 && selectedRacks.length === 0
            }
            data-testid="button-print"
          >
            <Printer className="h-5 w-5 mr-2" />
            Print Selected ({selectedGarments.length + selectedRacks.length})
          </Button>
        </div>

        <Tabs defaultValue="garments">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="garments" data-testid="tab-garments">
              Garments ({garments.length})
            </TabsTrigger>
            <TabsTrigger value="racks" data-testid="tab-racks">
              Racks ({racks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="garments" className="space-y-4">
            {garmentsLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-16">
                  <p className="text-lg text-muted-foreground">Loading garments...</p>
                </CardContent>
              </Card>
            ) : garments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <QrCode className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground">
                    No garments available
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Create garments to generate QR codes
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Select Garments</CardTitle>
                      <CardDescription>
                        Choose garments to print QR codes
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllGarments}
                      data-testid="button-select-all-garments"
                    >
                      Select All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {garments.map((garment) => (
                      <div
                        key={garment.id}
                        className="flex items-center gap-4 p-3 rounded-lg border hover-elevate active-elevate-2 cursor-pointer"
                        onClick={() => toggleGarment(garment.id)}
                        data-testid={`garment-item-${garment.id}`}
                      >
                        <Checkbox
                          checked={selectedGarments.includes(garment.id)}
                          onCheckedChange={() => toggleGarment(garment.id)}
                          data-testid={`checkbox-garment-${garment.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm font-medium truncate">
                            {garment.code}
                          </p>
                          <div className="flex gap-2 mt-1">
                            {garment.category && (
                              <span className="text-xs text-muted-foreground">
                                {garment.category.name}
                              </span>
                            )}
                            {garment.garmentType && (
                              <span className="text-xs text-muted-foreground">
                                • {garment.garmentType.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <Badge variant="outline" className="text-xs">
                            {garment.size}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {garment.color}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="racks" className="space-y-4">
            {racksLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-16">
                  <p className="text-lg text-muted-foreground">Loading racks...</p>
                </CardContent>
              </Card>
            ) : racks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <QrCode className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg text-muted-foreground">
                    No racks available
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Create racks to generate QR codes
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Select Racks</CardTitle>
                      <CardDescription>
                        Choose racks to print QR codes
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAllRacks}
                      data-testid="button-select-all-racks"
                    >
                      Select All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {racks.map((rack) => (
                      <div
                        key={rack.id}
                        className="flex items-center gap-4 p-3 rounded-lg border hover-elevate active-elevate-2 cursor-pointer"
                        onClick={() => toggleRack(rack.id)}
                        data-testid={`rack-item-${rack.id}`}
                      >
                        <Checkbox
                          checked={selectedRacks.includes(rack.id)}
                          onCheckedChange={() => toggleRack(rack.id)}
                          data-testid={`checkbox-rack-${rack.id}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm font-medium truncate">
                            {rack.code}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {rack.name} • {rack.zone}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div id="print-area" className="hidden print:block">
        <div className="print-grid">
          {selectedGarmentData.map((garment) => (
            <div key={garment.id} className="print-item">
              {garment.qrUrl ? (
                <img
                  src={garment.qrUrl}
                  alt={`QR for ${garment.code}`}
                  className="w-48 h-48"
                />
              ) : (
                <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
                  <Package2 className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              <p className="font-mono text-base font-semibold mt-2">
                {garment.code}
              </p>
              <p className="text-sm text-muted-foreground">
                {garment.size} • {garment.color}
              </p>
            </div>
          ))}
          {selectedRackData.map((rack) => (
            <div key={rack.id} className="print-item">
              {rack.qrUrl ? (
                <img
                  src={rack.qrUrl}
                  alt={`QR for ${rack.code}`}
                  className="w-48 h-48"
                />
              ) : (
                <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
                  <QrCode className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              <p className="font-mono text-base font-semibold mt-2">
                {rack.code}
              </p>
              <p className="text-sm text-muted-foreground">
                {rack.name} • {rack.zone}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
