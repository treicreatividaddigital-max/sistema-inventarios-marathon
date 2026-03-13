import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search as SearchIcon, SlidersHorizontal, X, RefreshCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useGarmentSearch, type GarmentSearchFilters } from "@/hooks/use-garment-search";
import { GarmentCard } from "@/components/garment-card";

type FilterState = GarmentSearchFilters;

type Category = { id: string; name: string };
type GarmentType = { id: string; name: string; categoryId: string };
type Collection = { id: string; name: string };
type Lot = { id: string; name: string; code: string };
type Rack = { id: string; name: string; code: string };

const PAGE_SIZE = 24;
const SEARCH_DEBOUNCE_MS = 350;
const RESUME_REFRESH_THROTTLE_MS = 1500;

export default function SearchPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>({});
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [allItems, setAllItems] = useState<any[]>([]);
  const resumeRefreshRef = useRef(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [searchQuery]);

  const searchParams = useMemo(
    () => ({
      q: debouncedSearchQuery,
      ...filters,
      limit: PAGE_SIZE,
      offset,
    }),
    [debouncedSearchQuery, filters, offset],
  );

  const {
    data: searchResult,
    isLoading: garmentsLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useGarmentSearch(searchParams);

  const garments = searchResult?.items ?? [];
  const total = searchResult?.total ?? 0;
  const hasMore = searchResult?.hasMore ?? false;

  useEffect(() => {
    if (!searchResult) return;

    if (offset === 0) {
      setAllItems(searchResult.items);
      return;
    }

    setAllItems((prev) => {
      const seen = new Set(prev.map((item) => item.id));
      const next = [...prev];
      for (const item of searchResult.items) {
        if (!seen.has(item.id)) next.push(item);
      }
      return next;
    });
  }, [searchResult, offset]);

  useEffect(() => {
    setOffset(0);
  }, [debouncedSearchQuery, filters]);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    staleTime: 5 * 60_000,
  });

  const { data: types = [] } = useQuery<GarmentType[]>({
    queryKey: ["/api/garment-types"],
    staleTime: 5 * 60_000,
  });

  const { data: collections = [] } = useQuery<Collection[]>({
    queryKey: ["/api/collections"],
    staleTime: 5 * 60_000,
  });

  const { data: lots = [] } = useQuery<Lot[]>({
    queryKey: ["/api/lots"],
    staleTime: 5 * 60_000,
  });

  const { data: racks = [] } = useQuery<Rack[]>({
    queryKey: ["/api/racks"],
    staleTime: 5 * 60_000,
  });

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  const clearFilter = (key: keyof FilterState) => {
    setFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const clearAllFilters = () => {
    setFilters({});
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setOffset(0);
    setAllItems([]);
  };

  const refreshSearchView = useCallback(async () => {
    const now = Date.now();
    if (now - resumeRefreshRef.current < RESUME_REFRESH_THROTTLE_MS) return;
    resumeRefreshRef.current = now;

    setOffset(0);
    setAllItems([]);

    await queryClient.invalidateQueries({
      predicate: (q) => {
        const key0 = (q.queryKey as any)?.[0];
        return typeof key0 === "string" && key0.startsWith("/api/garments");
      },
    });

    await refetch();
  }, [queryClient, refetch]);

  useEffect(() => {
    const handleResume = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      void refreshSearchView();
    };

    window.addEventListener("pageshow", handleResume);
    window.addEventListener("focus", handleResume);
    document.addEventListener("visibilitychange", handleResume);

    return () => {
      window.removeEventListener("pageshow", handleResume);
      window.removeEventListener("focus", handleResume);
      document.removeEventListener("visibilitychange", handleResume);
    };
  }, [refreshSearchView]);

  const FilterContent = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="filter-category" className="mb-2 block text-sm font-medium">
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
        <Label htmlFor="filter-type" className="mb-2 block text-sm font-medium">
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
        <Label htmlFor="filter-collection" className="mb-2 block text-sm font-medium">
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
        <Label htmlFor="filter-lot" className="mb-2 block text-sm font-medium">
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
        <Label htmlFor="filter-rack" className="mb-2 block text-sm font-medium">
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
        <Label htmlFor="filter-size" className="mb-2 block text-sm font-medium">
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
        <Label htmlFor="filter-color" className="mb-2 block text-sm font-medium">
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
        <Label htmlFor="filter-gender" className="mb-2 block text-sm font-medium">
          Gender
        </Label>
        <Select
          value={filters.gender}
          onValueChange={(value) =>
            setFilters((prev) => ({
              ...prev,
              gender: value === "all" ? undefined : (value as FilterState["gender"]),
            }))
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
        <Label htmlFor="filter-status" className="mb-2 block text-sm font-medium">
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
        <p className="mt-2 text-muted-foreground">Find garments using filters and search</p>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by code, color, or description..."
            className="h-12 pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search"
          />
        </div>

        <div className="flex gap-2 md:w-auto">
          <Button
            variant="outline"
            className="md:w-auto"
            onClick={() => void refreshSearchView()}
            data-testid="button-refresh-search"
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="md:w-auto" data-testid="button-open-filters">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
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
                <SheetDescription>Narrow down your search with filters</SheetDescription>
              </SheetHeader>
              <ScrollArea className="mt-6 h-[calc(100vh-8rem)]">
                <FilterContent />
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {(activeFiltersCount > 0 || searchQuery) && (
        <div className="flex flex-wrap gap-2">
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: {searchQuery}
              <button
                onClick={() => setSearchQuery("")}
                className="ml-1 rounded-full p-0.5 hover:bg-secondary-foreground/10"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.categoryId && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-filter-category">
              Category: {categories.find((c) => c.id === filters.categoryId)?.name}
              <button onClick={() => clearFilter("categoryId")} className="ml-1 rounded-full p-0.5 hover:bg-secondary-foreground/10">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.garmentTypeId && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-filter-garmentType">
              Type: {types.find((t) => t.id === filters.garmentTypeId)?.name}
              <button onClick={() => clearFilter("garmentTypeId")} className="ml-1 rounded-full p-0.5 hover:bg-secondary-foreground/10">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.collectionId && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-filter-collection">
              Collection: {collections.find((c) => c.id === filters.collectionId)?.name}
              <button onClick={() => clearFilter("collectionId")} className="ml-1 rounded-full p-0.5 hover:bg-secondary-foreground/10">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.lotId && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-filter-lot">
              Lot: {lots.find((l) => l.id === filters.lotId)?.name}
              <button onClick={() => clearFilter("lotId")} className="ml-1 rounded-full p-0.5 hover:bg-secondary-foreground/10">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.rackId && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-filter-rack">
              Rack: {racks.find((r) => r.id === filters.rackId)?.name}
              <button onClick={() => clearFilter("rackId")} className="ml-1 rounded-full p-0.5 hover:bg-secondary-foreground/10">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.size && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-filter-size">
              Size: {filters.size}
              <button onClick={() => clearFilter("size")} className="ml-1 rounded-full p-0.5 hover:bg-secondary-foreground/10">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.color && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-filter-color">
              Color: {filters.color}
              <button onClick={() => clearFilter("color")} className="ml-1 rounded-full p-0.5 hover:bg-secondary-foreground/10">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.gender && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-filter-gender">
              Gender: {filters.gender}
              <button onClick={() => clearFilter("gender")} className="ml-1 rounded-full p-0.5 hover:bg-secondary-foreground/10">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.status && (
            <Badge variant="secondary" className="gap-1" data-testid="badge-filter-status">
              Status: {filters.status.replace(/_/g, " ")}
              <button onClick={() => clearFilter("status")} className="ml-1 rounded-full p-0.5 hover:bg-secondary-foreground/10">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      <div>
        <p className="mb-4 text-sm text-muted-foreground" data-testid="text-results-count">
          {garmentsLoading && offset === 0
            ? "Loading..."
            : total > allItems.length
              ? `Showing ${allItems.length} of ${total} results`
              : `${total} result${total !== 1 ? "s" : ""} found`}
        </p>

        {isError ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <SearchIcon className="h-14 w-14 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-lg font-medium">Search needs a quick refresh</p>
                <p className="text-sm text-muted-foreground">
                  {String((error as Error)?.message || "The search view could not be refreshed.")}
                </p>
              </div>
              <Button onClick={() => void refreshSearchView()}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Reload search
              </Button>
            </CardContent>
          </Card>
        ) : garmentsLoading && offset === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-lg text-muted-foreground">Loading garments...</div>
          </div>
        ) : total === 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <SearchIcon className="mb-4 h-16 w-16 text-muted-foreground" />
                <p className="text-lg text-muted-foreground">No garments found</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Try adjusting your filters or search query
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {allItems.map((garment) => (
                <GarmentCard key={garment.id} garment={garment} />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
                  disabled={garmentsLoading}
                  data-testid="button-load-more-results"
                >
                  {garmentsLoading ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
