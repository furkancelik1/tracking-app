"use client";

import React, { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Swords, Coins, Copy, Check, Share2, Lock } from "lucide-react";
import { createPrivateDuel, joinDuelByCode } from "@/actions/duel.actions";

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_STAKE = 10;
const MAX_STAKE = 500;

// ─── Main Component ──────────────────────────────────────────────────────────

export function CreateDuel() {
  const t = useTranslations("duel");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "join">("create");

  // Create state
  const [stake, setStake] = useState("");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Join state
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [isJoinPending, startJoinTransition] = useTransition();

  const handleCreate = () => {
    const stakeNum = parseInt(stake, 10);

    if (isNaN(stakeNum) || stakeNum < MIN_STAKE || stakeNum > MAX_STAKE) {
      setError(t("errorInvalidStake", { min: MIN_STAKE, max: MAX_STAKE }));
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await createPrivateDuel({ stake: stakeNum });

      if (!result.success) {
        const errorMap: Record<string, string> = {
          INVALID_STAKE: t("errorInvalidStake", { min: MIN_STAKE, max: MAX_STAKE }),
          MAX_DUELS: t("errorMaxDuels"),
          INSUFFICIENT_COINS: t("errorInsufficientCoins"),
        };
        setError(errorMap[result.error ?? ""] ?? result.error ?? "Unknown error");
        return;
      }

      setCreatedCode(result.inviteCode ?? null);
    });
  };

  const handleCopy = async () => {
    if (!createdCode) return;
    const url = `${window.location.origin}${window.location.pathname}?duelCode=${createdCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: copy just the code
      await navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!createdCode) return;
    const url = `${window.location.origin}${window.location.pathname}?duelCode=${createdCode}`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: t("privateDuel"),
          text: t("shareInviteText", { code: createdCode }),
          url,
        });
      } catch {
        // User cancelled
      }
    }
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    setJoinError(null);

    startJoinTransition(async () => {
      const result = await joinDuelByCode({ inviteCode: joinCode.trim() });

      if (!result.success) {
        const errorMap: Record<string, string> = {
          INVALID_CODE: t("errorInvalidCode"),
          ALREADY_STARTED: t("errorAlreadyStarted"),
          ALREADY_JOINED: t("errorAlreadyJoined"),
          SELF_DUEL: t("errorSelf"),
          NOT_FRIENDS: t("errorNotFriends"),
          MAX_DUELS: t("errorMaxDuels"),
          INSUFFICIENT_COINS: t("errorInsufficientCoins"),
        };
        setJoinError(errorMap[result.error ?? ""] ?? result.error ?? "Unknown error");
        return;
      }

      setOpen(false);
      setJoinCode("");
      setJoinError(null);
      router.refresh();
    });
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) {
      // Reset state
      setStake("");
      setCreatedCode(null);
      setCopied(false);
      setError(null);
      setJoinCode("");
      setJoinError(null);
      setMode("create");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-orange-500/30 text-orange-500 hover:bg-orange-500/10"
        >
          <Lock className="size-3.5" />
          {t("privateDuel")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="size-5 text-orange-400" />
            {t("privateDuel")}
          </DialogTitle>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <button
            onClick={() => { setMode("create"); setCreatedCode(null); setError(null); }}
            className={cn(
              "flex-1 text-sm font-medium py-2 rounded-md transition-colors",
              mode === "create"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("createDuel")}
          </button>
          <button
            onClick={() => { setMode("join"); setJoinError(null); }}
            className={cn(
              "flex-1 text-sm font-medium py-2 rounded-md transition-colors",
              mode === "join"
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t("joinDuel")}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {mode === "create" ? (
            <motion.div
              key="create"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="space-y-4 pt-2"
            >
              {!createdCode ? (
                <>
                  {/* Stake input */}
                  <div className="space-y-2">
                    <Label htmlFor="private-stake" className="flex items-center gap-1.5 text-xs font-medium">
                      <Coins className="size-3.5 text-yellow-500" />
                      {t("stakeLabel")}
                    </Label>
                    <Input
                      id="private-stake"
                      type="number"
                      min={MIN_STAKE}
                      max={MAX_STAKE}
                      step={1}
                      placeholder={t("stakePlaceholder", { min: MIN_STAKE, max: MAX_STAKE })}
                      value={stake}
                      onChange={(e) => {
                        setStake(e.target.value);
                        setError(null);
                      }}
                    />
                    <p className="text-[11px] text-muted-foreground">{t("privateStakeHint")}</p>
                  </div>

                  {error && <p className="text-xs text-destructive">{error}</p>}

                  <Button
                    className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                    onClick={handleCreate}
                    disabled={isPending || !stake}
                  >
                    <Swords className="size-4 mr-1.5" />
                    {t("createDuel")}
                  </Button>
                </>
              ) : (
                /* Success — show invite code */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <div className="rounded-xl border-2 border-dashed border-orange-500/30 bg-orange-500/5 p-6 text-center space-y-3">
                    <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 border-orange-500/30">
                      {t("waitingForOpponent")}
                    </Badge>
                    <p className="text-xs text-muted-foreground">{t("shareCodeHint")}</p>
                    <div className="flex items-center justify-center gap-2">
                      <code className="text-2xl font-mono font-black tracking-[0.3em] text-orange-500">
                        {createdCode}
                      </code>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 gap-1.5"
                      onClick={handleCopy}
                    >
                      {copied ? (
                        <>
                          <Check className="size-4 text-emerald-500" />
                          {t("linkCopied")}
                        </>
                      ) : (
                        <>
                          <Copy className="size-4" />
                          {t("copyLink")}
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      className="gap-1.5"
                      onClick={handleShare}
                    >
                      <Share2 className="size-4" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="join"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-4 pt-2"
            >
              <div className="space-y-2">
                <Label htmlFor="join-code" className="text-xs font-medium">
                  {t("enterInviteCode")}
                </Label>
                <Input
                  id="join-code"
                  placeholder={t("inviteCodePlaceholder")}
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value.toUpperCase());
                    setJoinError(null);
                  }}
                  className="text-center font-mono text-lg tracking-[0.2em] uppercase"
                  maxLength={8}
                />
              </div>

              {joinError && <p className="text-xs text-destructive">{joinError}</p>}

              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
                onClick={handleJoin}
                disabled={isJoinPending || !joinCode.trim()}
              >
                <Swords className="size-4 mr-1.5" />
                {t("joinDuel")}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
