"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ApiResponse, BasketItemWithCard } from "@/types";

const BASKET_KEY = ["basket"] as const;

async function fetchBasket(): Promise<BasketItemWithCard[]> {
  const res = await fetch("/api/v1/basket");
  const json: ApiResponse<BasketItemWithCard[]> = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export function useBasket() {
  return useQuery({
    queryKey: BASKET_KEY,
    queryFn: fetchBasket,
    refetchInterval: 30_000, // Poll every 30s as fallback for Supabase
  });
}

export function useAddToBasket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cardId: string) => {
      const res = await fetch("/api/v1/basket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });
      const json: ApiResponse<BasketItemWithCard> = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: BASKET_KEY });
      toast.success("Added to your basket.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useBasketAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: "activate" | "complete" | "reset";
    }) => {
      const res = await fetch(`/api/v1/basket/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json: ApiResponse<BasketItemWithCard> = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: (_, { action }) => {
      void qc.invalidateQueries({ queryKey: BASKET_KEY });
      const labels = {
        activate: "Timer started.",
        complete: "Marked as complete.",
        reset: "Reset to pending.",
      } as const;
      toast.success(labels[action]);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useRemoveFromBasket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/v1/basket/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(json.error ?? "Failed to remove.");
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: BASKET_KEY });
      toast.success("Removed from basket.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
