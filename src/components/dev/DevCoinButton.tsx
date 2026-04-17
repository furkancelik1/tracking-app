"use client";

import { useState } from "react";
import { Coins, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addTestCoins } from "@/actions/dev.actions";

export function DevCoinButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const { coins } = await addTestCoins(1000);
      toast.success(`+1000 DP added — balance: ${coins.toLocaleString("en-US")}`, {
        description: "DEV MODE",
        duration: 3000,
      });
      window.dispatchEvent(new CustomEvent("coins-updated"));
    } catch {
      toast.error("Failed to add coins");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title="Add 1000 test coins (dev only)"
      className="fixed bottom-24 right-4 z-50 flex items-center gap-1.5 rounded-full border border-yellow-500/40 bg-black/80 px-3 py-1.5 text-xs font-medium text-yellow-400 shadow-lg backdrop-blur-sm transition-opacity hover:opacity-100 opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Coins className="h-3.5 w-3.5" />
      )}
      +1000 DP
    </button>
  );
}
