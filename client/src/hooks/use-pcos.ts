import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertPcosProfile } from "@shared/routes";
import { type PcosAnalysisRequest, type PcosAnalysisResponse } from "@shared/schema";

export function usePcosProfile() {
  return useQuery({
    queryKey: [api.pcos.getProfile.path],
    queryFn: async () => {
      const res = await fetch(api.pcos.getProfile.path, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch profile");
      return api.pcos.getProfile.responses[200].parse(await res.json());
    },
    retry: false,
  });
}

export function useAnalyzePcos() {
  return useMutation({
    mutationFn: async (data: PcosAnalysisRequest) => {
      const res = await fetch(api.pcos.analyze.path, {
        method: api.pcos.analyze.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Analysis failed");
      return api.pcos.analyze.responses[200].parse(await res.json());
    },
  });
}

export function useUpdatePcosProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertPcosProfile) => {
      const res = await fetch(api.pcos.updateProfile.path, {
        method: api.pcos.updateProfile.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) throw new Error("Failed to update profile");
      return api.pcos.updateProfile.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.pcos.getProfile.path] });
    },
  });
}

export function useDailyRecommendation() {
  return useQuery({
    queryKey: [api.recommendations.get.path],
    queryFn: async () => {
      const res = await fetch(api.recommendations.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch recommendations");
      return api.recommendations.get.responses[200].parse(await res.json());
    },
  });
}
