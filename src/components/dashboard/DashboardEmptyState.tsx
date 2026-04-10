import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-16 w-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-5">
        <CalendarPlus className="h-8 w-8 text-indigo-400" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">
        Henüz rutin eklemedin
      </h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">
        İlk rutinini ekleyerek takibe başla. Günlük, haftalık veya aylık
        rutinler oluşturabilirsin.
      </p>
      <Button className="mt-6" size="sm" asChild>
        <a href="/dashboard">İlk Rutinini Ekle</a>
      </Button>
    </div>
  );
}
