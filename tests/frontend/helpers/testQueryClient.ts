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
 */
export function cleanupQueryClient(queryClient: QueryClient): void {
  queryClient.clear();
  queryClient.removeQueries();
  queryClient.getQueryCache().clear();
  queryClient.getMutationCache().clear();
}
