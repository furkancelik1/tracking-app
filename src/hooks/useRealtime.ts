"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase";
import type { RealtimeEvent } from "@/types";

type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

type UseRealtimeOptions = {
  channel: string;
  event?: string;
  onMessage: (payload: RealtimeEvent) => void;
  enabled?: boolean;
};

/**
 * Subscribes to a Supabase Broadcast channel.
 * Handles subscribe / unsubscribe lifecycle automatically.
 *
 * @param channel - Channel name (use REALTIME_CHANNELS factory)
 * @param event   - Broadcast event name to listen to (default: "*")
 * @param onMessage - Callback for incoming messages
 * @param enabled - Pause subscription when false (e.g. unauthenticated)
 */
export function useRealtime({
  channel: channelName,
  event = "*",
  onMessage,
  enabled = true,
}: UseRealtimeOptions): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("disconnected");
      return;
    }

    setStatus("connecting");
    const supabase = getBrowserSupabaseClient();

    if (!supabase) {
      setStatus("disconnected");
      return;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "broadcast",
        { event },
        (msg: { payload?: unknown }) => {
          onMessageRef.current(msg.payload as RealtimeEvent);
        }
      )
      .subscribe((s) => {
        if (s === "SUBSCRIBED") setStatus("connected");
        else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") setStatus("error");
        else if (s === "CLOSED") setStatus("disconnected");
      });

    return () => {
      void supabase!.removeChannel(channel);
    };
  }, [channelName, event, enabled]);

  return status;
}
