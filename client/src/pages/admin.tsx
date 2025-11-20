import { useQuery } from "@tanstack/react-query";
import { 
  Package, 
  Layers, 
  Box, 
  LayoutGrid,
  TrendingUp,
  Archive
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Stats {
  totalGarments: number;
  totalCategories: number;
  totalCollections: number;
  totalRacks: number;
  garmentsByStatus: Record<string, number>;
}

export default function AdminPage() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-muted-foreground">Loading statistics...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Garments",
      value: stats?.totalGarments || 0,
      icon: Package,
      description: "Items in inventory",
    },
    {
      title: "Categories",
      value: stats?.totalCategories || 0,
      icon: LayoutGrid,
      description: "Product categories",
    },
    {
      title: "Collections",
      value: stats?.totalCollections || 0,
      icon: Layers,
      description: "Seasonal collections",
    },
    {
      title: "Storage Racks",
      value: stats?.totalRacks || 0,
      icon: Box,
      description: "Physical locations",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of inventory statistics and system health
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
                  {stat.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Garments by Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats?.garmentsByStatus && Object.entries(stats.garmentsByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Archive className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{status.replace(/_/g, " ")}</span>
                </div>
                <span className="text-2xl font-bold">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
