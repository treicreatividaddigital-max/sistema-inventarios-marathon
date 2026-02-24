import { Package, QrCode, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  {
    title: "Total Garments",
    value: "0",
    description: "+0 from last month",
    icon: Package,
  },
  {
    title: "Active Racks",
    value: "0",
    description: "Across all zones",
    icon: QrCode,
  },
  {
    title: "Collections",
    value: "0",
    description: "Active collections",
    icon: TrendingUp,
  },
  {
    title: "Categories",
    value: "0",
    description: "Product categories",
    icon: Users,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Welcome to Archive</p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            data-testid={`card-stat-${stat.title
              .toLowerCase()
              .replace(/\s+/g, "-")}`}
          >
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className="text-2xl font-bold"
                data-testid={`text-stat-value-${stat.title
                  .toLowerCase()
                  .replace(/\s+/g, "-")}`}
              >
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg text-muted-foreground">No recent activity</p>
              <p className="text-sm text-muted-foreground mt-2">
                Activities will appear here
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Use the sidebar to navigate to different sections
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
