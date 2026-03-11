import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

export type GarmentSearchFilters = {
  q?: string;
  categoryId?: string;
  garmentTypeId?: string;
  collectionId?: string;
  yearId?: string;
  lotId?: string;
  rackId?: string;
  size?: string;
  color?: string;
  gender?: "MALE" | "FEMALE" | "UNISEX";
  status?: string;
};

export type Garment = {
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

export type GarmentSearchResponse = {
  items: Garment[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
};

export type GarmentSearchPagedFilters = GarmentSearchFilters & {
  limit?: number;
  offset?: number;
};

export function useGarmentSearch(filters: GarmentSearchPagedFilters) {
  const queryUrl = useMemo(() => {
    const queryParams = new URLSearchParams();

    if (filters.q) queryParams.append("q", filters.q);
    if (filters.categoryId) queryParams.append("categoryId", filters.categoryId);
    if (filters.garmentTypeId) queryParams.append("garmentTypeId", filters.garmentTypeId);
    if (filters.collectionId) queryParams.append("collectionId", filters.collectionId);
    if (filters.yearId) queryParams.append("yearId", filters.yearId);
    if (filters.lotId) queryParams.append("lotId", filters.lotId);
    if (filters.rackId) queryParams.append("rackId", filters.rackId);
    if (filters.size) queryParams.append("size", filters.size);
    if (filters.color) queryParams.append("color", filters.color);
    if (filters.gender) queryParams.append("gender", filters.gender);
    if (filters.status) queryParams.append("status", filters.status);

    queryParams.append("limit", String(filters.limit ?? 24));
    queryParams.append("offset", String(filters.offset ?? 0));

    const queryString = queryParams.toString();
    return `/api/garments/search${queryString ? `?${queryString}` : ""}`;
  }, [
    filters.q,
    filters.categoryId,
    filters.garmentTypeId,
    filters.collectionId,
    filters.yearId,
    filters.lotId,
    filters.rackId,
    filters.size,
    filters.color,
    filters.gender,
    filters.status,
    filters.limit,
    filters.offset,
  ]);

  return useQuery<GarmentSearchResponse>({
    queryKey: [queryUrl],
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}