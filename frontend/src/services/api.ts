import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { TokenPairResponseDto } from "@/features/auth/services/types";

// In-memory variable to hold the short-lived access token
let memoryAccessToken: string | null = null;

// Callbacks to notify listeners (like AuthContext) when the token changes
type TokenChangeListener = (token: string | null) => void;
const listeners = new Set<TokenChangeListener>();

export const getAccessToken = () => memoryAccessToken;

export const setAccessToken = (token: string | null) => {
  memoryAccessToken = token;
  listeners.forEach((listener) => listener(token));
};

export const subscribeToTokenChanges = (listener: TokenChangeListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// SSR-safe storage helpers for Refresh Token
export const getStoredRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("familyos_refresh_token") || sessionStorage.getItem("familyos_refresh_token");
};

export const setStoredRefreshToken = (token: string | null, rememberMe: boolean = true) => {
  if (typeof window === "undefined") return;
  if (token) {
    if (rememberMe) {
      localStorage.setItem("familyos_refresh_token", token);
      sessionStorage.removeItem("familyos_refresh_token");
    } else {
      sessionStorage.setItem("familyos_refresh_token", token);
      localStorage.removeItem("familyos_refresh_token");
    }
  } else {
    localStorage.removeItem("familyos_refresh_token");
    sessionStorage.removeItem("familyos_refresh_token");
  }
};

export const getRememberMeSetting = (): boolean => {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("familyos_remember_me") === "true";
};

export const setRememberMeSetting = (val: boolean) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("familyos_remember_me", String(val));
};

// Create Axios Instance
export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // For cookie support if backend ever enables it
});

// Request Interceptor: Attach access token if present
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Token Refresh Handling Queue
let isRefreshing = false;
interface FailedRequest {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}
let failedQueue: FailedRequest[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      prom.resolve(token);
    } else {
      prom.reject(error);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Handle errors and transparent token refreshes
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;

    // Guard: Prevent infinite loops if refresh endpoint itself returns 401
    if (originalRequest?.url?.includes("/v1/auth/refresh")) {
      setAccessToken(null);
      setStoredRefreshToken(null);
      processQueue(error, null);
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized errors (session expiration)
    if (error.response?.status === 401 && originalRequest) {
      // If we are already refreshing, queue this request
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      const refreshToken = getStoredRefreshToken();
      if (!refreshToken) {
        // No refresh token available, force logout
        return Promise.reject(error);
      }

      isRefreshing = true;

      try {
        // Request token rotation from backend
        // Make call using fresh axios instance to bypass interceptors
        const response = await axios.post<TokenPairResponseDto>(
          `${api.defaults.baseURL}/v1/auth/refresh`,
          { refreshToken },
          { headers: { "Content-Type": "application/json" } }
        );

        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
        const rememberMe = getRememberMeSetting();

        // Update tokens
        setAccessToken(newAccessToken);
        setStoredRefreshToken(newRefreshToken, rememberMe);

        // Resume queued requests
        processQueue(null, newAccessToken);

        // Retry original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh token failed/expired: clear state and force logout
        setAccessToken(null);
        setStoredRefreshToken(null);
        processQueue(refreshError, null);

        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth-expired"));
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
