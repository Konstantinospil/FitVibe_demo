import { QueryClient } from "@tanstack/react-query";

/**
 * Creates a new QueryClient with default options
 * Used for both client-side and server-side rendering
 * 
 * For SSR: Create a new QueryClient per request to avoid sharing state
 * For client: Use the default queryClient instance
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

/**
 * Default QueryClient for client-side use
 * For SSR, create a new QueryClient per request using createQueryClient()
 * 
 * Note: Hydration is handled by HydrationBoundary component in ProtectedRoutes
 */
export const queryClient = createQueryClient();
