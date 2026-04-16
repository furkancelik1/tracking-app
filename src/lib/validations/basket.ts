import { z } from "zod";

export const addToBasketSchema = z.object({
  cardId: z.string().cuid("Invalid card ID"),
});

export const basketActionSchema = z.object({
  action: z.enum(["activate", "complete", "reset"]),
});

export type AddToBasketInput = z.output<typeof addToBasketSchema>;
export type BasketActionInput = z.output<typeof basketActionSchema>;
