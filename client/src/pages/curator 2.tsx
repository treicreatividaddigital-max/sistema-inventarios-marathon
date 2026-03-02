import { Link } from "wouter";
import { 
  Scan, 
  Plus, 
  Printer, 
  Search,
  Package,
  LayoutGrid,
  Tag,
  Layers,
  Box
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const quickActions = [
  {
    title: "Scan QR Code",
    description: "Scan garment or rack QR codes",
    icon: Scan,
    href: "/curator/scan",
    color: "bg-blue-500",
    testId: "button-scan-qr",
  },
  {
    title: "New Garment",
    description: "Add new garment to inventory",
    icon: Plus,
    href: "/curator/garments/new",
    color: "bg-green-500",
    testId: "button-new-garment",
  },
  {
    title: "Print QR Codes",
    description: "Print QR codes for garments",
    icon: Printer,
    href: "/curator/print-qrs",
    color: "bg-purple-500",
    testId: "button-print-qrs",
  },
  {
    title: "Search Inventory",
    description: "Find garments with filters",
    icon: Search,
    href: "/search",
    color: "bg-orange-500",
    testId: "button-search",
  },
];

const inventoryManagement = [
  {
    title: "Categories",
    icon: LayoutGrid,
    href: "/curator/categories",
    testId: "link-categories",
  },
  {
    title: "Types",
    icon: Tag,
    href: "/curator/types",
    testId: "link-types",
  },
  {
    title: "Collections",
    icon: Layers,
    href: "/curator/collections",
    testId: "link-collections",
  },
  {
    title: "Lots",
    icon: Box,
    href: "/curator/lots",
    testId: "link-lots",
  },
  {
    title: "Racks",
    icon: Package,
    href: "/curator/racks",
    testId: "link-racks",
  },
];

export default function CuratorPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Curator Operations</h1>
        <p className="text-muted-foreground mt-2">
          Quick access to inventory management tools
        </p>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} href={action.href}>
                <Card className="cursor-pointer hover-elevate active-elevate-2 h-full" data-testid={action.testId}>
                  <CardHeader className="text-center pb-4">
                    <div className={`${action.color} w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-3`}>
                      <Icon className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {action.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Inventory Management</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {inventoryManagement.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.title} href={item.href}>
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto py-4 hover-elevate active-elevate-2"
                  data-testid={item.testId}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  <span className="text-base font-medium">{item.title}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
