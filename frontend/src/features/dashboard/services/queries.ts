import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
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
  family: (familyId?: string) => [...dashboardKeys.all, "family", familyId] as const,
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

// 7. Family Workspace Query & CRUD mutations
export function useFamilyQuery(familyId?: string) {
  return useQuery({
    queryKey: dashboardKeys.family(familyId),
    queryFn: async (): Promise<FamilyResponseDto> => {
      const response = await api.get<FamilyResponseDto>(`/v1/families/${familyId}`);
      return response.data;
    },
    enabled: !!familyId,
  });
}

export function useUpdateFamilyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ familyId, payload }: { familyId: string; payload: { name: string } }): Promise<FamilyResponseDto> => {
      const response = await api.patch<FamilyResponseDto>(`/v1/families/${familyId}`, payload);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.families() });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.family(variables.familyId) });
    },
  });
}

export function useDeleteFamilyMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (familyId: string): Promise<void> => {
      await api.delete(`/v1/families/${familyId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.families() });
    },
  });
}

export interface FamilyOverview extends FamilyResponseDto {
  memberCount: number;
  documentCount: number;
  readinessScore: number | null;
  members: FamilyMemberResponseDto[];
  documents: DocumentResponseDto[];
  assessments: ReadinessAssessmentResponseDto[];
}

export function useFamiliesOverviewQuery(options?: { enabled?: boolean }) {
  const familiesQuery = useFamiliesQuery(options);
  const families = useMemo(() => familiesQuery.data || [], [familiesQuery.data]);

  const membersQueries = useQueries({
    queries: families.map((family) => ({
      queryKey: dashboardKeys.members(family.id),
      queryFn: async (): Promise<FamilyMemberResponseDto[]> => {
        const response = await api.get<FamilyMemberResponseDto[]>(`/v1/families/${family.id}/members`);
        return response.data;
      },
      enabled: !!family.id && (options?.enabled ?? true),
    })),
  });

  const documentsQueries = useQueries({
    queries: families.map((family) => ({
      queryKey: dashboardKeys.documents(family.id),
      queryFn: async (): Promise<DocumentResponseDto[]> => {
        const response = await api.get<DocumentResponseDto[]>(`/v1/families/${family.id}/documents`);
        return response.data;
      },
      enabled: !!family.id && (options?.enabled ?? true),
    })),
  });

  const assessmentsQueries = useQueries({
    queries: families.map((family) => ({
      queryKey: dashboardKeys.assessments(family.id),
      queryFn: async (): Promise<{ data: ReadinessAssessmentResponseDto[] }> => {
        const response = await api.get<{ data: ReadinessAssessmentResponseDto[] }>(`/v1/families/${family.id}/assessments`);
        return response.data;
      },
      enabled: !!family.id && (options?.enabled ?? true),
    })),
  });

  const isOverviewLoading =
    familiesQuery.isLoading ||
    membersQueries.some((q) => q.isLoading) ||
    documentsQueries.some((q) => q.isLoading) ||
    assessmentsQueries.some((q) => q.isLoading);

  const overviewError =
    familiesQuery.error ||
    membersQueries.find((q) => q.error)?.error ||
    documentsQueries.find((q) => q.error)?.error ||
    assessmentsQueries.find((q) => q.error)?.error;

  const data = useMemo((): FamilyOverview[] => {
    if (families.length === 0) return [];
    return families.map((family, idx) => {
      const members = membersQueries[idx]?.data || [];
      const documents = documentsQueries[idx]?.data || [];
      const assessmentsRes = assessmentsQueries[idx]?.data;
      const assessments = assessmentsRes?.data || [];

      // Calculate readiness score
      const scored = assessments.filter(
        (a) => a.readinessScore !== undefined && a.readinessScore !== null
      );
      const readinessScore =
        scored.length > 0
          ? Math.round(
              scored.reduce((acc, curr) => acc + (curr.readinessScore || 0), 0) / scored.length
            )
          : null;

      return {
        ...family,
        memberCount: members.length,
        documentCount: documents.length,
        readinessScore,
        members,
        documents,
        assessments,
      };
    });
  }, [families, membersQueries, documentsQueries, assessmentsQueries]);

  return {
    data,
    isLoading: isOverviewLoading,
    error: overviewError,
    refetch: async () => {
      await familiesQuery.refetch();
    },
  };
}

// 8. Family Member CRUD queries & mutations
export function useFamilyMemberQuery(familyId?: string, memberId?: string) {
  return useQuery({
    queryKey: [...dashboardKeys.members(familyId), memberId],
    queryFn: async (): Promise<FamilyMemberResponseDto> => {
      const response = await api.get<FamilyMemberResponseDto>(`/v1/families/${familyId}/members/${memberId}`);
      return response.data;
    },
    enabled: !!familyId && !!memberId,
  });
}

export function useCreateFamilyMemberMutation(familyId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      fullName: string;
      relationship?: string;
      dateOfBirth?: Date | null;
      primaryEmail?: string | null;
      primaryPhone?: string | null;
    }): Promise<FamilyMemberResponseDto> => {
      const response = await api.post<FamilyMemberResponseDto>(`/v1/families/${familyId}/members`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.members(familyId) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.families() });
    },
  });
}

export function useUpdateFamilyMemberMutation(familyId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      payload,
    }: {
      memberId: string;
      payload: {
        fullName?: string;
        relationship?: string;
        dateOfBirth?: Date | null;
        primaryEmail?: string | null;
        primaryPhone?: string | null;
      };
    }): Promise<FamilyMemberResponseDto> => {
      const response = await api.patch<FamilyMemberResponseDto>(
        `/v1/families/${familyId}/members/${memberId}`,
        payload
      );
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.members(familyId) });
      queryClient.invalidateQueries({ queryKey: [...dashboardKeys.members(familyId), variables.memberId] });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.families() });
    },
  });
}

export function useDeleteFamilyMemberMutation(familyId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string): Promise<void> => {
      await api.delete(`/v1/families/${familyId}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.members(familyId) });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.families() });
    },
  });
}


