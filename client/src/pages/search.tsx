import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, SlidersHorizontal, X, Package2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "wouter";

type FilterState = {
  categoryId?: string;
  garmentTypeId?: string;
  collectionId?: string;
  lotId?: string;
  rackId?: string;
  size?: string;
  color?: string;
  gender?: string;
  status?: string;
};

type Garment = {
  id: string;
  code: string;
  size: string;
  color: string;
  gender: string;
  status: string;
  photoUrl: string | null;
  categoryId: string;
  garmentTypeId: string;
  collectionId: string;
  lotId: string;
  rackId: string | null;
  category?: { id: string; name: string };
  garmentType?: { id: string; name: string };
  collection?: { id: string; name: string };
  lot?: { id: string; name: string; code: string };
  rack?: { id: string; name: string; code: string };
};

type Category = { id: string; name: string };
type GarmentType = { id: string; name: string; categoryId: string };
type Collection = { id: string; name: string };
type Lot = { id: string; name: string; code: string };
type Rack = { id: string; name: string; code: string };

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Build query params
  const queryParams = new URLSearchParams();
  if (searchQuery) queryParams.append("code", searchQuery);
  if (filters.categoryId) queryParams.append("categoryId", filters.categoryId);
  if (filters.garmentTypeId) queryParams.append("garmentTypeId", filters.garmentTypeId);
  if (filters.collectionId) queryParams.append("collectionId", filters.collectionId);
  if (filters.lotId) queryParams.append("lotId", filters.lotId);
  if (filters.rackId) queryParams.append("rackId", filters.rackId);
  if (filters.size) queryParams.append("size", filters.size);
  if (filters.color) queryParams.append("color", filters.color);
  if (filters.gender) queryParams.append("gender", filters.gender);
  if (filters.status) queryParams.append("status", filters.status);

  const { data: garments = [], isLoading: garmentsLoading } = useQuery<Garment[]>({
    queryKey: ["/api/garments", queryParams.toString()],
    queryFn: async () => {
      const url = `/api/garments${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch garments");
      return res.json();
    },
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: types = [] } = useQuery<GarmentType[]>({
    queryKey: ["/api/garment-types"],
  });

  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ["/api/collections"],
  });

  const { data: lots = [] } = useQuery<Lot[]>({
    queryKey: ["/api/lots"],
  });

  const { data: racks = [] } = useQuery<Rack[]>({
    queryKey: ["/api/racks"],
  });

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  const clearFilter = (key: keyof FilterState) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[key];
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setFilters({});
    setSearchQuery("");
  };

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

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="filter-category" className="text-sm font-medium mb-2 block">
          Category
        </Label>
        <Select
          value={filters.categoryId}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, categoryId: value === "all" ? undefined : value }))
          }
        >
          <SelectTrigger id="filter-category" data-testid="select-category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="filter-type" className="text-sm font-medium mb-2 block">
          Garment Type
        </Label>
        <Select
          value={filters.garmentTypeId}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, garmentTypeId: value === "all" ? undefined : value }))
          }
        >
          <SelectTrigger id="filter-type" data-testid="select-type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {types.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="filter-collection" className="text-sm font-medium mb-2 block">
          Collection
        </Label>
        <Select
          value={filters.collectionId}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, collectionId: value === "all" ? undefined : value }))
          }
        >
          <SelectTrigger id="filter-collection" data-testid="select-collection">
            <SelectValue placeholder="Select collection" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Collections</SelectItem>
            {collections.map((coll) => (
              <SelectItem key={coll.id} value={coll.id}>
                {coll.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="filter-lot" className="text-sm font-medium mb-2 block">
          Lot
        </Label>
        <Select
          value={filters.lotId}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, lotId: value === "all" ? undefined : value }))
          }
        >
          <SelectTrigger id="filter-lot" data-testid="select-lot">
            <SelectValue placeholder="Select lot" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lots</SelectItem>
            {lots.map((lot) => (
              <SelectItem key={lot.id} value={lot.id}>
                {lot.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="filter-rack" className="text-sm font-medium mb-2 block">
          Rack
        </Label>
        <Select
          value={filters.rackId}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, rackId: value === "all" ? undefined : value }))
          }
        >
          <SelectTrigger id="filter-rack" data-testid="select-rack">
            <SelectValue placeholder="Select rack" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Racks</SelectItem>
            {racks.map((rack) => (
              <SelectItem key={rack.id} value={rack.id}>
                {rack.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div>
        <Label htmlFor="filter-size" className="text-sm font-medium mb-2 block">
          Size
        </Label>
        <Select
          value={filters.size}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, size: value === "all" ? undefined : value }))
          }
        >
          <SelectTrigger id="filter-size" data-testid="select-size">
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sizes</SelectItem>
            <SelectItem value="S">S</SelectItem>
            <SelectItem value="M">M</SelectItem>
            <SelectItem value="L">L</SelectItem>
            <SelectItem value="XL">XL</SelectItem>
            <SelectItem value="XXL">XXL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="filter-color" className="text-sm font-medium mb-2 block">
          Color
        </Label>
        <Input
          id="filter-color"
          placeholder="Enter color"
          value={filters.color || ""}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, color: e.target.value || undefined }))
          }
          data-testid="input-color"
        />
      </div>

      <div>
        <Label htmlFor="filter-gender" className="text-sm font-medium mb-2 block">
          Gender
        </Label>
        <Select
          value={filters.gender}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, gender: value === "all" ? undefined : value }))
          }
        >
          <SelectTrigger id="filter-gender" data-testid="select-gender">
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genders</SelectItem>
            <SelectItem value="MALE">Male</SelectItem>
            <SelectItem value="FEMALE">Female</SelectItem>
            <SelectItem value="UNISEX">Unisex</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="filter-status" className="text-sm font-medium mb-2 block">
          Status
        </Label>
        <Select
          value={filters.status}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, status: value === "all" ? undefined : value }))
          }
        >
          <SelectTrigger id="filter-status" data-testid="select-status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="IN_STOCK">In Stock</SelectItem>
            <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
            <SelectItem value="SOLD">Sold</SelectItem>
            <SelectItem value="RESERVED">Reserved</SelectItem>
            <SelectItem value="DAMAGED">Damaged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={clearAllFilters}
        data-testid="button-clear-filters"
      >
        Clear All Filters
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Search Inventory</h1>
        <p className="text-muted-foreground mt-2">
          Find garments using filters and search
        </p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by code, color, or description..."
            className="pl-10 h-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search"
          />
        </div>

        <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="md:w-auto" data-testid="button-open-filters">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Narrow down your search with filters
              </SheetDescription>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-8rem)] mt-6">
              <FilterContent />
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>

      {(activeFiltersCount > 0 || searchQuery) && (
        <div className="flex flex-wrap gap-2">
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: {searchQuery}
              <button
                onClick={() => setSearchQuery("")}
                className="ml-1 hover:bg-secondary-foreground/10 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.categoryId && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-filter-category">
              Category: {categories.find((c) => c.id === filters.categoryId)?.name}
              <button
                onClick={() => clearFilter("categoryId")}
                className="ml-1 hover:bg-secondary-foreground/10 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.garmentTypeId && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-filter-garmentType">
              Type: {types.find((t) => t.id === filters.garmentTypeId)?.name}
              <button
                onClick={() => clearFilter("garmentTypeId")}
                className="ml-1 hover:bg-secondary-foreground/10 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.collectionId && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-filter-collection">
              Collection: {collections.find((c) => c.id === filters.collectionId)?.name}
              <button
                onClick={() => clearFilter("collectionId")}
                className="ml-1 hover:bg-secondary-foreground/10 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.lotId && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-filter-lot">
              Lot: {lots.find((l) => l.id === filters.lotId)?.name}
              <button
                onClick={() => clearFilter("lotId")}
                className="ml-1 hover:bg-secondary-foreground/10 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.size && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-filter-size">
              Size: {filters.size}
              <button
                onClick={() => clearFilter("size")}
                className="ml-1 hover:bg-secondary-foreground/10 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.color && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-filter-color">
              Color: {filters.color}
              <button
                onClick={() => clearFilter("color")}
                className="ml-1 hover:bg-secondary-foreground/10 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.gender && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-filter-gender">
              Gender: {filters.gender}
              <button
                onClick={() => clearFilter("gender")}
                className="ml-1 hover:bg-secondary-foreground/10 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.status && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-filter-status">
              Status: {getStatusLabel(filters.status)}
              <button
                onClick={() => clearFilter("status")}
                className="ml-1 hover:bg-secondary-foreground/10 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      <div>
        <p className="text-sm text-muted-foreground mb-4" data-testid="text-results-count">
          {garmentsLoading ? "Loading..." : `${garments.length} result${garments.length !== 1 ? "s" : ""} found`}
        </p>

        {garmentsLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-lg text-muted-foreground">Loading garments...</div>
          </div>
        ) : garments.length === 0 ? (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <SearchIcon className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg text-muted-foreground">No garments found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Try adjusting your filters or search query
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {garments.map((garment) => (
              <Link key={garment.id} href={`/garment/${garment.code}`}>
                <Card className="cursor-pointer hover-elevate active-elevate-2 h-full" data-testid={`card-garment-${garment.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="text-base font-mono">{garment.code}</CardTitle>
                      <Badge className={`${getStatusColor(garment.status)} shrink-0 text-white`}>
                        {getStatusLabel(garment.status)}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs">
                        {garment.size}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {garment.color}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {garment.gender}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {garment.photoUrl ? (
                      <img
                        src={garment.photoUrl}
                        alt={garment.code}
                        className="w-full h-40 object-cover rounded-md mb-3"
                      />
                    ) : (
                      <div className="w-full h-40 bg-muted rounded-md flex items-center justify-center mb-3">
                        <Package2 className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                    <div className="space-y-1 text-sm">
                      {garment.category && (
                        <p className="text-muted-foreground">
                          <span className="font-medium">Category:</span> {garment.category.name}
                        </p>
                      )}
                      {garment.garmentType && (
                        <p className="text-muted-foreground">
                          <span className="font-medium">Type:</span> {garment.garmentType.name}
                        </p>
                      )}
                      {garment.rack && (
                        <p className="text-muted-foreground">
                          <span className="font-medium">Rack:</span> {garment.rack.name}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
