import { QueryClient } from "@tanstack/react-query";

/**
 * Creates a QueryClient configured for testing
 * - Disables retries to fail fast
 * - Sets gcTime to 0 to prevent memory leaks
 * - Reduces staleTime to prevent caching issues
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0, // Disable garbage collection time for tests
        staleTime: 0, // Always consider data stale
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Cleans up a QueryClient instance
 * Call this in afterEach to prevent memory leaks and open handles
 * This function is async to ensure all pending queries/mutations are cancelled
 */
export async function cleanupQueryClient(queryClient: QueryClient): Promise<void> {
  // Cancel all pending queries and mutations
  queryClient
    .getQueryCache()
    .getAll()
    .forEach((query) => {
      queryClient.cancelQueries({ queryKey: query.queryKey });
    });
  queryClient
    .getMutationCache()
    .getAll()
    .forEach((mutation) => {
      mutation.cancel?.();
    });

  // Clear caches
  queryClient.clear();
  queryClient.removeQueries();
  queryClient.getQueryCache().clear();
  queryClient.getMutationCache().clear();

  // Wait a tick to ensure all cancellations are processed
  await new Promise((resolve) => {
    if (typeof setImmediate !== "undefined") {
      setImmediate(resolve);
    } else {
      setTimeout(resolve, 0);
    }
  });
}
