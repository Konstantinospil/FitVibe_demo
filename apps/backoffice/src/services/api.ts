import axios, { type InternalAxiosRequestConfig } from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "" : "http://localhost:4000");

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  withCredentials: true,
});

// CSRF token management
let csrfTokenPromise: Promise<string> | null = null;
let cachedCsrfToken: string | null = null;

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Separate client for CSRF token fetching to avoid circular dependencies
const csrfClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  withCredentials: true,
});

async function fetchCsrfToken(): Promise<string> {
  // If we already have a token fetch in progress, reuse that promise
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  // Create new token fetch promise
  csrfTokenPromise = (async () => {
    try {
      const response = await csrfClient.get<{ csrfToken: string }>("/api/v1/csrf-token");
      const token = response.data.csrfToken;
      cachedCsrfToken = token;
      return token;
    } catch (error) {
      // Clear the promise on error so we can retry
      csrfTokenPromise = null;
      throw error;
    } finally {
      // Clear the promise after completion so we can fetch a new one if needed
      csrfTokenPromise = null;
    }
  })();

  return csrfTokenPromise;
}

function requiresCsrfToken(method: string): boolean {
  return !SAFE_METHODS.has(method.toUpperCase());
}

// Request interceptor to add CSRF tokens to state-changing requests
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    if (requiresCsrfToken(config.method || "GET")) {
      // Fetch CSRF token if we don't have one cached
      if (!cachedCsrfToken) {
        try {
          await fetchCsrfToken();
        } catch (error) {
          // If CSRF token fetch fails, still proceed - the backend will return 403
          // which we can handle in the response interceptor
          console.warn("Failed to fetch CSRF token:", error);
        }
      }

      // Add CSRF token to request header if we have one
      if (cachedCsrfToken) {
        config.headers = config.headers || {};
        config.headers["x-csrf-token"] = cachedCsrfToken;
      }
    }

    return config;
  },
  (error: unknown) => {
    return Promise.reject(error instanceof Error ? error : new Error("Request error"));
  },
);

// Response interceptor to handle CSRF token errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: unknown) => {
    // If we get a CSRF error, try to fetch a new token and retry once
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data as unknown;
      const errorCode =
        responseData && typeof responseData === "object" && "error" in responseData
          ? (responseData as { error?: { code?: string } }).error?.code
          : undefined;

      if (
        error.response?.status === 403 &&
        (errorCode === "CSRF_TOKEN_INVALID" || errorCode === "FORBIDDEN")
      ) {
        // Clear cached token
        cachedCsrfToken = null;
        csrfTokenPromise = null;

        // Fetch new token
        try {
          await fetchCsrfToken();
          // Retry the original request
          const config = error.config;
          if (config && cachedCsrfToken) {
            config.headers = config.headers || {};
            config.headers["x-csrf-token"] = cachedCsrfToken;
            return apiClient.request(config);
          }
        } catch {
          // If retry fails, return the original error
          return Promise.reject(error);
        }
      }

      return Promise.reject(error);
    }

    return Promise.reject(error instanceof Error ? error : new Error("Request failed"));
  },
);

// Translation types
export interface Translation {
  id: string;
  namespace: string;
  key_path: string;
  language: string;
  value: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TranslationListResponse {
  data: Translation[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// Contact message types
export interface ContactMessage {
  id: string;
  userId: string | null;
  email: string;
  topic: string;
  message: string;
  createdAt: string;
  readAt: string | null;
  readByUserId: string | null;
  respondedAt: string | null;
  response: string | null;
}

export interface ContactMessageListResponse {
  messages: ContactMessage[];
}

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  status: string;
  role_code: string;
  created_at: string;
  deactivated_at?: string | null;
  avatar_url?: string | null;
}

export interface UserListResponse {
  users: User[];
}

// API functions
export const translationsApi = {
  list: async (params?: {
    language?: string;
    namespace?: string;
    search?: string;
    keyPath?: string;
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
  }) => {
    const response = await apiClient.get<TranslationListResponse>("/api/v1/translations", {
      params,
    });
    return response.data;
  },
  create: async (data: {
    namespace: string;
    key_path: string;
    language: string;
    value: string;
  }) => {
    const response = await apiClient.post<Translation>("/api/v1/translations", data);
    return response.data;
  },
  update: async (language: string, namespace: string, keyPath: string, data: { value: string }) => {
    const encodedKeyPath = encodeURIComponent(keyPath.replace(/\./g, "%2E"));
    const response = await apiClient.put<Translation>(
      `/api/v1/translations/${language}/${namespace}/${encodedKeyPath}`,
      data,
    );
    return response.data;
  },
  delete: async (language: string, namespace: string, keyPath: string) => {
    const encodedKeyPath = encodeURIComponent(keyPath.replace(/\./g, "%2E"));
    await apiClient.delete(`/api/v1/translations/${language}/${namespace}/${encodedKeyPath}`);
  },
};

export const messagesApi = {
  list: async (params?: {
    limit?: number;
    offset?: number;
    unreadOnly?: boolean;
    openOnly?: boolean;
  }) => {
    // Convert boolean to string for query params (backend expects "true"/"false" string)
    const queryParams = params
      ? {
          ...params,
          unreadOnly: params.unreadOnly ? "true" : undefined,
          openOnly: params.openOnly ? "true" : undefined,
        }
      : undefined;
    const response = await apiClient.get<{ success: boolean; data: ContactMessage[] }>(
      "/api/v1/contact/messages",
      {
        params: queryParams,
      },
    );
    return { messages: response.data.data };
  },
  markRead: async (messageId: string) => {
    await apiClient.post(`/api/v1/contact/messages/${messageId}/read`);
  },
  markResponded: async (messageId: string) => {
    await apiClient.post(`/api/v1/contact/messages/${messageId}/responded`);
  },
  saveResponse: async (messageId: string, response: string) => {
    const response_data = await apiClient.post<{ success: boolean; data: ContactMessage }>(
      `/api/v1/contact/messages/${messageId}/response`,
      { response },
    );
    return response_data.data.data;
  },
};

export const usersApi = {
  search: async (query: string, limit = 20, blacklisted?: boolean) => {
    const response = await apiClient.get<{
      users: Array<{
        id: string;
        username: string;
        email: string;
        roleCode: string;
        status: string;
        createdAt: string;
        deactivatedAt: string | null;
        avatarUrl: string | null;
      }>;
    }>("/api/v1/admin/users/search", {
      params: {
        q: query,
        limit,
        blacklisted: blacklisted !== undefined ? String(blacklisted) : undefined,
      },
    });
    // Convert roleCode (camelCase from backend) to role_code (snake_case for frontend)
    return {
      users: response.data.users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.username, // Fallback since backend doesn't return display_name
        role_code: user.roleCode,
        status: user.status,
        created_at: user.createdAt,
        deactivated_at: user.deactivatedAt,
        avatar_url: user.avatarUrl,
      })),
    };
  },
  action: async (
    userId: string,
    action: "blacklist" | "unblacklist" | "delete",
    reason?: string,
  ) => {
    await apiClient.post(`/api/v1/admin/users/${userId}/action`, { action, reason });
  },
  changeRole: async (userId: string, role: string, reason?: string) => {
    await apiClient.post(`/api/v1/admin/users/${userId}/role`, { role, reason });
  },
  sendVerificationEmail: async (userId: string) => {
    await apiClient.post(`/api/v1/admin/users/${userId}/send-verification-email`);
  },
  sendPasswordReset: async (userId: string) => {
    await apiClient.post(`/api/v1/admin/users/${userId}/send-password-reset`);
  },
  deleteAvatar: async (userId: string, reason?: string) => {
    await apiClient.delete(`/api/v1/admin/users/${userId}/avatar`, { data: { reason } });
  },
};

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post<{
      user: { id: string; username: string; email: string; role: string };
    }>("/api/v1/auth/login", { email, password });
    return response.data;
  },
  logout: async () => {
    await apiClient.post("/api/v1/auth/logout");
  },
  me: async () => {
    // Use /api/v1/users/me endpoint which returns UserDetail directly
    const response = await apiClient.get<{
      id: string;
      username: string;
      primaryEmail: string | null;
      role: string;
    }>("/api/v1/users/me");
    // Transform to match the expected format
    return {
      user: {
        id: response.data.id,
        username: response.data.username,
        email: response.data.primaryEmail || "",
        role: response.data.role,
      },
    };
  },
};
