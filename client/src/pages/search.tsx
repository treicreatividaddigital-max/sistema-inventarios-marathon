import { useState } from "react";
import { Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";
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

type FilterState = {
  category?: string;
  garmentType?: string;
  collection?: string;
  lot?: string;
  rack?: string;
  size?: string;
  color?: string;
  gender?: string;
  status?: string;
};

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);

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
  };

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="filter-category" className="text-sm font-medium mb-2 block">
          Category
        </Label>
        <Select
          value={filters.category}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, category: value }))
          }
        >
          <SelectTrigger id="filter-category" data-testid="select-category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="filter-type" className="text-sm font-medium mb-2 block">
          Garment Type
        </Label>
        <Select
          value={filters.garmentType}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, garmentType: value }))
          }
        >
          <SelectTrigger id="filter-type" data-testid="select-type">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="filter-collection" className="text-sm font-medium mb-2 block">
          Collection
        </Label>
        <Select
          value={filters.collection}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, collection: value }))
          }
        >
          <SelectTrigger id="filter-collection" data-testid="select-collection">
            <SelectValue placeholder="Select collection" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Collections</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="filter-lot" className="text-sm font-medium mb-2 block">
          Lot
        </Label>
        <Select
          value={filters.lot}
          onValueChange={(value) =>
            setFilters((prev) => ({ ...prev, lot: value }))
          }
        >
          <SelectTrigger id="filter-lot" data-testid="select-lot">
            <SelectValue placeholder="Select lot" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Lots</SelectItem>
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
            setFilters((prev) => ({ ...prev, size: value }))
          }
        >
          <SelectTrigger id="filter-size" data-testid="select-size">
            <SelectValue placeholder="Select size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="S">S</SelectItem>
            <SelectItem value="M">M</SelectItem>
            <SelectItem value="L">L</SelectItem>
            <SelectItem value="XL">XL</SelectItem>
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
            setFilters((prev) => ({ ...prev, color: e.target.value }))
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
            setFilters((prev) => ({ ...prev, gender: value }))
          }
        >
          <SelectTrigger id="filter-gender" data-testid="select-gender">
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
          <SelectContent>
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
            setFilters((prev) => ({ ...prev, status: value }))
          }
        >
          <SelectTrigger id="filter-status" data-testid="select-status">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
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

      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(filters).map(
            ([key, value]) =>
              value && (
                <Badge
                  key={key}
                  variant="secondary"
                  className="gap-1"
                  data-testid={`badge-filter-${key}`}
                >
                  {key}: {value}
                  <button
                    onClick={() => clearFilter(key as keyof FilterState)}
                    className="ml-1 hover:bg-secondary-foreground/10 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )
          )}
        </div>
      )}

      <div>
        <p className="text-sm text-muted-foreground mb-4" data-testid="text-results-count">
          0 results found
        </p>

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
      </div>
    </div>
  );
}
