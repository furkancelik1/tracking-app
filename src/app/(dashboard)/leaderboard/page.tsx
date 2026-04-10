import { getLeaderboard } from "@/actions/leaderboard.actions";
import { Leaderboard } from "@/components/dashboard/Leaderboard";
import { Trophy } from "lucide-react";

export const metadata = { title: "Liderlik Tablosu" };

export default async function LeaderboardPage() {
  const data = await getLeaderboard();

  return (
    <div className="px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <Trophy className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Liderlik Tablosu</h1>
          <p className="text-sm text-muted-foreground">
            Rutinlerini tamamla, XP kazan, zirveye çık!
          </p>
        </div>
      </div>

      <Leaderboard data={data} />
    </div>
  );
}
