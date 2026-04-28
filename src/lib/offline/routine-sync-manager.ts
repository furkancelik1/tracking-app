"use client";

import { completeRoutineAction } from "@/actions/routine.actions";
import {
  getAllPendingRoutineLogs,
  removePendingRoutineLog,
  type PendingRoutineLogRecord,
} from "@/lib/offline/pending-routine-logs-idb";

function isDuplicateOrResolvedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /zaten tamamlandı|already|planlı değil|hedefin|Önce bağlı/i.test(msg);
}

export type FlushResult = { synced: number; skipped: number; failed: number };

/**
 * Kuyruktaki tamamlamaları sırayla sunucuya gönderir (completeRoutineAction).
 * Başarılı olanlar IndexedDB'den silinir.
 */
export async function flushPendingRoutineLogs(options?: {
  onProgress?: (item: PendingRoutineLogRecord, result: "ok" | "skip" | "fail") => void;
}): Promise<FlushResult> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { synced: 0, skipped: 0, failed: 0 };
  }

  const pending = await getAllPendingRoutineLogs();
  let synced = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      const tz = typeof window !== "undefined" ? new Date().getTimezoneOffset() : undefined;
      await completeRoutineAction(item.routineId, item.note ?? undefined, tz);
      await removePendingRoutineLog(item.id);
      synced++;
      options?.onProgress?.(item, "ok");
    } catch (err) {
      if (isDuplicateOrResolvedError(err)) {
        await removePendingRoutineLog(item.id);
        skipped++;
        options?.onProgress?.(item, "skip");
      } else {
        failed++;
        options?.onProgress?.(item, "fail");
      }
    }
  }

  return { synced, skipped, failed };
}

export function subscribeRoutineSync(onOnlineFlush: () => void | Promise<void>): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = () => {
    void onOnlineFlush();
  };

  window.addEventListener("online", handler);
  return () => window.removeEventListener("online", handler);
}
