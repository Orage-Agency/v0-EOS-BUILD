import { requireUser } from "@/lib/auth"
import {
  getDashboardTasks,
  getKpis,
  getRecentActivity,
  getScorecard,
  getStarredTasks,
  getTeamFocus,
  getUpcoming,
} from "@/lib/dashboard"
import { listClientTagOptions } from "@/lib/client-tags"
import { DashboardHeader } from "@/components/dashboard/page-header"
import { SummaryGrid } from "@/components/dashboard/summary-grid"
import { TodayPriorities } from "@/components/dashboard/today-priorities"
import { MyStarred } from "@/components/dashboard/my-starred"
import { TeamFocus } from "@/components/dashboard/team-focus"
import { ScorecardPulse } from "@/components/dashboard/scorecard-pulse"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { Upcoming } from "@/components/dashboard/upcoming"
import { MobileAskAI } from "@/components/dashboard/mobile-ask-ai"

export const dynamic = "force-dynamic"

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const user = await requireUser(workspace)
  const [
    kpis,
    tasks,
    scorecard,
    activity,
    upcoming,
    clientTagOptions,
    starred,
    teamFocus,
  ] = await Promise.all([
    getKpis(workspace),
    getDashboardTasks(workspace, user.id),
    getScorecard(workspace),
    getRecentActivity(workspace),
    getUpcoming(workspace),
    listClientTagOptions(workspace),
    getStarredTasks(workspace, user.id, 3),
    getTeamFocus(workspace),
  ])

  // Priorities = open tasks owned by the user that are due today,
  // overdue, or due in the next 3 days.
  const todayKey = new Date().toISOString().slice(0, 10)
  const horizon = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  const priorityCount = tasks.filter(
    (t) =>
      t.status !== "done" &&
      t.status !== "cancelled" &&
      t.due &&
      t.due <= horizon &&
      (t.due >= todayKey || t.due < todayKey),
  ).length

  return (
    <div className="relative z-10">
      <DashboardHeader priorityCount={priorityCount} />
      <div className="px-4 md:px-8 pt-5 pb-28 md:pb-12">
        <SummaryGrid kpis={kpis} />

        <MyStarred tasks={starred} clientTagOptions={clientTagOptions} />

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
          <div>
            <TodayPriorities tasks={tasks} clientTagOptions={clientTagOptions} />
          </div>
          <div>
            <TeamFocus entries={teamFocus} />
            <ScorecardPulse metrics={scorecard} />
            <RecentActivity rows={activity} />
            <Upcoming events={upcoming} />
          </div>
        </div>
      </div>
      <MobileAskAI />
    </div>
  )
}
