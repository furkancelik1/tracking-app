"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Coins, Check, Loader2, Package } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
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

type MarketplaceData = {
  coins: number;
  equippedTheme: string | null;
  equippedFrame: string | null;
  items: MarketplaceItem[];
};

type TabValue = "all" | "THEME" | "FRAME" | "BOOSTER";

const TABS: { value: TabValue; labelKey: string }[] = [
  { value: "all", labelKey: "tabs.all" },
  { value: "THEME", labelKey: "tabs.themes" },
  { value: "FRAME", labelKey: "tabs.frames" },
  { value: "BOOSTER", labelKey: "tabs.boosters" },
];

export function MarketplaceContent({ initialData }: { initialData: MarketplaceData }) {
  const t = useTranslations("marketplace");
  const tShop = useTranslations("shop");

  const [coins, setCoins] = useState(initialData.coins);
  const [items, setItems] = useState<MarketplaceItem[]>(
    initialData.items as MarketplaceItem[]
  );
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [actionId, setActionId] = useState<string | null>(null);

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
        setItems((prev) =>
          prev.map((i) => {
            if (i.category === item.category)
              return { ...i, equipped: i.id === item.id };
            return i;
          })
        );
        const primaryColor = item.metadata?.primary ?? "#818cf8";
        const glowColor = item.metadata?.glow ?? "rgba(129,140,248,0.4)";
        toast.success(`${item.name} activated`, {
          description: item.category === "THEME" ? "Theme applied — enjoy the vibe" : "Frame equipped",
          duration: 3500,
          style: {
            borderLeft: `3px solid ${primaryColor}`,
            boxShadow: `0 0 24px ${glowColor}, 0 4px 16px rgba(0,0,0,0.4)`,
          },
        });
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
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, equipped: false } : i))
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

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      {/* ── Header: title + coin balance ── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
        </div>

        {/* Discipline Points balance */}
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
            Balance
          </span>
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-yellow-500 shrink-0" />
            <span className="text-xl font-semibold tabular-nums leading-none">
              {coins.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* ── Category filter — minimal pills ── */}
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map(({ value, labelKey }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 ${
              activeTab === value
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {/* ── Item list ── */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Package className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {filteredItems.map((item) => (
            <ItemRow
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
    </div>
  );
}

// ─── Item Row (Zen list view) ────────────────────────────────────────────────

function ItemRow({
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
  const primaryColor = item.metadata?.primary ?? "#6366f1";
  const glowColor = item.metadata?.glow;

  return (
    <div
      className={`flex items-center justify-between py-6 px-2 transition-all duration-300 ${
        item.equipped ? "neon-item-active" : ""
      }`}
    >
      {/* Left: swatch + info */}
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <div
            className="h-10 w-10 rounded-full border border-border/40"
            style={{
              background: item.metadata?.secondary
                ? `linear-gradient(135deg, ${primaryColor}, ${item.metadata.secondary})`
                : primaryColor,
              boxShadow:
                item.equipped && glowColor
                  ? `0 0 18px ${glowColor}`
                  : undefined,
            }}
          />
          {item.equipped && (
            <div
              className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: primaryColor }}
            >
              <Check className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{item.name}</span>
            {item.equipped && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{
                  backgroundColor: glowColor ?? `${primaryColor}22`,
                  color: primaryColor,
                }}
              >
                {t("equipped")}
              </span>
            )}
            {item.owned && !item.equipped && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                {t("owned")}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
            {item.description}
          </p>
        </div>
      </div>

      {/* Right: price + action */}
      <div className="flex items-center gap-4 flex-shrink-0">
        {!item.owned && (
          <div className="flex items-center gap-1 text-xs">
            <Coins className="h-3.5 w-3.5 text-yellow-500" />
            <span className="font-semibold tabular-nums">{item.price}</span>
          </div>
        )}

        {!item.owned ? (
          <Button
            size="sm"
            variant={coins >= item.price ? "default" : "outline"}
            disabled={coins < item.price || isActioning}
            onClick={onBuy}
            className="h-8 text-xs px-4 min-w-[72px]"
          >
            {isActioning ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              tShop("buy")
            )}
          </Button>
        ) : item.category === "BOOSTER" ? (
          <span className="text-xs text-muted-foreground">{t("owned")}</span>
        ) : item.equipped ? (
          <Button
            size="sm"
            variant="ghost"
            disabled={isActioning}
            onClick={onUnequip}
            className="h-8 text-xs px-4 text-muted-foreground min-w-[72px]"
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
            variant="outline"
            disabled={isActioning}
            onClick={onEquip}
            className="h-8 text-xs px-4 min-w-[72px]"
          >
            {isActioning ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              t("equip")
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
