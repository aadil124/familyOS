import { useQuery } from "@tanstack/react-query";
import { api, getAccessToken } from "@/services/api";
import { authKeys } from "./keys";
import { UserResponseDto } from "./types";

export function useUserProfileQuery() {
  return useQuery({
    queryKey: authKeys.profile(),
    queryFn: async (): Promise<UserResponseDto> => {
      const response = await api.get<UserResponseDto>("/v1/auth/me");
      return response.data;
    },
    // Only execute if an access token is in memory
    enabled: !!getAccessToken(),
    staleTime: 1000 * 60 * 5, // 5 minutes profile stale time
    retry: 1,
  });
}
