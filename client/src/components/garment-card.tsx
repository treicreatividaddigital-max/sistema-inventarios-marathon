import { Link } from "wouter";
import { Package2, Edit, AlertTriangle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

type Garment = {
  id: string;
  code: string;
  size: string;
  color: string;
  gender: string;
  status: string;
  photoUrl: string | null;
  category?: { id: string; name: string } | null;
  garmentType?: { id: string; name: string } | null;
  rack?: { id: string; name: string; code: string } | null;
  lot?: { id: string; name: string; code: string } | null;
};

interface GarmentCardProps {
  garment: Garment;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "IN_STOCK":
      return "bg-green-500";
    case "IN_TRANSIT":
      return "bg-blue-500";
    case "SOLD":
      return "bg-gray-500";
    case "RESERVED":
      return "bg-yellow-500";
    case "DAMAGED":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

const getStatusLabel = (status: string) => {
  return status.replace(/_/g, " ");
};

export function GarmentCard({ garment }: GarmentCardProps) {
  const { user } = useAuth();
  const canEdit = user?.role === "CURATOR";

  // Determine missing data
  const missingData: string[] = [];
  if (!garment.photoUrl) missingData.push("photo");
  if (!garment.rack) missingData.push("rack");
  if (!garment.lot) missingData.push("lot");

  const hasMissingData = missingData.length > 0;

  return (
    <Card className="hover-elevate active-elevate-2 h-full relative" data-testid={`card-garment-${garment.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link href={`/garment/${garment.code}`} data-testid={`link-garment-${garment.id}`}>
            <CardTitle className="text-base font-mono hover:underline cursor-pointer" data-testid={`text-code-${garment.id}`}>
              {garment.code}
            </CardTitle>
          </Link>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge className={`${getStatusColor(garment.status)} text-white`} data-testid={`badge-status-${garment.id}`}>
              {getStatusLabel(garment.status)}
            </Badge>
            {canEdit && (
              <Link href={`/curator/garment/${garment.id}/edit`}>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  data-testid={`button-edit-${garment.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-xs" data-testid={`badge-size-${garment.id}`}>
            {garment.size}
          </Badge>
          <Badge variant="outline" className="text-xs" data-testid={`badge-color-${garment.id}`}>
            {garment.color}
          </Badge>
          <Badge variant="outline" className="text-xs" data-testid={`badge-gender-${garment.id}`}>
            {garment.gender}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Photo or placeholder */}
        <Link href={`/garment/${garment.code}`}>
          {garment.photoUrl ? (
            <img
              src={garment.photoUrl}
              alt={garment.code}
              className="w-full h-40 object-cover rounded-md mb-3 cursor-pointer"
              data-testid={`img-photo-${garment.id}`}
            />
          ) : (
            <div className="w-full h-40 bg-muted rounded-md flex flex-col items-center justify-center mb-3 cursor-pointer" data-testid={`placeholder-photo-${garment.id}`}>
              <Package2 className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">Sin foto</p>
            </div>
          )}
        </Link>

        {/* Missing data indicator */}
        {hasMissingData && (
          <div className="mb-3 flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-md px-2 py-1.5" data-testid={`alert-missing-${garment.id}`}>
            <AlertTriangle className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 shrink-0" />
            <p className="text-xs text-orange-600 dark:text-orange-400">
              Faltan: {missingData.join(", ")}
            </p>
          </div>
        )}

        {/* Garment details */}
        <div className="space-y-1 text-sm">
          {garment.category && (
            <p className="text-muted-foreground" data-testid={`text-category-${garment.id}`}>
              <span className="font-medium">Category:</span> {garment.category.name}
            </p>
          )}
          {garment.garmentType && (
            <p className="text-muted-foreground" data-testid={`text-type-${garment.id}`}>
              <span className="font-medium">Type:</span> {garment.garmentType.name}
            </p>
          )}
          {garment.rack ? (
            <p className="text-muted-foreground" data-testid={`text-rack-${garment.id}`}>
              <span className="font-medium">Rack:</span> {garment.rack.name}
            </p>
          ) : (
            <p className="text-orange-600 dark:text-orange-400 text-xs" data-testid={`text-rack-unassigned-${garment.id}`}>
              <span className="font-medium">Rack:</span> Sin asignar
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
