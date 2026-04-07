"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCreateRoutine } from "@/hooks/useRoutines";
import {
  ICON_MAP,
  ICON_OPTIONS,
  COLOR_OPTIONS,
  DEFAULT_ICON,
  DEFAULT_COLOR,
} from "@/lib/routine-icons";

type Frequency = "DAILY" | "WEEKLY" | "MONTHLY";

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "DAILY", label: "Günlük" },
  { value: "WEEKLY", label: "Haftalık" },
  { value: "MONTHLY", label: "Aylık" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AddRoutineDialog({ open, onOpenChange }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("DAILY");
  const [category, setCategory] = useState("Genel");
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [icon, setIcon] = useState(DEFAULT_ICON);

  const { mutate: createRoutine, isPending } = useCreateRoutine();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
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
            Yeni Rutin
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-1">
          {/* Başlık */}
          <div className="space-y-1.5">
            <Label htmlFor="routine-title">Başlık</Label>
            <Input
              id="routine-title"
              placeholder="Örn: Sabah meditasyonu"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
              autoFocus
            />
          </div>

          {/* Açıklama */}
          <div className="space-y-1.5">
            <Label htmlFor="routine-desc">Açıklama (opsiyonel)</Label>
            <Input
              id="routine-desc"
              placeholder="Kısa bir not..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
          </div>

          {/* Kategori */}
          <div className="space-y-1.5">
            <Label htmlFor="routine-category">Kategori</Label>
            <Input
              id="routine-category"
              placeholder="Örn: Sağlık, Spor, Kişisel Gelişim"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              maxLength={50}
            />
          </div>

          {/* Sıklık */}
          <div className="space-y-1.5">
            <Label>Sıklık</Label>
            <div className="flex gap-2">
              {FREQUENCY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFrequency(opt.value)}
                  className={cn(
                    "flex-1 rounded-md border px-3 py-2 text-sm transition-colors",
                    frequency === opt.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background hover:bg-accent"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Renk seçici */}
          <div className="space-y-2">
            <Label>Renk</Label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
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

          {/* İkon seçici */}
          <div className="space-y-2">
            <Label>İkon</Label>
            <div className="grid grid-cols-8 gap-1.5">
              {ICON_OPTIONS.map((name) => {
                  const Icon = ICON_MAP[name] as LucideIcon;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setIcon(name)}
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
              İptal
            </Button>
            <Button type="submit" disabled={isPending || !title.trim()}>
              {isPending ? "Oluşturuluyor…" : "Oluştur"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
