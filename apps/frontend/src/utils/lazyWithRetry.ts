import { lazy, type ComponentType } from "react";

/**
 * Wraps React.lazy() with retry logic for chunk load failures.
 *
 * "Failed to fetch dynamically imported module" occurs when:
 * - Browser has cached an old build and requests chunks that no longer exist
 * - Dev server restarted and chunk hashes changed
 * - Network blip during chunk fetch
 *
 * On failure: retries once, then forces a full page reload to fetch fresh assets.
 */
export function lazyWithRetry<T extends ComponentType<object>>(
  importFn: () => Promise<{ default: T }>,
  maxRetries = 1,
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let attempts = 0;

    const load = async (): Promise<{ default: T }> => {
      try {
        return await importFn();
      } catch (error) {
        const isChunkError =
          error instanceof Error &&
          (error.message.includes("Failed to fetch dynamically imported module") ||
            error.message.includes("Importing a module script failed") ||
            (error as Error & { name?: string }).name === "ChunkLoadError");

        if (isChunkError && attempts < maxRetries) {
          attempts += 1;
          return load();
        }

        if (isChunkError && typeof window !== "undefined") {
          window.location.reload();
          throw error;
        }

        throw error;
      }
    };

    return load();
  });
}
