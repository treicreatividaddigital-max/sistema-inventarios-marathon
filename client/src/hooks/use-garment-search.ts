import { useQuery } from "@tanstack/react-query";

export type GarmentSearchFilters = {
  q?: string;
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

export function useGarmentSearch(filters: GarmentSearchFilters) {
  const queryParams = new URLSearchParams();

  if (filters.q) queryParams.append("q", filters.q);
  if (filters.categoryId) queryParams.append("categoryId", filters.categoryId);
  if (filters.garmentTypeId) queryParams.append("garmentTypeId", filters.garmentTypeId);
  if (filters.collectionId) queryParams.append("collectionId", filters.collectionId);
  if (filters.lotId) queryParams.append("lotId", filters.lotId);
  if (filters.rackId) queryParams.append("rackId", filters.rackId);
  if (filters.size) queryParams.append("size", filters.size);
  if (filters.color) queryParams.append("color", filters.color);
  if (filters.gender) queryParams.append("gender", filters.gender);
  if (filters.status) queryParams.append("status", filters.status);

  const queryString = queryParams.toString();
  const queryUrl = `/api/garments/search${queryString ? `?${queryString}` : ""}`;

  return useQuery<Garment[]>({
    queryKey: [queryUrl],
  });
}
