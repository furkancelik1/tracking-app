"use client";

import { useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useTimer } from "@/hooks/useTimer";
import { formatCardDuration } from "@/lib/utils";
import type { BasketItemWithCard } from "@/types";

type Props = {
  item: BasketItemWithCard;
  onAction: (action: "activate" | "complete" | "reset") => void;
  onRemove: () => void;
  disabled: boolean;
};

export function BasketItemCard({ item, onAction, onRemove, disabled }: Props) {
  const isActive = item.status === "ACTIVE";

  // Auto-reset when timer expires — fires once, triggers parent invalidation
  const handleExpire = useCallback(() => {
    onAction("reset");
  }, [onAction]);

  const timer = useTimer({
    nextResetAt: isActive ? item.nextResetAt : null,
    totalDuration: item.card.duration,
    onExpire: isActive ? handleExpire : undefined,
  });

  const showTimer = isActive && item.nextResetAt != null;

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-snug">{item.card.title}</CardTitle>
          <StatusBadge status={item.status} isExpired={timer.isExpired && showTimer} />
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {item.card.description}
        </p>
      </CardHeader>

      <CardContent className="flex-1 pb-3 space-y-2">
        {/* Card meta */}
        <div className="flex gap-3 text-xs text-muted-foreground">
          <span>{item.card.resetType === "ROLLING" ? "⏱ Rolling" : "🕛 Fixed"}</span>
          <span>·</span>
          <span>{formatCardDuration(item.card.duration)}</span>
        </div>

        {/* Live countdown + progress bar */}
        {showTimer && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Resets in</span>
              <span
                className={
                  timer.isExpired
                    ? "text-destructive font-medium"
                    : timer.secondsLeft < 300
                      ? "text-amber-500 font-medium tabular-nums"
                      : "text-foreground font-medium tabular-nums"
                }
              >
                {timer.isExpired ? "Expiring…" : timer.formatted}
              </span>
            </div>
            <Progress
              value={timer.progress * 100}
              className="h-1.5"
            />
          </div>
        )}

        {/* Completed timestamp */}
        {item.status === "COMPLETED" && item.lastActivatedAt != null && (
          <p className="text-xs text-muted-foreground">
            Completed{" "}
            {new Date(item.lastActivatedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}

        {/* Affiliate link — /go/[cardId] issues a 302 to external URL */}
        {item.card.affiliateUrl != null && (
          <a
            href={`/go/${item.card.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            View resource ↗
          </a>
        )}
      </CardContent>

      <CardFooter className="pt-0 flex gap-2">
        {item.status === "PENDING" && (
          <Button
            size="sm"
            className="flex-1"
            disabled={disabled}
            onClick={() => onAction("activate")}
          >
            Start
          </Button>
        )}

        {item.status === "ACTIVE" && (
          <>
            <Button
              size="sm"
              className="flex-1"
              disabled={disabled || timer.isExpired}
              onClick={() => onAction("complete")}
            >
              Complete
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={disabled}
              onClick={() => onAction("reset")}
            >
              Reset
            </Button>
          </>
        )}

        {item.status === "COMPLETED" && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            disabled={disabled}
            onClick={() => onAction("reset")}
          >
            Start Again
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2 shrink-0"
          disabled={disabled}
          onClick={onRemove}
          aria-label="Remove from basket"
        >
          ✕
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({
  status,
  isExpired,
}: {
  status: BasketItemWithCard["status"];
  isExpired: boolean;
}) {
  if (isExpired) {
    return <Badge variant="destructive">Expired</Badge>;
  }
  const variants: Record<
    BasketItemWithCard["status"],
    React.ReactNode
  > = {
    PENDING: <Badge variant="secondary">Pending</Badge>,
    ACTIVE: (
      <Badge className="bg-blue-500 text-white hover:bg-blue-600">Active</Badge>
    ),
    COMPLETED: (
      <Badge className="bg-green-500 text-white hover:bg-green-600">Done</Badge>
    ),
  };
  return variants[status];
}
