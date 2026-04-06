"use client";

// Realtime hook — reserved for future use (currently unused)
// Left as a no-op stub to avoid import errors from any remaining references.

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export function useRealtime(): ConnectionStatus {
  return "disconnected";
}
