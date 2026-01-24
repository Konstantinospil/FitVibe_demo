declare module "react-router-dom/server" {
  import type * as React from "react";

  export interface StaticRouterProps {
    basename?: string;
    children?: React.ReactNode;
    location: string | Record<string, unknown>;
  }

  export function StaticRouter(props: StaticRouterProps): React.JSX.Element;
}
