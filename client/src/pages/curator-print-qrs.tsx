import { useState } from "react";
import { ArrowLeft, Printer, QrCode } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CuratorPrintQRsPage() {
  const [selectedGarments, setSelectedGarments] = useState<string[]>([]);
  const [selectedRacks, setSelectedRacks] = useState<string[]>([]);

  const handlePrint = () => {
    window.print();
  };

  // Mock data - will be replaced with API call
  const garments = [];
  const racks = [];

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
          <Link href="/dashboard">
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
              Garments
            </TabsTrigger>
            <TabsTrigger value="racks" data-testid="tab-racks">
              Racks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="garments" className="space-y-4">
            {garments.length === 0 ? (
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
                  <CardTitle>Select Garments</CardTitle>
                  <CardDescription>
                    Choose garments to print QR codes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Garment list with checkboxes will go here */}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="racks" className="space-y-4">
            {racks.length === 0 ? (
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
                  <CardTitle>Select Racks</CardTitle>
                  <CardDescription>
                    Choose racks to print QR codes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Rack list with checkboxes will go here */}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div id="print-area" className="hidden print:block">
        <div className="print-grid">
          {selectedGarments.map((id) => (
            <div key={id} className="print-item">
              <div className="w-32 h-32 bg-muted rounded-lg mb-2 flex items-center justify-center">
                <QrCode className="h-16 w-16" />
              </div>
              <p className="font-mono text-sm font-medium">{id}</p>
              <p className="text-xs text-muted-foreground">Garment</p>
            </div>
          ))}
          {selectedRacks.map((id) => (
            <div key={id} className="print-item">
              <div className="w-32 h-32 bg-muted rounded-lg mb-2 flex items-center justify-center">
                <QrCode className="h-16 w-16" />
              </div>
              <p className="font-mono text-sm font-medium">{id}</p>
              <p className="text-xs text-muted-foreground">Rack</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
