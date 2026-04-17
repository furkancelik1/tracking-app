"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ApiResponse } from "@/types";

export type RoutineWithMeta = {
  id: string;
  title: string;
  description: string | null;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  frequencyType: "DAILY" | "WEEKLY" | "SPECIFIC_DAYS";
  weeklyTarget: number;
  daysOfWeek: number[];
  stackParentId: string | null;
  intensity: "LOW" | "MEDIUM" | "HIGH";
  estimatedMinutes: number;
  imageUrl: string | null;
  isGuided: boolean;
  coachTip: string | null;
  isActive: boolean;
  sortOrder: number;
  category: string;
  color: string;
  icon: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Son 30 gÃ¼nÃ¼n loglarÄ± (heatmap + isCompleted hesabÄ± iÃ§in) */
  logs: { id: string; completedAt: string; note: string | null }[];
  _count: { logs: number };
};

const ROUTINES_KEY = ["routines"] as const;

async function fetchRoutines(): Promise<RoutineWithMeta[]> {
  const res = await fetch("/api/v1/routines");
  const json: ApiResponse<RoutineWithMeta[]> = await res.json();
  if (!json.success) throw new Error((json as any).error);
  return json.data;
}

export function useRoutines(initialData?: RoutineWithMeta[]) {
  return useQuery({
    queryKey: ROUTINES_KEY,
    queryFn: fetchRoutines,
    initialData,
    retry: (failureCount, error) => {
      if (error instanceof Error && /500|internal/i.test(error.message)) return false;
      return failureCount < 1;
    },
  });
}

export function useCreateRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      frequency: "DAILY" | "WEEKLY" | "MONTHLY";
      frequencyType?: "DAILY" | "WEEKLY" | "SPECIFIC_DAYS";
      weeklyTarget?: number;
      daysOfWeek?: number[];
      stackParentId?: string | null;
      category?: string;
      color?: string;
      icon?: string;
      intensity?: "LOW" | "MEDIUM" | "HIGH";
      estimatedMinutes?: number;
      imageUrl?: string | null;
      isGuided?: boolean;
      coachTip?: string | null;
    }) => {
      const res = await fetch("/api/v1/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json: ApiResponse<RoutineWithMeta> = await res.json();
      if (!json.success) throw new Error((json as any).error);
      return json.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ROUTINES_KEY });
      toast.success("Rutin oluÅŸturuldu.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

/**
 * TQ cache'ini dÄ±ÅŸarÄ±dan temizlemek iÃ§in utility.
 * RoutineList'te Server Action bittikten sonra Ã§aÄŸrÄ±lÄ±r.
 */
export function useRoutineQueryClient() {
  const qc = useQueryClient();
  return {
    invalidate: () => qc.invalidateQueries({ queryKey: ROUTINES_KEY }),
  };
}
