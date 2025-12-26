import { QueryClient } from "@tanstack/react-query";

/**
 * Creates a test QueryClient with disabled retries and no cache time
 * to ensure tests run quickly and don't interfere with each other
 */
export const createTestQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });
};

/**
 * Cleans up a QueryClient instance by clearing all queries and cancelling observers
 */
export const cleanupQueryClient = (queryClient: QueryClient): void => {
  queryClient.clear();
  queryClient.cancelQueries();
};
