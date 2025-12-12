# ADR-023: Server-Side Rendering (SSR) Implementation

**Date:** 2025-12-12  
**Status:** Accepted  
**Author:** AI Assistant  
**Cross-References:** ADR-014 (Technology Stack), ADR-019 (Caching & Performance Strategy), ADR-022 (Lighthouse Testing), QA Plan §6 (Performance budgets), LIGHTHOUSE_OPTIMIZATION_REPORT.md

---

## Context

The FitVibe frontend is currently a **client-side SPA** (Single Page Application) built with React 18 and Vite, served as static files via NGINX. Lighthouse performance testing revealed critical issues:

1. **Largest Contentful Paint (LCP)**: 15.3 seconds (target: ≤ 2.5s) - **CRITICAL UX PROBLEM**
2. **Performance Score**: 0.75 (target: ≥ 0.9)
3. **Resource Size**: 2.7MB total (target: ≤ 300KB initial load)

While optimizations (i18n code-splitting, font deferral, improved chunking) reduced initial bundle size by ~95% for translations, the fundamental issue remains: **JavaScript execution blocks initial render**, causing poor LCP metrics and user experience.

The QA Plan (4a.Testing_and_Quality_Assurance_Plan.md) mandates:
- **LCP P75 < 2.5s** (ADR-019)
- **Lighthouse Performance ≥ 90** (ADR-022)
- **Progressive enhancement** for accessibility (ADR-020)

ADR-014 established React + Vite as the frontend stack, but did not specify rendering strategy. The current SPA approach, while simple to deploy, fails to meet performance requirements for initial page load.

---

## Decision

Implement **Server-Side Rendering (SSR)** for all routes using **React 18's streaming SSR** via a Node.js/Express server. This will:

1. **Render HTML on the server** for all routes, eliminating JavaScript-blocking initial render
2. **Hydrate on the client** for interactivity, maintaining SPA-like navigation after initial load
3. **Stream responses** to improve Time to First Byte (TTFB) and perceived performance
4. **Maintain existing React codebase** with minimal changes to component structure

### Architecture Changes

#### 1. Rendering Strategy
- **All routes**: Server-rendered HTML with client-side hydration
- **Streaming SSR**: Use React 18's `renderToPipeableStream` for progressive HTML delivery
- **Isomorphic routing**: React Router configured for both server and client rendering

#### 2. Server Infrastructure
- **Node.js server**: Express.js server to handle SSR (extends existing backend or separate service)
- **Build output**: Dual build - client bundle (for hydration) + server bundle (for rendering)
- **Deployment**: Replace static NGINX serving with Node.js server + NGINX reverse proxy

#### 3. Implementation Approach

**Option Selected: Vite SSR with Express**

Use Vite's built-in SSR support with Express.js server:

```typescript
// apps/frontend/server.ts (new file)
import express from 'express';
import { renderPage } from './ssr/render.js';

const app = express();

app.use('/assets', express.static('dist/client/assets'));

app.get('*', async (req, res) => {
  try {
    const html = await renderPage(req.url);
    res.send(html);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
});
```

**Build Configuration**:
- **Client build**: `vite build --ssr false` → `dist/client/`
- **Server build**: `vite build --ssr` → `dist/server/`
- **Entry points**: 
  - Client: `src/main.tsx` (hydration)
  - Server: `src/server.tsx` (SSR renderer)

#### 4. Routing Strategy

- **Server routes**: Match React Router routes on server, render appropriate component
- **Client routes**: React Router handles navigation after hydration (SPA-like)
- **Data fetching**: Server-side data fetching for initial render, React Query for client updates

#### 5. Performance Optimizations

- **Streaming**: Use `renderToPipeableStream` for progressive HTML delivery
- **Code splitting**: Maintain existing lazy loading, but pre-render critical routes
- **Caching**: Cache rendered HTML for public routes (login, register, terms, privacy)
- **Static generation**: Pre-render public routes at build time (ISR - Incremental Static Regeneration)

---

## Consequences

**Positive**

- **Dramatic LCP improvement**: Expected reduction from 15.3s to < 1s (server-rendered HTML is immediately visible)
- **Better SEO**: Search engines can index server-rendered content
- **Progressive enhancement**: Works without JavaScript (critical for accessibility)
- **Performance score**: Expected improvement from 0.75 to ≥ 0.9
- **User experience**: Instant content visibility, no blank screen during JavaScript load
- **Lighthouse compliance**: Meets all performance budgets (ADR-019, ADR-022)

**Negative / Trade-offs**

- **Increased complexity**: Dual build system, server-side rendering logic, hydration coordination
- **Infrastructure changes**: Requires Node.js server instead of static file serving
- **Development overhead**: Need to consider SSR compatibility for all components
- **Server load**: Additional CPU/memory for rendering (mitigated by caching)
- **Deployment complexity**: More complex build and deployment process
- **Initial development time**: 3-4 weeks of implementation effort

**Operational**

- **Server resources**: Node.js server needs CPU/memory for rendering (can be scaled horizontally)
- **Caching strategy**: Implement HTML caching for public routes to reduce server load
- **Monitoring**: Track SSR render times, hydration errors, and performance metrics
- **Fallback**: Maintain static build as fallback if SSR fails
- **CI/CD**: Update build pipelines to generate both client and server bundles

---

## Alternatives Considered

| Option | Description | Reason Rejected |
|--------|-------------|-----------------|
| **Static Site Generation (SSG)** | Pre-render all pages at build time | Doesn't solve authenticated routes; requires rebuild for dynamic content |
| **Hybrid SSR (public only)** | SSR for public routes, SPA for authenticated | Incomplete solution; authenticated routes also need performance improvement |
| **Adjust Lighthouse thresholds** | Lower performance requirements | Violates ADR-019 and QA Plan requirements; doesn't fix real UX problem |
| **Progressive Web App (PWA) only** | Service worker + caching | Doesn't address initial load performance; LCP still blocked by JavaScript |
| **Next.js migration** | Use Next.js framework | Too large a migration; would require rewriting entire frontend |
| **Remix framework** | Use Remix for SSR | Similar to Next.js; prefer staying with Vite for consistency |
| **Streaming SSR only** | Implement streaming without full SSR | Incomplete; need server rendering for initial HTML |

---

## Implementation Details

### Build Configuration

```typescript
// vite.config.ts (updated)
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        client: resolve(__dirname, 'src/main.tsx'),
        server: resolve(__dirname, 'src/server.tsx'),
      },
      output: {
        format: 'esm',
      },
    },
    ssr: true, // Enable SSR build
  },
  ssr: {
    noExternal: ['react', 'react-dom', 'react-router-dom'],
  },
});
```

### Server Entry Point

```typescript
// src/server.tsx
import { renderToPipeableStream } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import App from './App';

export async function renderPage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let html = '';
    const stream = renderToPipeableStream(
      <StaticRouter location={url}>
        <App />
      </StaticRouter>,
      {
        onShellReady() {
          // Start streaming HTML
        },
        onAllReady() {
          resolve(html);
        },
        onError(error) {
          reject(error);
        },
      }
    );
  });
}
```

### Dockerfile Changes

```dockerfile
# Replace NGINX stage with Node.js
FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/apps/frontend/dist ./dist
COPY --from=builder /app/apps/frontend/package.json ./
RUN pnpm install --prod --frozen-lockfile
EXPOSE 3000
CMD ["node", "dist/server/server.js"]
```

---

## References

- **ADR-014**: Technology Stack & Runtime Standards - established React + Vite stack
- **ADR-019**: Caching & Performance Strategy - mandates LCP < 2.5s, API p95 < 300ms
- **ADR-022**: Comprehensive Lighthouse Testing - requires Performance ≥ 90
- **ADR-020**: Accessibility Compliance - requires progressive enhancement
- **QA Plan** (4a.Testing_and_Quality_Assurance_Plan.md): §6 - Performance budgets, §11 - Performance testing
- **LIGHTHOUSE_OPTIMIZATION_REPORT.md**: Root cause analysis of performance issues
- **Vite SSR Guide**: https://vitejs.dev/guide/ssr.html

---

## Status Log

| Version | Date       | Change                                           | Author       |
| ------- | ---------- | ------------------------------------------------ | ------------ |
| v1.0    | 2025-12-12 | Initial ADR for SSR implementation              | AI Assistant |
