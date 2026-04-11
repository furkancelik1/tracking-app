"use client";

import { useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Swords,
  Check,
  Clock,
  Timer,
  Trophy,
  Zap,
  Plus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  acceptChallengeAction,
  declineChallengeAction,
  challengeCheckInAction,
  sendChallengeAction,
  type ChallengeEntry,
} from "@/actions/challenge.actions";
import type { FriendEntry } from "@/actions/social.actions";

// ─── Types ───────────────────────────────────────────────────────────────────

type Props = {
  challenges: ChallengeEntry[];
  friends: FriendEntry[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── Send Challenge Dialog ───────────────────────────────────────────────────

function SendChallengeDialog({
  friends,
  preselectedFriendId,
  preselectedFriendName,
}: {
  friends: FriendEntry[];
  preselectedFriendId?: string;
  preselectedFriendName?: string | null;
}) {
  const t = useTranslations("challenges");
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState(preselectedFriendId ?? "");
  const [routineTitle, setRoutineTitle] = useState("");
  const [duration, setDuration] = useState("7");

  const handleSend = () => {
    if (!selectedFriend || !routineTitle.trim()) return;

    startTransition(async () => {
      try {
        await sendChallengeAction({
          opponentId: selectedFriend,
          routineTitle: routineTitle.trim(),
          durationDays: Math.min(30, Math.max(1, parseInt(duration) || 7)),
        });
        toast.success(t("send"));
        setOpen(false);
        setRoutineTitle("");
        setDuration("7");
      } catch {
        toast.error("Error");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="size-3.5" />
          {t("send")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="size-5 text-indigo-400" />
            {t("send")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Opponent */}
          <div className="space-y-2">
            <Label>{t("opponent")}</Label>
            {preselectedFriendId ? (
              <p className="text-sm font-medium">{preselectedFriendName ?? "—"}</p>
            ) : (
              <select
                value={selectedFriend}
                onChange={(e) => setSelectedFriend(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">{t("selectFriend")}</option>
                {friends.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name ?? "?"}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Routine Title */}
          <div className="space-y-2">
            <Label>{t("routineLabel")}</Label>
            <Input
              value={routineTitle}
              onChange={(e) => setRoutineTitle(e.target.value)}
              placeholder="e.g. 30 Push-ups"
              maxLength={100}
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>{t("durationLabel")}</Label>
            <Input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min={1}
              max={30}
            />
          </div>

          {/* Reward info */}
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm">
            <Trophy className="size-4 text-amber-500 shrink-0" />
            <span className="text-muted-foreground">{t("reward")}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("cancelDialog")}
            </Button>
            <Button
              onClick={handleSend}
              disabled={isPending || !selectedFriend || !routineTitle.trim()}
              className="gap-1.5"
            >
              <Swords className="size-4" />
              {t("sendChallenge")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Challenge Card ──────────────────────────────────────────────────────────

function ChallengeCard({ challenge }: { challenge: ChallengeEntry }) {
  const t = useTranslations("challenges");
  const [isPending, startTransition] = useTransition();
  const [checkedIn, setCheckedIn] = useState(false);
  const [status, setStatus] = useState(challenge.status);

  const isActive = status === "ACTIVE";
  const isPendingStatus = status === "PENDING";
  const totalDays = challenge.durationDays;

  const handleAccept = () => {
    startTransition(async () => {
      try {
        await acceptChallengeAction(challenge.id);
        setStatus("ACTIVE");
        toast.success("⚔️");
      } catch {
        toast.error("Error");
      }
    });
  };

  const handleDecline = () => {
    startTransition(async () => {
      try {
        await declineChallengeAction(challenge.id);
        setStatus("DECLINED");
      } catch {
        toast.error("Error");
      }
    });
  };

  const handleCheckIn = () => {
    startTransition(async () => {
      try {
        const res = await challengeCheckInAction(challenge.id);
        if (res.alreadyCheckedIn) {
          setCheckedIn(true);
        } else {
          setCheckedIn(true);
          toast.success("✅");
        }
      } catch {
        toast.error("Error");
      }
    });
  };

  if (status === "DECLINED") return null;

  return (
    <Card className="overflow-hidden">
      {/* Status bar */}
      <div className={`h-1 ${isActive ? "bg-emerald-500" : "bg-amber-500"}`} />
      <CardContent className="pt-4 space-y-4">
        {/* Header: title + badge */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-sm">{challenge.routineTitle}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
              <Timer className="size-3" />
              {isActive
                ? t("daysLeft", { count: challenge.daysLeft })
                : t("waiting")}
            </div>
          </div>
          <Badge
            variant={isActive ? "default" : "secondary"}
            className={isActive ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30" : ""}
          >
            {isActive ? t("active") : t("waiting")}
          </Badge>
        </div>

        {/* VS Layout */}
        <div className="flex items-center justify-between gap-2">
          {/* Challenger */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Avatar className="size-8">
              <AvatarImage src={challenge.challenger.image ?? undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(challenge.challenger.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">
                {challenge.isChallenger ? t("you") : challenge.challenger.name}
              </p>
              <p className="text-lg font-bold tabular-nums text-indigo-400">
                {challenge.challengerCount}
              </p>
            </div>
          </div>

          {/* VS */}
          <div className="shrink-0 flex flex-col items-center">
            <Swords className="size-5 text-muted-foreground" />
            <span className="text-[10px] font-bold text-muted-foreground mt-0.5">
              {t("vs")}
            </span>
          </div>

          {/* Opponent */}
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">
                {!challenge.isChallenger ? t("you") : challenge.opponent.name}
              </p>
              <p className="text-lg font-bold tabular-nums text-orange-400">
                {challenge.opponentCount}
              </p>
            </div>
            <Avatar className="size-8">
              <AvatarImage src={challenge.opponent.image ?? undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(challenge.opponent.name)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Progress bar */}
        {isActive && (
          <Progress
            value={((totalDays - challenge.daysLeft) / totalDays) * 100}
            className="h-1.5"
          />
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          {isPendingStatus && !challenge.isChallenger && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleDecline}
                disabled={isPending}
                className="h-8 text-xs"
              >
                {t("decline")}
              </Button>
              <Button
                size="sm"
                onClick={handleAccept}
                disabled={isPending}
                className="h-8 text-xs gap-1"
              >
                <Swords className="size-3" />
                {t("accept")}
              </Button>
            </>
          )}
          {isActive && (
            <Button
              size="sm"
              onClick={handleCheckIn}
              disabled={isPending || checkedIn}
              variant={checkedIn ? "secondary" : "default"}
              className="h-8 text-xs gap-1"
            >
              {checkedIn ? (
                <>
                  <Check className="size-3" />
                  {t("checkedIn")}
                </>
              ) : (
                <>
                  <Zap className="size-3" />
                  {t("checkIn")}
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ActiveChallenges({ challenges, friends }: Props) {
  const t = useTranslations("challenges");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <Swords className="size-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">{t("title")}</h3>
            <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <SendChallengeDialog friends={friends} />
      </div>

      {/* Challenge Cards */}
      {challenges.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <Swords className="size-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium">{t("empty")}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("emptyDesc")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {challenges.map((c) => (
            <ChallengeCard key={c.id} challenge={c} />
          ))}
        </div>
      )}
    </div>
  );
}
