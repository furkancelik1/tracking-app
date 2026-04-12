import { getFollowersAction, getFollowingAction, getPendingRequestsAction } from "@/actions/social.actions";
import { getChallengesAction, getCompletedChallengesAction, distributeChallengeRewards } from "@/actions/challenge.actions";
import { getActiveDuelAction, checkAndFinalizeDuels } from "@/actions/duel.actions";
import { getFriendsAction } from "@/actions/social.actions";
import { UserSearch } from "@/components/dashboard/UserSearch";
import { SocialTabs } from "@/components/dashboard/SocialTabs";
import { ConnectionList } from "@/components/dashboard/ConnectionList";
import { ActiveChallenges } from "@/components/dashboard/ActiveChallenges";
import { ChallengeHistory } from "@/components/dashboard/ChallengeHistory";
import ChallengeRewardToast from "@/components/dashboard/ChallengeRewardToast";
import { DuelArena } from "@/components/dashboard/DuelArena";
import { DuelInviteDialog } from "@/components/dashboard/DuelInviteDialog";
import { Users } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getSession } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "social.metadata" });
  return { title: t("title"), description: t("description") };
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
  if (!session?.user) redirect({ href: "/", locale });

  const userId = (session.user as any).id as string;

  // Süresi dolmuş düelloları finalize et & ödülleri dağıt (sayfa yüklendiğinde)
  const pendingRewards = await distributeChallengeRewards(userId).catch(() => []);

  // Disiplin düellolarını finalize et
  const duelResults = await checkAndFinalizeDuels(userId).catch(() => []);

  const [followers, following, pendingRequests, friends, challenges, completedChallenges, activeDuel] = await Promise.all([
    getFollowersAction().catch(() => []),
    getFollowingAction().catch(() => []),
    getPendingRequestsAction().catch(() => []),
    getFriendsAction().catch(() => []),
    getChallengesAction().catch(() => []),
    getCompletedChallengesAction().catch(() => []),
    getActiveDuelAction().catch(() => null),
  ]);

  return (
    <div className="px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
          <Users className="h-5 w-5 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">{t("pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("pageSubtitle")}</p>
        </div>
      </div>

      {/* Ödül toastları */}
      {pendingRewards.length > 0 && <ChallengeRewardToast rewards={pendingRewards} />}

      {/* User Search */}
      <section>
        <UserSearch />
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
        <div className="flex items-center justify-between mb-4">
          <div />
          <DuelInviteDialog friends={friends} />
        </div>
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
