import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertDailyLog } from "@shared/routes";
import { z } from "zod";

export function useLogs() {
  return useQuery({
    queryKey: [api.logs.list.path],
    queryFn: async () => {
      const res = await fetch(api.logs.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch logs");
      return api.logs.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertDailyLog) => {
      // Ensure numeric fields are numbers (handling form string inputs)
      const payload = {
        ...data,
        cycleDay: Number(data.cycleDay),
        energyLevel: data.energyLevel ? Number(data.energyLevel) : undefined,
      };

      const res = await fetch(api.logs.create.path, {
        method: api.logs.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
           // Try to parse error details if available
           const errData = await res.json();
           throw new Error(errData.message || "Validation failed");
        }
        throw new Error("Failed to create log");
      }
      return api.logs.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.logs.list.path] });
    },
  });
}
