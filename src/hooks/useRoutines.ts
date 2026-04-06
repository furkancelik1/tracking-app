"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ApiResponse } from "@/types";

export type RoutineWithMeta = {
  id: string;
  title: string;
  description: string | null;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY";
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  logs: { id: string; completedAt: string }[];
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
  });
}

export function useCreateRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      title: string;
      description?: string;
      frequency: "DAILY" | "WEEKLY" | "MONTHLY";
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
      toast.success("Rutin oluşturuldu.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useToggleRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      completed,
    }: {
      id: string;
      completed: boolean;
    }) => {
      const res = await fetch(`/api/v1/routines/${id}/logs`, {
        method: completed ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json: ApiResponse<unknown> = await res.json();
      if (!json.success) throw new Error((json as any).error);
    },
    onSuccess: (_, { completed }) => {
      void qc.invalidateQueries({ queryKey: ROUTINES_KEY });
      toast.success(completed ? "Tamamlama geri alındı." : "Rutin tamamlandı!");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useDeleteRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/routines/${id}`, { method: "DELETE" });
      const json: ApiResponse<null> = await res.json();
      if (!json.success) throw new Error((json as any).error);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ROUTINES_KEY });
      toast.success("Rutin silindi.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
