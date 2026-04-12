"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Coins,
  Palette,
  Frame,
  Zap,
  Check,
  ShoppingBag,
  Loader2,
  Package,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getMarketplaceItems,
  buyShopItem,
  equipItem,
  unequipItem,
} from "@/actions/shop.actions";
import { firePurchaseConfetti } from "@/lib/celebrations";

type MarketplaceItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "THEME" | "FRAME" | "BOOSTER";
  imageUrl: string | null;
  metadata: Record<string, string> | null;
  owned: boolean;
  equipped: boolean;
};

type TabValue = "all" | "THEME" | "FRAME" | "BOOSTER";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  THEME: <Palette className="h-5 w-5" />,
  FRAME: <Frame className="h-5 w-5" />,
  BOOSTER: <Zap className="h-5 w-5" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  THEME: "from-violet-500/20 to-purple-500/20 border-violet-500/30",
  FRAME: "from-sky-500/20 to-cyan-500/20 border-sky-500/30",
  BOOSTER: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
};

export function MarketplaceContent() {
  const t = useTranslations("marketplace");
  const tShop = useTranslations("shop");

  const [coins, setCoins] = useState(0);
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [equippedTheme, setEquippedTheme] = useState<string | null>(null);
  const [equippedFrame, setEquippedFrame] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [actionId, setActionId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMarketplaceItems();
      setCoins(data.coins);
      setEquippedTheme(data.equippedTheme);
      setEquippedFrame(data.equippedFrame);
      setItems(data.items as MarketplaceItem[]);
    } catch {
      toast.error(tShop("loadError"));
    } finally {
      setLoading(false);
    }
  }, [tShop]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleBuy(item: MarketplaceItem) {
    setActionId(item.id);
    try {
      const result = await buyShopItem(item.id);
      if (result.success) {
        setCoins(result.coins);
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, owned: true } : i))
        );
        toast.success(tShop("purchaseSuccess"));
        firePurchaseConfetti();
        window.dispatchEvent(new CustomEvent("coins-updated"));
      } else if (result.message === "NOT_ENOUGH_COINS") {
        toast.error(tShop("notEnoughCoins"));
      } else if (result.message === "ALREADY_OWNED") {
        toast.error(t("alreadyOwned"));
      } else {
        toast.error(tShop("purchaseFailed"));
      }
    } catch {
      toast.error(tShop("purchaseFailed"));
    } finally {
      setActionId(null);
    }
  }

  async function handleEquip(item: MarketplaceItem) {
    setActionId(item.id);
    try {
      const result = await equipItem(item.id);
      if (result.success) {
        if (item.category === "THEME") setEquippedTheme(item.id);
        else if (item.category === "FRAME") setEquippedFrame(item.id);

        setItems((prev) =>
          prev.map((i) => {
            if (i.category === item.category)
              return { ...i, equipped: i.id === item.id };
            return i;
          })
        );
        toast.success(t("equipSuccess"));
        window.dispatchEvent(new CustomEvent("theme-changed"));
      } else {
        toast.error(t("equipFailed"));
      }
    } catch {
      toast.error(t("equipFailed"));
    } finally {
      setActionId(null);
    }
  }

  async function handleUnequip(item: MarketplaceItem) {
    setActionId(item.id);
    try {
      const type = item.category as "THEME" | "FRAME";
      const result = await unequipItem(type);
      if (result.success) {
        if (type === "THEME") setEquippedTheme(null);
        else setEquippedFrame(null);

        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, equipped: false } : i
          )
        );
        toast.success(t("unequipSuccess"));
        window.dispatchEvent(new CustomEvent("theme-changed"));
      }
    } catch {
      toast.error(t("equipFailed"));
    } finally {
      setActionId(null);
    }
  }

  const filteredItems =
    activeTab === "all"
      ? items
      : items.filter((i) => i.category === activeTab);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Coin balance */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 px-4 py-2">
          <Coins className="h-5 w-5 text-yellow-500" />
          <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400 tabular-nums">
            {coins.toLocaleString()}
          </span>
          <span className="text-sm text-muted-foreground">{tShop("coins")}</span>
        </div>
      </div>

      <Separator />

      {/* Category tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
      >
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all">{t("tabs.all")}</TabsTrigger>
          <TabsTrigger value="THEME" className="gap-1.5">
            <Palette className="h-3.5 w-3.5" />
            {t("tabs.themes")}
          </TabsTrigger>
          <TabsTrigger value="FRAME" className="gap-1.5">
            <Frame className="h-3.5 w-3.5" />
            {t("tabs.frames")}
          </TabsTrigger>
          <TabsTrigger value="BOOSTER" className="gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            {t("tabs.boosters")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{t("empty")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <ShopItemCard
                  key={item.id}
                  item={item}
                  coins={coins}
                  isActioning={actionId === item.id}
                  onBuy={() => handleBuy(item)}
                  onEquip={() => handleEquip(item)}
                  onUnequip={() => handleUnequip(item)}
                  t={t}
                  tShop={tShop}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Item Card ───────────────────────────────────────────────────────────────

function ShopItemCard({
  item,
  coins,
  isActioning,
  onBuy,
  onEquip,
  onUnequip,
  t,
  tShop,
}: {
  item: MarketplaceItem;
  coins: number;
  isActioning: boolean;
  onBuy: () => void;
  onEquip: () => void;
  onUnequip: () => void;
  t: ReturnType<typeof useTranslations>;
  tShop: ReturnType<typeof useTranslations>;
}) {
  const colorClass = CATEGORY_COLORS[item.category] ?? "";
  const previewColor = item.metadata?.primary ?? "#6366f1";

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card
        className={`overflow-hidden border transition-shadow hover:shadow-lg ${
          item.equipped ? "ring-2 ring-primary" : ""
        }`}
      >
        {/* Color preview bar */}
        <div
          className="h-2 w-full"
          style={{
            background: item.metadata
              ? `linear-gradient(to right, ${item.metadata.primary ?? previewColor}, ${item.metadata.accent ?? item.metadata.secondary ?? previewColor})`
              : undefined,
          }}
        />

        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`h-10 w-10 rounded-lg bg-gradient-to-br ${colorClass} flex items-center justify-center`}
              >
                {CATEGORY_ICONS[item.category]}
              </div>
              <div>
                <h3 className="font-semibold text-sm">{item.name}</h3>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {item.description}
                </p>
              </div>
            </div>

            {/* Status badges */}
            {item.equipped && (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs gap-1">
                <Check className="h-3 w-3" />
                {t("equipped")}
              </Badge>
            )}
            {item.owned && !item.equipped && (
              <Badge variant="secondary" className="text-xs">
                {t("owned")}
              </Badge>
            )}
          </div>

          {/* Theme preview */}
          {item.category === "THEME" && item.metadata && (
            <div className="flex gap-1.5">
              {Object.values(item.metadata).map((color, i) => (
                <div
                  key={i}
                  className="h-6 flex-1 rounded-md border border-border/50"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}

          {/* Frame preview */}
          {item.category === "FRAME" && item.metadata?.gradient && (
            <div className="flex items-center justify-center py-1">
              <div
                className={`h-12 w-12 rounded-full bg-gradient-to-br ${item.metadata.gradient} p-0.5`}
              >
                <div className="h-full w-full rounded-full bg-card flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1 text-sm font-semibold text-yellow-600 dark:text-yellow-400">
              <Coins className="h-4 w-4" />
              {item.price}
            </div>

            {!item.owned ? (
              <Button
                size="sm"
                variant={coins >= item.price ? "default" : "outline"}
                disabled={coins < item.price || isActioning}
                onClick={onBuy}
                className="h-8 text-xs px-4"
              >
                {isActioning ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  tShop("buy")
                )}
              </Button>
            ) : item.category === "BOOSTER" ? (
              <Badge variant="secondary" className="text-xs">
                {t("owned")}
              </Badge>
            ) : item.equipped ? (
              <Button
                size="sm"
                variant="outline"
                disabled={isActioning}
                onClick={onUnequip}
                className="h-8 text-xs px-4"
              >
                {isActioning ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  t("unequip")
                )}
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={isActioning}
                onClick={onEquip}
                className="h-8 text-xs px-4"
              >
                {isActioning ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  t("equip")
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
