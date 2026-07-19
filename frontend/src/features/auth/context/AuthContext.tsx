"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  api,
  getStoredRefreshToken,
  setAccessToken,
  setStoredRefreshToken,
  setRememberMeSetting,
} from "@/services/api";
import { AuthUserResponseDto, TokenPairResponseDto, UserResponseDto, LoginCredentials, RegisterPayload } from "../services/types";
import { useLoginMutation, useRegisterMutation, useLogoutMutation } from "../services/mutations";

interface AuthContextType {
  user: UserResponseDto | AuthUserResponseDto | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials, rememberMe: boolean) => Promise<void>;
  register: (userData: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponseDto | AuthUserResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const logoutMutation = useLogoutMutation();

  // 1. Silent token refresh on initial load (restore session)
  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const storedRefreshToken = getStoredRefreshToken();
      if (!storedRefreshToken) {
        if (active) setIsLoading(false);
        return;
      }

      try {
        // Exchange refresh token for fresh pair
        const response = await axiosInstanceDirectRefresh(storedRefreshToken);
        if (!active) return;

        const { accessToken, refreshToken } = response;
        setAccessToken(accessToken);
        setStoredRefreshToken(refreshToken);

        // Fetch profile
        const userProfile = await fetchProfile(accessToken);
        if (active) {
          setUser(userProfile);
        }
      } catch (error) {
        console.error("Failed to restore auth session:", error);
        // Clear expired session tokens
        setAccessToken(null);
        setStoredRefreshToken(null);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  // 2. Interceptor Auth Expiry subscription
  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      toast.error("Session expired. Please log in again.");
      router.push("/login");
    };

    window.addEventListener("auth-expired", handleAuthExpired);
    return () => {
      window.removeEventListener("auth-expired", handleAuthExpired);
    };
  }, [router]);

  // Direct axios call to refresh to avoid triggers
  async function axiosInstanceDirectRefresh(refreshToken: string): Promise<TokenPairResponseDto> {
    const res = await api.post<TokenPairResponseDto>("/v1/auth/refresh", { refreshToken });
    return res.data;
  }

  async function fetchProfile(token: string): Promise<UserResponseDto> {
    const res = await api.get<UserResponseDto>("/v1/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  }

  const login = async (credentials: LoginCredentials, rememberMe: boolean) => {
    try {
      const result = await loginMutation.mutateAsync(credentials);
      setAccessToken(result.accessToken);
      setRememberMeSetting(rememberMe);
      setStoredRefreshToken(result.refreshToken, rememberMe);
      setUser(result.user);
      toast.success("Successfully logged in!");
      router.push("/dashboard");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const errMsg = err.response?.data?.message || "Invalid credentials. Please try again.";
      toast.error(errMsg);
      throw error;
    }
  };

  const register = async (userData: RegisterPayload) => {
    try {
      const result = await registerMutation.mutateAsync(userData);
      setAccessToken(result.accessToken);
      setRememberMeSetting(true); // Default remember me to true on registration
      setStoredRefreshToken(result.refreshToken, true);
      setUser(result.user);
      toast.success("Registration successful! Welcome to FamilyOS.");
      router.push("/dashboard");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      const errMsg = err.response?.data?.message || "Failed to register account.";
      toast.error(errMsg);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Set loading state for better visual flow
      setIsLoading(true);
      await logoutMutation.mutateAsync();
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      // Always clear local session even if api request failed
      setAccessToken(null);
      setStoredRefreshToken(null);
      setUser(null);
      setIsLoading(false);
      toast.success("Logged out successfully.");
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
