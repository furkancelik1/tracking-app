import { requireAuth } from "@/lib/auth";
import { getUserBasket, expireTimers } from "@/services/basket.service";
import { BasketBoard } from "@/components/dashboard/BasketBoard";
import { ForecastPanel } from "@/components/dashboard/ForecastPanel";
import { UpgradeBanner } from "@/components/shared/UpgradeBanner";

export default async function BasketPage() {
  const session = await requireAuth();
  const userId = session.user.id;

  await expireTimers(userId);
  const items = await getUserBasket(userId);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Basket</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {items.length} action{items.length !== 1 ? "s" : ""} in your routine
        </p>
      </div>

      <UpgradeBanner />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <BasketBoard initialItems={items} />
        <aside className="space-y-4">
          <ForecastPanel />
        </aside>
      </div>
    </div>
  );
}
