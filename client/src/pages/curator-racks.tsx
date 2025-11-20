import { Plus, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

export default function CuratorRacksPage() {
  const racks = [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Racks</h1>
          <p className="text-muted-foreground mt-2">
            Manage storage racks and locations
          </p>
        </div>
        <Button data-testid="button-new-rack">
          <Plus className="h-4 w-4 mr-2" />
          New Rack
        </Button>
      </div>

      {racks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No racks yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first storage rack
            </p>
            <Button className="mt-6" data-testid="button-create-first">
              <Plus className="h-4 w-4 mr-2" />
              Create Rack
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {/* Rack cards will be mapped here */}
        </div>
      )}
    </div>
  );
}
