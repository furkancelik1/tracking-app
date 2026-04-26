"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Snowflake, Check } from "lucide-react";
import { toast } from "sonner";
import { buyStreakFreeze } from "@/actions/shop.actions";
import { cn } from "@/lib/utils";

const VOLT = "#D6FF00";

type Props = {
  initialCoins: number;
  initialOwned: number;
  price: number;
};

export function StreakFreezeShop({ initialCoins, initialOwned, price }: Props) {
  const [coins, setCoins] = useState(initialCoins);
  const [owned, setOwned] = useState(initialOwned);
  const [isPending, setIsPending] = useState(false);
  const [justBought, setJustBought] = useState(false);

  const canAfford = coins >= price;

  async function handleBuy() {
    if (!canAfford || isPending) return;
    setIsPending(true);
    try {
      const result = await buyStreakFreeze();
      if (result.success) {
        setCoins(result.coins);
        setOwned(result.owned);
        setJustBought(true);
        setTimeout(() => setJustBought(false), 1200);
        toast.success("Satin alindi! Serin artik guvende.", {
          description: `Toplam ${result.owned} Seri Dondurucun var.`,
          duration: 4000,
        });
        window.dispatchEvent(new CustomEvent("coins-updated"));
      } else if (result.message === "NOT_ENOUGH_COINS") {
        toast.error("Yetersiz altin! Daha fazla rutin tamamla.");
      } else {
        toast.error("Satin alma basarisiz.");
      }
    } catch {
      toast.error("Bir hata olustu.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header row: label + big neon coin balance */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
            Seri Korumasi
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[10px] uppercase tracking-widest text-zinc-600">Bakiye</span>
          <div className="flex items-center gap-1.5">
            <span
              className="text-3xl font-black tabular-nums leading-none"
              style={{
                color: VOLT,
                textShadow: `0 0 20px ${VOLT}60, 0 0 40px ${VOLT}30`,
              }}
              suppressHydrationWarning
            >
              {coins.toLocaleString()}
            </span>
            <span className="text-xl" aria-label="coin">🪙</span>
          </div>
        </div>
      </div>

      {/* Streak Freeze card */}
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border p-5",
          "bg-gradient-to-br from-zinc-950 via-black to-zinc-950",
          canAfford
            ? "border-white/[0.08] hover:border-[#D6FF00]/25"
            : "border-white/[0.05]",
          "transition-colors duration-300"
        )}
      >
        {/* Radial accent glow */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            background: `radial-gradient(120% 80% at 10% 0%, ${VOLT}55 0%, transparent 55%)`,
          }}
        />

        {/* Content */}
        <div className="relative z-[1] flex items-start gap-4">
          {/* Icon box */}
          <div
            className="flex size-14 shrink-0 items-center justify-center rounded-xl ring-2 ring-white/10"
            style={{
              backgroundColor: `${VOLT}18`,
              color: VOLT,
              boxShadow: `0 0 32px ${VOLT}22`,
            }}
          >
            <ShieldCheck className="size-7" strokeWidth={2.5} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-extrabold text-base tracking-tight text-white">
                  Seri Dondurucu
                </p>
                <p className="text-[11px] uppercase tracking-widest text-zinc-500 mt-0.5">
                  Streak Freeze
                </p>
              </div>
              {owned > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#D6FF00]/30 bg-[#D6FF00]/10 px-2.5 py-1 text-xs font-bold text-[#D6FF00]">
                  <Snowflake className="size-3" />
                  {owned}x
                </span>
              )}
            </div>
            <p className="mt-2 text-sm text-zinc-400 leading-snug">
              Bir gun antrenmanı kacırırsan, serinin bozulmasını engeller.
            </p>
          </div>
        </div>

        {/* Buy row */}
        <div className="relative z-[1] mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-lg" aria-hidden="true">🪙</span>
            <span className="text-xl font-black text-white tabular-nums">{price}</span>
            <span className="text-xs text-zinc-600">altin</span>
          </div>

          <motion.button
            type="button"
            onClick={handleBuy}
            disabled={!canAfford || isPending}
            whileTap={canAfford && !isPending ? { scale: 0.95 } : undefined}
            className={cn(
              "relative overflow-hidden rounded-xl px-6 py-2.5 text-sm font-black uppercase tracking-widest",
              "min-h-[44px] transition-all duration-200",
              canAfford
                ? "bg-[#D6FF00] text-black hover:bg-[#c8f000] shadow-[0_0_20px_#D6FF0030] hover:shadow-[0_0_32px_#D6FF0050]"
                : "bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800"
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              {justBought ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="flex items-center gap-1.5"
                >
                  <Check className="size-4" />
                  Alindi!
                </motion.span>
              ) : isPending ? (
                <motion.span
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <span className="size-3.5 rounded-full border-2 border-black/30 border-t-black animate-spin inline-block" />
                  Alinıyor...
                </motion.span>
              ) : (
                <motion.span
                  key="buy"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Satin Al
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Insufficient funds hint */}
        {!canAfford && (
          <p className="relative z-[1] mt-2 text-[11px] text-zinc-700 text-right">
            {price - coins} altin daha lazim
          </p>
        )}
      </div>

      {/* Owned inventory banner */}
      {owned > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 rounded-xl border border-[#D6FF00]/15 bg-[#D6FF00]/[0.04] px-3.5 py-2.5"
        >
          <Snowflake className="size-4 text-[#D6FF00]/70 shrink-0" />
          <p className="text-sm text-zinc-400">
            <span className="font-bold text-white">{owned}</span>{" "}
            Seri Dondurucun var — serilerin guvende.
          </p>
        </motion.div>
      )}
    </div>
  );
}
