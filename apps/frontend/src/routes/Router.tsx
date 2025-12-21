import React from "react";
import { StaticRouter } from "react-router-dom/server";
import {
  QueryClientProvider,
  HydrationBoundary,
  type QueryClient,
  type DehydratedState,
} from "@tanstack/react-query";
import ProtectedRoutes from "./ProtectedRoutes";

export interface RouterProps {
  location: string;
  queryClient: QueryClient;
  dehydratedState?: DehydratedState;
}

/**
 * SSR Router component for server-side rendering
 * Uses StaticRouter instead of BrowserRouter for SSR
 */
export const Router: React.FC<RouterProps> = ({ location, queryClient, dehydratedState }) => {
  return (
    <StaticRouter location={location}>
      <QueryClientProvider client={queryClient}>
        {dehydratedState ? (
          <HydrationBoundary state={dehydratedState}>
            <ProtectedRoutes />
          </HydrationBoundary>
        ) : (
          <ProtectedRoutes />
        )}
      </QueryClientProvider>
    </StaticRouter>
  );
};
