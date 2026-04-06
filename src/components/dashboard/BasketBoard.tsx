"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { BasketItemCard } from "@/components/dashboard/BasketItemCard";
import { useBasket, useBasketAction, useRemoveFromBasket } from "@/hooks/useBasket";
import { useRealtime } from "@/hooks/useRealtime";
import { useAuth } from "@/hooks/useAuth";
import { REALTIME_CHANNELS } from "@/lib/supabase";
import type { BasketItemWithCard } from "@/types";

type Props = { initialItems: BasketItemWithCard[] };

const BASKET_KEY = ["basket"];

export function BasketBoard({ initialItems }: Props) {
  const auth = useAuth();
  const qc = useQueryClient();

  // Populate cache with SSR data so the first render is instant
  const { data: items = initialItems, isLoading } = useBasket();
  const action = useBasketAction();
  const remove = useRemoveFromBasket();

  // Supabase Realtime — invalidate TanStack Query cache on any basket update
  useRealtime({
    channel:
      auth.status === "authenticated"
        ? REALTIME_CHANNELS.userBasket(auth.user.id)
        : "noop",
    event: "BASKET_UPDATED",
    onMessage: () => {
      void qc.invalidateQueries({ queryKey: BASKET_KEY });
    },
    enabled: auth.status === "authenticated",
  });

  if (isLoading && items.length === 0) return <BasketSkeleton />;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <p className="text-muted-foreground">Your basket is empty.</p>
        <Button asChild>
          <Link href="/catalogue">Browse Catalogue</Link>
        </Button>
      </div>
    );
  }

  const grouped: Record<"ACTIVE" | "PENDING" | "COMPLETED", BasketItemWithCard[]> = {
    ACTIVE: items.filter((i) => i.status === "ACTIVE"),
    PENDING: items.filter((i) => i.status === "PENDING"),
    COMPLETED: items.filter((i) => i.status === "COMPLETED"),
  };

  const isPending = action.isPending || remove.isPending;

  return (
    <div className="space-y-8">
      {(["ACTIVE", "PENDING", "COMPLETED"] as const).map((status) => {
        const group = grouped[status];
        if (group.length === 0) return null;

        return (
          <section key={status} className="space-y-3">
            <SectionHeader status={status} count={group.length} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.map((item) => (
                <BasketItemCard
                  key={item.id}
                  item={item}
                  disabled={isPending}
                  onAction={(a) => action.mutate({ id: item.id, action: a })}
                  onRemove={() => remove.mutate(item.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

const STATUS_META = {
  ACTIVE: { label: "Active", dot: "bg-blue-500" },
  PENDING: { label: "Pending", dot: "bg-zinc-400" },
  COMPLETED: { label: "Completed", dot: "bg-green-500" },
} as const;

function SectionHeader({
  status,
  count,
}: {
  status: keyof typeof STATUS_META;
  count: number;
}) {
  const { label, dot } = STATUS_META[status];
  return (
    <div className="flex items-center gap-2">
      <span className={`size-2 rounded-full ${dot}`} />
      <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
        {label} ({count})
      </h2>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function BasketSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-4 space-y-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-1.5 w-full mt-1" />
          <Skeleton className="h-8 w-full mt-2" />
        </Card>
      ))}
    </div>
  );
}
