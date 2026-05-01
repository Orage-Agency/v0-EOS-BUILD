import { requireUser } from "@/lib/auth"
import {
  getDashboardTasks,
  getKpis,
  getNudges,
  getRecentActivity,
  getScorecard,
  getUpcoming,
} from "@/lib/dashboard"
import { DashboardHeader } from "@/components/dashboard/page-header"
import { SummaryGrid } from "@/components/dashboard/summary-grid"
import { AINudgeStack } from "@/components/dashboard/ai-nudge-stack"
import { TodayPriorities } from "@/components/dashboard/today-priorities"
import { ScorecardPulse } from "@/components/dashboard/scorecard-pulse"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { Upcoming } from "@/components/dashboard/upcoming"
import { MobileHomeRedirect } from "@/components/shell/mobile-home-redirect"

export const dynamic = "force-dynamic"

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ workspace: string }>
}) {
  const { workspace } = await params
  const user = await requireUser(workspace)
  const [kpis, nudges, tasks, scorecard, activity, upcoming] = await Promise.all([
    getKpis(workspace),
    getNudges(workspace),
    getDashboardTasks(workspace, user.id),
    getScorecard(workspace),
    getRecentActivity(workspace),
    getUpcoming(workspace),
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
      <MobileHomeRedirect />
      <DashboardHeader priorityCount={priorityCount} />
      <div className="px-6 md:px-8 pt-5 pb-12">
        <SummaryGrid kpis={kpis} />

        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5">
          <div>
            <AINudgeStack nudges={nudges} />
            <TodayPriorities tasks={tasks} />
          </div>
          <div>
            <ScorecardPulse metrics={scorecard} />
            <RecentActivity rows={activity} />
            <Upcoming events={upcoming} />
          </div>
        </div>
      </div>
    </div>
  )
}
