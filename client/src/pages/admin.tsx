import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Package,
  Layers,
  Box,
  LayoutGrid,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface Stats {
  totalGarments: number;
  totalCategories: number;
  totalCollections: number;
  totalRacks: number;
  garmentsByStatus: Record<string, number>;
}

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: "In Stock",
  IN_TRANSIT: "In Transit",
  SOLD: "Sold",
  RESERVED: "Reserved",
  DAMAGED: "Damaged",
};

const chartConfig = {
  count: {
    label: "Garments",
  },
  IN_STOCK: { label: "In Stock", color: "hsl(var(--chart-1))" },
  IN_TRANSIT: { label: "In Transit", color: "hsl(var(--chart-2))" },
  SOLD: { label: "Sold", color: "hsl(var(--chart-3))" },
  RESERVED: { label: "Reserved", color: "hsl(var(--chart-4))" },
  DAMAGED: { label: "Damaged", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

export default function AdminPage() {
  const [, setLocation] = useLocation();
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
      href: "/search",
    },
    {
      title: "Categories",
      value: stats?.totalCategories || 0,
      icon: LayoutGrid,
      description: "Product categories",
      href: "/curator/categories",
    },
    {
      title: "Collections",
      value: stats?.totalCollections || 0,
      icon: Layers,
      description: "Seasonal collections",
      href: "/curator/collections",
    },
    {
      title: "Storage Racks",
      value: stats?.totalRacks || 0,
      icon: Box,
      description: "Physical locations",
      href: "/curator/racks",
    },
  ];

  const chartData = Object.entries(stats?.garmentsByStatus || {}).map(([status, count]) => ({
    status,
    label: STATUS_LABELS[status] || status.replace(/_/g, " "),
    count,
    fill: `var(--color-${status})`,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of inventory statistics and system health
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.title} href={stat.href}>
              <Card
                className="cursor-pointer transition-colors hover:bg-accent/50 hover:border-primary/30"
                data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-muted-foreground truncate">
                        {stat.title}
                      </p>
                      <p
                        className="text-3xl font-bold mt-2 tabular-nums"
                        data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {stat.value.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stat.description}
                      </p>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Garments by Status
          </CardTitle>
          <CardDescription>
            Current distribution of inventory across statuses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">No garment data yet</p>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
              <BarChart accessibilityLayer data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  allowDecimals={false}
                  width={32}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar
                  dataKey="count"
                  radius={6}
                  className="cursor-pointer"
                  onClick={(data: any) => {
                    if (data?.status) setLocation(`/search?status=${encodeURIComponent(data.status)}`);
                  }}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
