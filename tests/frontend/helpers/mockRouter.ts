import { vi } from "vitest";

/**
 * Create a mock navigate function
 * Returns a vitest mock function that can be used to verify navigation calls
 */
export function createMockNavigate() {
  return vi.fn();
}

/**
 * Mock react-router-dom's useNavigate hook
 * This sets up the mock globally for all tests in a file
 *
 * @example
 * ```tsx
 * const mockNavigate = mockUseNavigate();
 *
 * // Later in test
 * expect(mockNavigate).toHaveBeenCalledWith("/some/path");
 * ```
 */
export function mockUseNavigate(navigate = createMockNavigate()) {
  vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
    return {
      ...actual,
      useNavigate: () => navigate,
    };
  });
  return navigate;
}

/**
 * Create a mock location object
 * Useful for testing components that use useLocation
 */
export function createMockLocation(
  overrides: Partial<Location> = {},
): Location {
  return {
    hash: "",
    host: "localhost:5173",
    hostname: "localhost",
    href: "http://localhost:5173/",
    origin: "http://localhost:5173",
    pathname: "/",
    port: "5173",
    protocol: "http:",
    search: "",
    ...overrides,
  } as Location;
}

