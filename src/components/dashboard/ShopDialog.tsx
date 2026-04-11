"use client";

import { useState, useEffect, useCallback } from "react";
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
  STREAK_FREEZE: <Snowflake className="h-8 w-8 text-blue-400" />,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {/* Coin bakiyesi */}
        <div className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 p-3">
          <Coins className="h-5 w-5 text-yellow-500" />
          <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
            {coins.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">{t("coins")}</span>
        </div>

        <Separator />

        {/* Ürün listesi */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Package className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">{t("emptyShop")}</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50"
              >
                {/* İkon */}
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-accent/60">
                  {ITEM_ICONS[item.type] ?? <Package className="h-8 w-8 text-muted-foreground" />}
                </div>

                {/* Bilgi */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{t(`items.${item.type}.name`)}</span>
                    {item.owned > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {t("owned", { count: item.owned })}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {t(`items.${item.type}.description`)}
                  </p>
                </div>

                {/* Fiyat & satın al */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <div className="flex items-center gap-1 text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                    <Coins className="h-3.5 w-3.5" />
                    {item.price}
                  </div>
                  <Button
                    size="sm"
                    variant={coins >= item.price ? "default" : "outline"}
                    disabled={coins < item.price || buyingId === item.id}
                    onClick={() => handleBuy(item.id)}
                    className="h-7 text-xs px-3"
                  >
                    {buyingId === item.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
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
