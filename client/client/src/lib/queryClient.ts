import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = data.message || message;
    } catch {
      const text = await res.text();
      if (text) message = text;
    }
    throw new Error(message);
  }
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  const headers: HeadersInit = {};
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const headers = new Headers(getAuthHeaders());

  let body: BodyInit | undefined = undefined;

  if (data instanceof FormData) {
    // NO ponemos Content-Type, el navegador lo setea con boundary
    body = data;
  } else if (data !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(data);
  }

  const res = await fetch(url, {
    method,
    headers,
    body,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers: getAuthHeaders(),
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Refetch on window focus to get fresh data
      staleTime: 30000, // 30 seconds - allows fresh data after mutations
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});


/**
 * Invalidate any cached queries related to garments, regardless of how the queryKey was built.
 * This avoids stale UI issues when queries use full URLs (e.g. '/api/garments/search?...') as the queryKey.
 */
export function invalidateGarmentQueries() {
  queryClient.invalidateQueries({
    predicate: (q) => {
      const key0 = (q.queryKey as any)?.[0];
      return typeof key0 === 'string' && key0.startsWith('/api/garments');
    },
  });

  // Stats depend on garment counts
  queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
}
