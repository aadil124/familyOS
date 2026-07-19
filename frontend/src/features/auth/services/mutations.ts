import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import { authKeys } from "./keys";
import {
  LoginResponseDto,
  RegisterResponseDto,
} from "./types";
import { LoginDto } from "../components/LoginForm";
import { RegisterDto } from "../components/RegisterForm";

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (credentials: LoginDto): Promise<LoginResponseDto> => {
      const response = await api.post<LoginResponseDto>("/v1/auth/login", credentials);
      return response.data;
    },
    onSuccess: (data) => {
      // Pre-populate user cache with the returned user profile
      queryClient.setQueryData(authKeys.profile(), data.user);
    },
  });
}

export function useRegisterMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userData: RegisterDto): Promise<RegisterResponseDto> => {
      const response = await api.post<RegisterResponseDto>("/v1/auth/register", userData);
      return response.data;
    },
    onSuccess: (data) => {
      // Pre-populate user cache with the returned user profile
      queryClient.setQueryData(authKeys.profile(), data.user);
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<void> => {
      await api.post("/v1/auth/logout");
    },
    onSettled: () => {
      // Always invalidate the query cache on logout to clear any loaded data
      queryClient.clear();
    },
  });
}
