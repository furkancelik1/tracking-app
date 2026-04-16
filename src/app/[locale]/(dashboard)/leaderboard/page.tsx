import {from "react";

export const dynamic = "force-dynamic";

import { getLeaderboard } from "@/actions/leaderboard.actions";
import { getFriendsAction, getPendingRequestsAction } from "@/actions/social.actions";
import { getChallengesAction } from "@/actions/challenge.actions";
import { Leaderboard } from "@/components/dashboard/Leaderboard";
import { FriendList } from "@/components/dashboard/FriendList";
import { ActiveChallenges } from "@/components/dashboard/ActiveChallenges";
import { Trophy } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/auth";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "leaderboard.metadata" });
  return { title: t("title"), description: t("description") };
}

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("leaderboard");

  const session = await getSession();
  const isLoggedIn = !!session?.user;

  const [data, friends, pendingRequests, challenges] = await Promise.all([
    getLeaderboard(),
    isLoggedIn ? getFriendsAction().catch(() => []) : Promise.resolve([]),
    isLoggedIn ? getPendingRequestsAction().catch(() => []) : Promise.resolve([]),
    isLoggedIn ? getChallengesAction().catch(() => []) : Promise.resolve([]),
  ]);

  return (
    <div className="px-6 py-8 space-y-10">
      {/* ── Leaderboard ────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
        </div>

        <Leaderboard data={data} isLoggedIn={isLoggedIn} />
      </section>

      {/* ── Social Section (only for logged-in users) ──────────── */}
      {isLoggedIn && (
        <>
          {/* Active Challenges */}
          <section>
            <ActiveChallenges challenges={challenges} friends={friends} />
          </section>

          {/* Friend List */}
          <section>
            <FriendList
              friends={friends}
              pendingRequests={pendingRequests}
            />
          </section>
        </>
      )}
    </div>
  );
}
