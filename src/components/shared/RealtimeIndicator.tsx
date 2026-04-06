"use client";

import { useRealtime } from "@/hooks/useRealtime";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { REALTIME_CHANNELS } from "@/lib/supabase";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Subscribes to the admin broadcast channel and shows a live
 * Supabase connection indicator in the nav bar.
 *
 * When the admin updates the catalogue, all connected users
 * instantly get the updated data without a page refresh.
 */
export function RealtimeIndicator() {
  const auth = useAuth();
  const qc = useQueryClient();

  const status = useRealtime({
    channel: REALTIME_CHANNELS.adminBroadcast,
    event: "CATALOGUE_UPDATED",
    onMessage: () => {
      void qc.invalidateQueries({ queryKey: ["catalogue"] });
    },
    enabled: auth.status === "authenticated",
  });

  const meta = {
    connecting: { color: "bg-amber-400 animate-pulse", label: "Connecting…" },
    connected: { color: "bg-green-400", label: "Live" },
    disconnected: { color: "bg-zinc-400", label: "Offline" },
    error: { color: "bg-red-400", label: "Connection error" },
  } as const;

  const { color, label } = meta[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-default">
            <span className={`size-2 rounded-full ${color}`} />
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">Realtime: {label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
