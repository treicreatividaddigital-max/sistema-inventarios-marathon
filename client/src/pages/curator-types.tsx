import { Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

export default function CuratorTypesPage() {
  const types = [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Garment Types</h1>
          <p className="text-muted-foreground mt-2">
            Manage garment type classifications
          </p>
        </div>
        <Button data-testid="button-new-type">
          <Plus className="h-4 w-4 mr-2" />
          New Type
        </Button>
      </div>

      {types.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Tag className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No types yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first garment type
            </p>
            <Button className="mt-6" data-testid="button-create-first">
              <Plus className="h-4 w-4 mr-2" />
              Create Type
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {/* Type cards will be mapped here */}
        </div>
      )}
    </div>
  );
}
