import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";
import {
  FamilyResponseDto,
  FamilyMemberResponseDto,
  DocumentResponseDto,
  ReadinessAssessmentResponseDto,
  NotificationResponseDto,
  HealthResponseDto,
} from "./types";

export const dashboardKeys = {
  all: ["dashboard"] as const,
  families: () => [...dashboardKeys.all, "families"] as const,
  members: (familyId?: string) => [...dashboardKeys.all, "members", familyId] as const,
  documents: (familyId?: string, filters?: object) => [...dashboardKeys.all, "documents", familyId, filters || {}] as const,
  assessments: (familyId?: string) => [...dashboardKeys.all, "assessments", familyId] as const,
  notifications: (familyId?: string) => [...dashboardKeys.all, "notifications", familyId] as const,
  health: () => [...dashboardKeys.all, "health"] as const,
};

// 1. Families Queries & Mutations
export function useFamiliesQuery(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: dashboardKeys.families(),
    queryFn: async (): Promise<FamilyResponseDto[]> => {
      const response = await api.get<FamilyResponseDto[]>("/v1/families");
      return response.data;
    },
    ...options,
  });
}

export function useCreateFamilyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { name: string }): Promise<FamilyResponseDto> => {
      const response = await api.post<FamilyResponseDto>("/v1/families", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.families() });
    },
  });
}

// 2. Family Members Query
export function useFamilyMembersQuery(familyId?: string) {
  return useQuery({
    queryKey: dashboardKeys.members(familyId),
    queryFn: async (): Promise<FamilyMemberResponseDto[]> => {
      const response = await api.get<FamilyMemberResponseDto[]>(`/v1/families/${familyId}/members`);
      return response.data;
    },
    enabled: !!familyId,
  });
}

// 3. Vault Documents Query
export function useDocumentsQuery(familyId?: string, filters?: { limit?: number; categoryId?: string }) {
  return useQuery({
    queryKey: dashboardKeys.documents(familyId, filters),
    queryFn: async (): Promise<DocumentResponseDto[]> => {
      const response = await api.get<DocumentResponseDto[]>(`/v1/families/${familyId}/documents`, {
        params: filters,
      });
      return response.data;
    },
    enabled: !!familyId,
  });
}

// 4. Readiness Assessments Query
interface AssessmentsResponse {
  success: boolean;
  data: ReadinessAssessmentResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export function useAssessmentsQuery(familyId?: string, options?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: dashboardKeys.assessments(familyId),
    queryFn: async (): Promise<AssessmentsResponse> => {
      const response = await api.get<AssessmentsResponse>(`/v1/families/${familyId}/assessments`, {
        params: options,
      });
      return response.data;
    },
    enabled: !!familyId,
  });
}

// 5. Notifications Query & Read Mutation
interface NotificationsResponse {
  success: boolean;
  data: NotificationResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

export function useNotificationsQuery(familyId?: string, options?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: dashboardKeys.notifications(familyId),
    queryFn: async (): Promise<NotificationsResponse> => {
      const response = await api.get<NotificationsResponse>(`/v1/families/${familyId}/notifications`, {
        params: options,
      });
      return response.data;
    },
    enabled: !!familyId,
  });
}

export function useMarkNotificationReadMutation(familyId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string): Promise<void> => {
      await api.patch(`/v1/families/${familyId}/notifications/${notificationId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.notifications(familyId) });
    },
  });
}

// 6. Public Health Check Query
export function useHealthQuery() {
  return useQuery({
    queryKey: dashboardKeys.health(),
    queryFn: async (): Promise<HealthResponseDto> => {
      // Endpoint is '/health' but globally prefixed by NestJS with 'api'
      const response = await api.get<HealthResponseDto>("/health");
      return response.data;
    },
    refetchInterval: 1000 * 30, // Poll system health every 30 seconds
  });
}
