import { QueryClient, QueryFunction } from "@tanstack/react-query";

type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Safe response error parsing:
 * - Reads body once (prevents "body stream already read")
 * - Tries JSON first, falls back to text
 */
async function throwIfResNotOk(res: Response) {
  if (res.ok) return;

  let message = res.statusText || "Request failed";

  // Read once
  let raw = "";
  try {
    raw = await res.text();
  } catch {
    raw = "";
  }

  if (raw) {
    // Try JSON
    try {
      const data = JSON.parse(raw);
      if (data && typeof data === "object") {
        const msg = (data as any).message;
        if (typeof msg === "string" && msg.trim()) message = msg;
        else message = raw;
      } else {
        message = raw;
      }
    } catch {
      message = raw;
    }
  }

  throw new Error(message);
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function parseJsonIfAny(res: Response): Promise<any> {
  // 204 No Content or empty body
  if (res.status === 204) return null;

  const ct = res.headers.get("content-type") || "";
  const raw = await res.text();
  if (!raw) return null;

  if (ct.includes("application/json")) {
    try {
      return JSON.parse(raw);
    } catch {
      // Fall back to raw if server lied about content-type
      return raw;
    }
  }

  // Non-JSON (e.g. HTML error pages, plain text)
  return raw;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<any> {
  const headers = new Headers(getAuthHeaders());

  let body: BodyInit | undefined = undefined;

  if (data instanceof FormData) {
    // Do NOT set Content-Type; browser sets boundary
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
  return await parseJsonIfAny(res);
}

export const getQueryFn =
  <T>(options: { on401: UnauthorizedBehavior }): QueryFunction<T> =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers: getAuthHeaders(),
    });

    if (options.on401 === "returnNull" && res.status === 401) {
      return null as any;
    }

    await throwIfResNotOk(res);
    return (await parseJsonIfAny(res)) as T;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 30000,
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
      return typeof key0 === "string" && key0.startsWith("/api/garments");
    },
  });

  // Stats depend on garment counts
  queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
}
