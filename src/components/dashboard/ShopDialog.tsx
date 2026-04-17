"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Coins, Snowflake, ShoppingBag, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { getShopData, buyItem } from "@/actions/shop.actions";

type ShopItem = {
  id: string;
  name: string;
  type: string;
  price: number;
  description: string | null;
  icon: string | null;
  owned: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ITEM_ICONS: Record<string, React.ReactNode> = {
  STREAK_FREEZE: <Snowflake className="h-8 w-8 text-[#D6FF00]" aria-hidden />,
};

export function ShopDialog({ open, onOpenChange }: Props) {
  const t = useTranslations("shop");
  const [coins, setCoins] = useState(0);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const loadShop = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getShopData();
      setCoins(data.coins);
      setItems(data.items);
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (open) loadShop();
  }, [open, loadShop]);

  async function handleBuy(itemId: string) {
    setBuyingId(itemId);
    try {
      const result = await buyItem(itemId);
      if (result.success) {
        setCoins(result.coins);
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId ? { ...item, owned: item.owned + 1 } : item
          )
        );
        toast.success(t("purchaseSuccess"));
        window.dispatchEvent(new CustomEvent("coins-updated"));
      } else if (result.message === "NOT_ENOUGH_COINS") {
        toast.error(t("notEnoughCoins"));
      } else {
        toast.error(t("purchaseFailed"));
      }
    } catch {
      toast.error(t("purchaseFailed"));
    } finally {
      setBuyingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex min-h-0 flex-col gap-4 border border-white/10 bg-zinc-950 sm:max-w-md">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 font-black uppercase tracking-tight text-white">
            <ShoppingBag className="h-5 w-5 text-[#D6FF00]" aria-hidden />
            {t("title")}
          </DialogTitle>
          <DialogDescription className="text-zinc-500">{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#D6FF00]/25 bg-[#D6FF00]/8 p-3 shadow-[inset_0_0_0_1px_rgba(214,255,0,0.08)]">
          <Coins className="h-5 w-5 text-[#D6FF00]" aria-hidden />
          <span className="text-lg font-black tabular-nums text-[#D6FF00]">
            {coins.toLocaleString("en-US")}
          </span>
          <span className="text-sm text-zinc-500">{t("coins")}</span>
        </div>

        <Separator className="shrink-0 bg-white/10" />

        {loading ? (
          <div className="flex min-h-[120px] items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[#D6FF00]" aria-hidden />
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[120px] flex-col items-center justify-center py-8 text-center">
            <Package className="mb-2 h-10 w-10 text-zinc-600" aria-hidden />
            <p className="text-sm text-zinc-500">{t("emptyShop")}</p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-black/30 p-3 transition-colors hover:border-[#D6FF00]/15 hover:bg-white/[0.03]"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-zinc-900/80">
                  {ITEM_ICONS[item.type] ?? <Package className="h-8 w-8 text-zinc-500" aria-hidden />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{t(`items.${item.type}.name`)}</span>
                    {item.owned > 0 && (
                      <Badge
                        variant="secondary"
                        className="border border-white/10 bg-zinc-900 text-xs text-zinc-400"
                      >
                        {t("owned", { count: item.owned })}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                    {t(`items.${item.type}.description`)}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1 text-sm font-semibold tabular-nums text-[#D6FF00]">
                    <Coins className="h-3.5 w-3.5" aria-hidden />
                    {item.price}
                  </div>
                  <Button
                    size="sm"
                    variant={coins >= item.price ? "default" : "outline"}
                    disabled={coins < item.price || buyingId === item.id}
                    onClick={() => handleBuy(item.id)}
                    className={
                      coins >= item.price
                        ? "h-7 bg-[#D6FF00] px-3 text-xs font-bold text-black hover:bg-[#c8f000]"
                        : "h-7 border-white/15 px-3 text-xs text-zinc-400"
                    }
                  >
                    {buyingId === item.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    ) : (
                      t("buy")
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
