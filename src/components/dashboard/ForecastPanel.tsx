"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useBasket } from "@/hooks/useBasket";
import { computeNextResetAt } from "@/lib/utils";
import type { BasketItemWithCard } from "@/types";

/**
 * Shows projected completion times for pending / active basket items.
 * Pure client-side calculation — no extra API calls.
 */
export function ForecastPanel() {
  const { data: items = [] } = useBasket();

  const forecast = useMemo(() => computeForecast(items), [items]);

  if (forecast.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Expected Completion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {forecast.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="truncate">{entry.title}</span>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant="outline"
                className="text-xs font-normal"
              >
                {entry.status}
              </Badge>
              <span className="text-muted-foreground tabular-nums text-xs">
                {entry.expectedAt}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Forecast calculation ─────────────────────────────────────────────────────

type ForecastEntry = {
  id: string;
  title: string;
  status: string;
  expectedAt: string;
};

function computeForecast(items: BasketItemWithCard[]): ForecastEntry[] {
  const pending = items.filter(
    (i) => i.status === "PENDING" || i.status === "ACTIVE"
  );
  if (pending.length === 0) return [];

  // Simulate sequential activation: each item starts after the previous ends
  let cursor = new Date();

  return pending.map((item) => {
    const isActive = item.status === "ACTIVE" && item.nextResetAt != null;

    // Active items: completion = nextResetAt (already running)
    // Pending items: activation starts at cursor, completes after duration
    const completionDate = isActive
      ? new Date(item.nextResetAt!)
      : computeNextResetAt(item.card.resetType, item.card.duration);

    // Advance cursor for next pending item
    if (!isActive) {
      cursor = new Date(cursor.getTime() + item.card.duration * 1000);
    }

    return {
      id: item.id,
      title: item.card.title,
      status: item.status,
      expectedAt: formatExpectedTime(completionDate),
    };
  });
}

function formatExpectedTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs <= 0) return "Now";
  if (diffMs < 60_000) return "< 1m";

  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 60) return `in ${diffMin}m`;

  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
}
