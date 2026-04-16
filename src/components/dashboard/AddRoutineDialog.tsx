"use client";

import { useState } from "react";
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
import { useTranslations } from "next-intl";
import { useCreateRoutine } from "@/hooks/useRoutines";
import {
  ICON_MAP,
  ICON_OPTIONS,
  COLOR_OPTIONS,
  DEFAULT_ICON,
  DEFAULT_COLOR,
} from "@/lib/routine-icons";

type Frequency = "DAILY" | "WEEKLY" | "MONTHLY";

const FREQUENCY_VALUES: Frequency[] = ["DAILY", "WEEKLY", "MONTHLY"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  atLimit?: boolean;
};

export function AddRoutineDialog({ open, onOpenChange, atLimit = false }: Props) {
  const t = useTranslations("dashboard.addRoutine");
  const tc = useTranslations("common");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("DAILY");
  const [category, setCategory] = useState("Genel");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [icon, setIcon] = useState(DEFAULT_ICON);

  const { mutate: createRoutine, isPending } = useCreateRoutine();

  async function handleUpgrade() {
    try {
      const res = await fetch("/api/v1/stripe/checkout", { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error ?? "Checkout başlatılamadı.");
        return;
      }
      window.location.href = json.data.url;
    } catch {
      toast.error("Checkout başlatılırken bir hata oluştu.");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (atLimit || !title.trim()) return;
    createRoutine(
      {
        title: title.trim(),
        description: description.trim() || undefined,
        frequency,
        category: category.trim() || "Genel",
        color,
        icon,
      },
      {
        onSuccess: () => {
          setTitle("");
          setDescription("");
          setFrequency("DAILY");
          setCategory("Genel");
          setColor(DEFAULT_COLOR);
          setIcon(DEFAULT_ICON);
          onOpenChange(false);
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {/* Önizleme: seçilen ikon + renk */}
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

        <form onSubmit={handleSubmit} className="space-y-5 py-1">
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

          {/* Frequency */}
          <div className="space-y-1.5">
            <Label>{t("frequencyLabel")}</Label>
            <div className="flex gap-2">
              {FREQUENCY_VALUES.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setFrequency(val)}
                  disabled={atLimit}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-sm transition-colors",
                    frequency === val
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-accent"
                  )}
                >
                  {t(val === "DAILY" ? "daily" : val === "WEEKLY" ? "weekly" : "monthly")}
                </button>
              ))}
            </div>
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

          <DialogFooter className="pt-1">
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
