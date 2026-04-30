"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import { useCreateRoutine } from "@/hooks/useRoutines";
import type { RoutineWithMeta } from "@/hooks/useRoutines";
import { generateCoachTip } from "@/actions/coach.actions";
import { Sparkles } from "lucide-react";
import {
  ICON_MAP,
  ICON_OPTIONS,
  COLOR_OPTIONS,
  DEFAULT_ICON,
  DEFAULT_COLOR,
} from "@/lib/routine-icons";

type FrequencyType = "DAILY" | "WEEKLY" | "SPECIFIC_DAYS";
const DAY_OPTIONS = [
  { value: 1, label: "Pzt" },
  { value: 2, label: "Sal" },
  { value: 3, label: "Çar" },
  { value: 4, label: "Per" },
  { value: 5, label: "Cum" },
  { value: 6, label: "Cmt" },
  { value: 0, label: "Paz" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  atLimit?: boolean;
  routines?: RoutineWithMeta[];
};

export function AddRoutineDialog({ open, onOpenChange, atLimit = false, routines = [] }: Props) {
  const t = useTranslations("dashboard.addRoutine");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [frequencyType, setFrequencyType] = useState<FrequencyType>("DAILY");
  const [weeklyTarget, setWeeklyTarget] = useState(3);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 3, 5]);
  const [stackParentId, setStackParentId] = useState<string>("");
  const [category, setCategory] = useState("Genel");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [icon, setIcon] = useState(DEFAULT_ICON);
  const [intensity, setIntensity] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [imageUrl, setImageUrl] = useState("");
  const [isGuided, setIsGuided] = useState(false);
  const [coachTip, setCoachTip] = useState("");

  const { mutate: createRoutine, isPending } = useCreateRoutine();
  const [isGeneratingTip, setIsGeneratingTip] = useState(false);

  async function handleGenerateTip() {
    if (!title.trim()) {
      toast.error(locale === "tr" ? "Önce rutin başlığını gir." : "Enter a routine title first.");
      return;
    }
    setIsGeneratingTip(true);
    try {
      const result = await generateCoachTip(title.trim(), intensity, locale);
      if (result.success) {
        setCoachTip(result.tip);
      } else {
        toast.error(result.error);
      }
    } finally {
      setIsGeneratingTip(false);
    }
  }

  async function handleUpgrade() {
    try {
      const res = await fetch("/api/v1/stripe/checkout", { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Checkout baÅŸlatÄ±lamadÄ±.");
        return;
      }
      window.location.href = json.data.url;
    } catch {
      toast.error("Checkout baÅŸlatÄ±lÄ±rken bir hata oluÅŸtu.");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (atLimit || !title.trim()) return;
    if (frequencyType === "SPECIFIC_DAYS" && daysOfWeek.length === 0) {
      toast.error("Belirli günler için en az bir gün seç.");
      return;
    }
    createRoutine(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        frequency: frequencyType === "DAILY" ? "DAILY" : "WEEKLY",
        frequencyType,
        weeklyTarget: frequencyType === "WEEKLY" ? weeklyTarget : 1,
        daysOfWeek: frequencyType === "SPECIFIC_DAYS" ? daysOfWeek : [],
        stackParentId: stackParentId || null,
        category: category.trim() || "Genel",
        color,
        icon,
        intensity,
        estimatedMinutes: Math.min(480, Math.max(1, estimatedMinutes || 30)),
        imageUrl: imageUrl.trim() || null,
        isGuided,
        coachTip: coachTip.trim() || null,
      },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
          setFrequencyType("DAILY");
          setWeeklyTarget(3);
          setDaysOfWeek([1, 3, 5]);
          setStackParentId("");
          setCategory("Genel");
          setColor(DEFAULT_COLOR);
          setIcon(DEFAULT_ICON);
          setIntensity("MEDIUM");
          setEstimatedMinutes(30);
          setImageUrl("");
          setIsGuided(false);
          setCoachTip("");
          onOpenChange(false);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex min-h-0 flex-col gap-4 sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {/* Preview: selected icon + color */}
            <span
              className="size-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: color + "22", color }}
            >
              {(() => {
                const Icon = ICON_MAP[icon];
                return Icon ? <Icon size={16} /> : null;
              })()}
            </span>
            {t("title")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t("description")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain py-1 pr-1">
          {atLimit && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {t("limitDescription", { max: 3 })}
            </div>
          )}
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="routine-title">{t("titleLabel")}</Label>
            <Input
              id="routine-title"
              data-testid="routine-title-input"
              placeholder={t("titlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
              autoFocus
              disabled={atLimit}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="routine-desc">{t("descriptionLabel")}</Label>
            <Input
              id="routine-desc"
              placeholder={t("descriptionPlaceholder")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              disabled={atLimit}
            />
          </div>

          {/* Performance & guidance */}
          <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {t("performanceSection")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("intensityLabel")}</Label>
                <select
                  value={intensity}
                  onChange={(e) => setIntensity(e.target.value as "LOW" | "MEDIUM" | "HIGH")}
                  disabled={atLimit}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="LOW">{t("intensityLow")}</option>
                  <option value="MEDIUM">{t("intensityMedium")}</option>
                  <option value="HIGH">{t("intensityHigh")}</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="routine-minutes">{t("estimatedMinutesLabel")}</Label>
                <Input
                  id="routine-minutes"
                  type="number"
                  min={1}
                  max={480}
                  value={estimatedMinutes}
                  onChange={(e) =>
                    setEstimatedMinutes(Math.min(480, Math.max(1, Number(e.target.value) || 1)))
                  }
                  disabled={atLimit}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="routine-image">{t("imageUrlLabel")}</Label>
              <Input
                id="routine-image"
                type="url"
                placeholder={t("imageUrlPlaceholder")}
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                disabled={atLimit}
              />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={isGuided}
                onChange={(e) => setIsGuided(e.target.checked)}
                disabled={atLimit}
                className="rounded border-input"
              />
              {t("guidedLabel")}
            </label>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="routine-coach-tip">{t("coachTipLabel")}</Label>
                <button
                  type="button"
                  onClick={handleGenerateTip}
                  disabled={atLimit || isGeneratingTip || isPending}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[#D6FF00]/30 bg-[#D6FF00]/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest text-[#D6FF00] transition-colors hover:bg-[#D6FF00]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="size-3" />
                  {isGeneratingTip
                    ? (locale === "tr" ? "Üretiliyor…" : "Generating…")
                    : (locale === "tr" ? "AI ile Oluştur" : "Generate with AI")}
                </button>
              </div>
              <textarea
                id="routine-coach-tip"
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                placeholder={t("coachTipPlaceholder")}
                value={coachTip}
                onChange={(e) => setCoachTip(e.target.value)}
                maxLength={2000}
                disabled={atLimit}
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="routine-category">{t("categoryLabel")}</Label>
            <Input
              id="routine-category"
              placeholder={t("categoryPlaceholder")}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              maxLength={50}
              disabled={atLimit}
            />
          </div>

          {/* Esnek zamanlama */}
          <div className="space-y-2">
            <Label>{t("frequencyLabel")}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { value: "DAILY", label: "Her gün" },
                { value: "WEEKLY", label: "Haftada X kez" },
                { value: "SPECIFIC_DAYS", label: "Haftanın belirli günleri" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFrequencyType(option.value as FrequencyType)}
                  disabled={atLimit}
                  className={cn(
                    "rounded-md border px-3 py-2 text-sm transition-colors",
                    frequencyType === option.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-accent"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {frequencyType === "WEEKLY" && (
            <div className="space-y-1.5">
              <Label htmlFor="routine-weekly-target">Haftada kaç kez?</Label>
              <Input
                id="routine-weekly-target"
                type="number"
                min={1}
                max={7}
                value={weeklyTarget}
                onChange={(e) => setWeeklyTarget(Math.min(7, Math.max(1, Number(e.target.value) || 1)))}
                disabled={atLimit}
              />
            </div>
          )}

          {frequencyType === "SPECIFIC_DAYS" && (
            <div className="space-y-1.5">
              <Label>Hangi günler?</Label>
              <div className="flex flex-wrap gap-2">
                {DAY_OPTIONS.map((day) => {
                  const selected = daysOfWeek.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      disabled={atLimit}
                      onClick={() =>
                        setDaysOfWeek((prev) =>
                          prev.includes(day.value)
                            ? prev.filter((d) => d !== day.value)
                            : [...prev, day.value]
                        )
                      }
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background hover:bg-accent"
                      )}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Habit stacking */}
          <div className="space-y-1.5">
            <Label htmlFor="routine-stack-parent">Şu alışkanlıktan hemen sonra (opsiyonel)</Label>
            <select
              id="routine-stack-parent"
              value={stackParentId}
              onChange={(e) => setStackParentId(e.target.value)}
              disabled={atLimit}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Bağımsız alışkanlık</option>
              {routines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>{t("colorLabel")}</Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  disabled={atLimit}
                  title={c.label}
                  className={cn(
                    "size-7 rounded-full border-2 transition-transform hover:scale-110",
                    color === c.value ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          {/* Icon */}
          <div className="space-y-2">
            <Label>{t("iconLabel")}</Label>
            <div className="grid grid-cols-8 gap-1.5">
              {ICON_OPTIONS.map((name) => {
                  const Icon = ICON_MAP[name] as LucideIcon;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setIcon(name)}
                    disabled={atLimit}
                    title={name}
                    className={cn(
                      "size-9 rounded-lg flex items-center justify-center border transition-all hover:scale-105",
                      icon === name
                        ? "border-2 shadow-sm"
                        : "border-input bg-background hover:bg-accent"
                    )}
                    style={
                      icon === name
                        ? { borderColor: color, backgroundColor: color + "18", color }
                        : undefined
                    }
                  >
                    <Icon size={16} />
                  </button>
                );
              })}
            </div>
          </div>
          </div>

          <DialogFooter className="shrink-0 border-t border-border/60 pt-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {tc("cancel")}
            </Button>
            {atLimit ? (
              <Button type="button" onClick={handleUpgrade}>
                {t("limitUpgrade")}
              </Button>
            ) : (
              <Button type="submit" disabled={isPending || !title.trim()}>
                {isPending ? t("creating") : t("create")}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
