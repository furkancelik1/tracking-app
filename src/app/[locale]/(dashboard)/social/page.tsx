import React, { Suspense } from "react";
import {
  getFollowersAction,
  getFollowingAction,
  getPendingRequestsAction,
  getFriendsAction,
  getSocialActivityFeedAction,
} from "@/actions/social.actions";
import { getChallengesAction, getCompletedChallengesAction, distributeChallengeRewards } from "@/actions/challenge.actions";
import { getActiveDuelAction, checkAndFinalizeDuels, getPendingPrivateDuel } from "@/actions/duel.actions";
import { UserSearch } from "@/components/dashboard/UserSearch";
import { SocialTabs } from "@/components/dashboard/SocialTabs";
import { ConnectionList } from "@/components/dashboard/ConnectionList";
import { ActiveChallenges } from "@/components/dashboard/ActiveChallenges";
import { ChallengeHistory } from "@/components/dashboard/ChallengeHistory";
import ChallengeRewardToast from "@/components/dashboard/ChallengeRewardToast";
import { DuelArena } from "@/components/dashboard/DuelArena";
import { DuelInviteDialog } from "@/components/dashboard/DuelInviteDialog";
import { CreateDuel } from "@/components/dashboard/CreateDuel";
import { DuelLiveStatus } from "@/components/dashboard/DuelLiveStatus";
import { Users } from "lucide-react";
import { ActivityFeed, ActivityFeedSkeleton } from "@/components/dashboard/ActivityFeed";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "social.metadata" });
  return { title: t("title"), description: t("description") };
}

async function SocialActivityFeedSection() {
  const items = await getSocialActivityFeedAction();
  return <ActivityFeed items={items} />;
}

export default async function SocialPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("social");

  const session = await getSession();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    redirect({ href: "/", locale });
    return null;
  }

  // Süresi dolmuş düelloları finalize et & ödülleri dağıt (sayfa yüklendiğinde)
  const pendingRewards = await distributeChallengeRewards(userId).catch(() => []);

  // Disiplin düellolarını finalize et
  const duelResults = await checkAndFinalizeDuels(userId).catch(() => []);

  const [followers, following, pendingRequests, friends, challenges, completedChallenges, activeDuel, pendingPrivateDuel] = await Promise.all([
    getFollowersAction().catch(() => []),
    getFollowingAction().catch(() => []),
    getPendingRequestsAction().catch(() => []),
    getFriendsAction().catch(() => []),
    getChallengesAction().catch(() => []),
    getCompletedChallengesAction().catch(() => []),
    getActiveDuelAction().catch(() => null),
    getPendingPrivateDuel().catch(() => null),
  ]);

  return (
    <div className="px-6 py-8 space-y-8">
      {/* Header — Nike Elite */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#D6FF00]/30 bg-[#D6FF00]/10 shadow-[0_0_28px_rgba(214,255,0,0.12)]">
          <Users className="h-5 w-5 text-[#D6FF00]" aria-hidden />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-black uppercase tracking-tight text-white">{t("pageTitle")}</h1>
          <p className="text-sm text-zinc-400">{t("pageSubtitle")}</p>
        </div>
      </div>

      {/* Ödül toastları */}
      {pendingRewards.length > 0 && <ChallengeRewardToast rewards={pendingRewards} />}

      {/* User Search */}
      <section>
        <UserSearch />
      </section>

      {/* Squad activity feed */}
      <section>
        <Suspense fallback={<ActivityFeedSkeleton />}>
          <SocialActivityFeedSection />
        </Suspense>
      </section>

      {/* Followers / Following / Requests Tabs */}
      <section>
        <SocialTabs
          followers={followers}
          following={following}
          pendingRequests={pendingRequests}
        />
      </section>

      {/* Connection List — Takip Edilenler */}
      <section>
        <ConnectionList following={following} />
      </section>

      {/* Disiplin Düellosu */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          <CreateDuel />
          <DuelInviteDialog friends={friends} />
        </div>
        {activeDuel && activeDuel.isPrivate && activeDuel.opponent && (
          <div className="mb-4">
            <DuelLiveStatus duel={activeDuel} />
          </div>
        )}
        <DuelArena duel={activeDuel} />
      </section>

      {/* Active Challenges */}
      <section>
        <ActiveChallenges challenges={challenges} friends={friends} />
      </section>

      {/* Completed Challenges History */}
      {completedChallenges.length > 0 && (
        <section>
          <ChallengeHistory challenges={completedChallenges} />
        </section>
      )}
    </div>
  );
}
