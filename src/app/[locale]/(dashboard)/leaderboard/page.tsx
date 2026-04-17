import React, { Suspense } from "react";
import { getLeaderboard } from "@/actions/leaderboard.actions";
import { getFriendsAction, getPendingRequestsAction } from "@/actions/social.actions";
import { getChallengesAction } from "@/actions/challenge.actions";
import { Leaderboard } from "@/components/dashboard/Leaderboard";
import { FriendList } from "@/components/dashboard/FriendList";
import { ActiveChallenges } from "@/components/dashboard/ActiveChallenges";
import { Trophy } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "leaderboard.metadata" });
  return { title: t("title"), description: t("description") };
}

function LeaderboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-center gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-24 rounded-xl" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

async function LeaderboardRankingSection() {
  const session = await getSession();
  const data = await getLeaderboard();
  return <Leaderboard data={data} isLoggedIn={!!session?.user} />;
}

async function LeaderboardSocialSection() {
  const session = await getSession();
  if (!session?.user) return null;
  const [friends, pendingRequests, challenges] = await Promise.all([
    getFriendsAction().catch(() => []),
    getPendingRequestsAction().catch(() => []),
    getChallengesAction().catch(() => []),
  ]);
  return (
    <>
      <section>
        <ActiveChallenges challenges={challenges} friends={friends} />
      </section>
      <section>
        <FriendList friends={friends} pendingRequests={pendingRequests} />
      </section>
    </>
  );
}

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("leaderboard");

  return (
    <div className="space-y-8 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-8">
      <section>
        <div className="flex items-center gap-3 mb-8">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Trophy className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t("title")}</h1>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>

        <Suspense fallback={<LeaderboardSkeleton />}>
          <LeaderboardRankingSection />
        </Suspense>
      </section>

      <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-muted/40" />}>
        <LeaderboardSocialSection />
      </Suspense>
    </div>
  );
}
