import { getFollowersAction, getFollowingAction, getPendingRequestsAction } from "@/actions/social.actions";
import { getChallengesAction } from "@/actions/challenge.actions";
import { getFriendsAction } from "@/actions/social.actions";
import { UserSearch } from "@/components/dashboard/UserSearch";
import { SocialTabs } from "@/components/dashboard/SocialTabs";
import { ActiveChallenges } from "@/components/dashboard/ActiveChallenges";
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

  const [followers, following, pendingRequests, friends, challenges] = await Promise.all([
    getFollowersAction().catch(() => []),
    getFollowingAction().catch(() => []),
    getPendingRequestsAction().catch(() => []),
    getFriendsAction().catch(() => []),
    getChallengesAction().catch(() => []),
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

      {/* Active Challenges */}
      <section>
        <ActiveChallenges challenges={challenges} friends={friends} />
      </section>
    </div>
  );
}
