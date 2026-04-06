import { createAdminSupabaseClient, REALTIME_CHANNELS } from "@/lib/supabase";

export type CatalogueEvent = {
  type: "CATALOGUE_UPDATED";
  payload: { action: "created" | "updated" | "deleted"; cardId: string };
};

/**
 * Broadcasts a catalogue change to all connected clients.
 * Called after admin CUD operations on cards.
 * Fire-and-forget — never throws.
 */
export async function broadcastCatalogueUpdate(
  action: CatalogueEvent["payload"]["action"],
  cardId: string
): Promise<void> {
  try {
    const admin = createAdminSupabaseClient();
    const event: CatalogueEvent = {
      type: "CATALOGUE_UPDATED",
      payload: { action, cardId },
    };
    await admin.channel(REALTIME_CHANNELS.adminBroadcast).send({
      type: "broadcast",
      event: "CATALOGUE_UPDATED",
      payload: event,
    });
  } catch {
    // Realtime failure must never break admin operations
  }
}
