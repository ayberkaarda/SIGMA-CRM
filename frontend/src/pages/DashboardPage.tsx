// Gösterge paneli — Faz 11. KPI kartları satırı, satış hunisi, gelir trendi, son aktiviteler ve
// görev özeti; tek bir tarih aralığı seçici tüm bileşenleri besler (görev tanımı §ÜRETECEKLERİN).
// `useDashboardSocket` burada çağrılır: dashboard sorguları yalnızca bu sayfa mount'luyken
// abone kalır, sayfadan ayrılınca `echo.leave()` ile bırakılır (diğer canlılık kancalarıyla aynı
// desen, bkz. `features/dashboard/hooks/useDashboardSocket.ts`).
import { useState } from 'react'
import { Card, CardBody, CardHeader, Tab, TabList, Tabs } from '../components/ui'
import {
  KpiCardGrid,
  RecentActivities,
  RevenueTrendChart,
  SalesFunnel,
  TaskSummary,
  useDashboardFunnel,
  useDashboardKpis,
  useDashboardRecentActivities,
  useDashboardRevenueTrend,
  useDashboardSocket,
  useDashboardTaskSummary,
} from '../features/dashboard'
import type { RevenueTrendGroupBy } from '../features/dashboard'
import { DateRangeFilter, defaultDateRange } from '../features/reports'

export function DashboardPage() {
  useDashboardSocket()

  const [dateRange, setDateRange] = useState(defaultDateRange)
  const [groupBy, setGroupBy] = useState<RevenueTrendGroupBy>('day')

  const kpisResult = useDashboardKpis(dateRange)
  const funnelResult = useDashboardFunnel(dateRange)
  const revenueTrendResult = useDashboardRevenueTrend(dateRange, groupBy)
  const recentActivitiesResult = useDashboardRecentActivities(10)
  const taskSummaryResult = useDashboardTaskSummary()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-fg">Dashboard</h1>
        <DateRangeFilter from={dateRange.from} to={dateRange.to} onChange={setDateRange} />
      </div>

      <KpiCardGrid kpis={kpisResult.data?.data} isLoading={kpisResult.isLoading} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader
            title="Gelir Trendi"
            subtitle="Seçili aralıkta kazanılan anlaşmaların geliri"
            action={
              <Tabs value={groupBy} onValueChange={(v) => setGroupBy(v as RevenueTrendGroupBy)} variant="segment">
                <TabList>
                  <Tab value="day">Gün</Tab>
                  <Tab value="week">Hafta</Tab>
                  <Tab value="month">Ay</Tab>
                </TabList>
              </Tabs>
            }
          />
          <CardBody>
            <RevenueTrendChart points={revenueTrendResult.data?.data} isLoading={revenueTrendResult.isLoading} groupBy={groupBy} />
          </CardBody>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Satış Hunisi" subtitle="Aşama başına açık fırsat tutarı" />
          <CardBody>
            <SalesFunnel stages={funnelResult.data?.data} isLoading={funnelResult.isLoading} />
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="min-w-0 lg:col-span-2">
          <CardHeader title="Son Aktiviteler" />
          <CardBody>
            <RecentActivities activities={recentActivitiesResult.data?.data} isLoading={recentActivitiesResult.isLoading} />
          </CardBody>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Görev Özeti" />
          <CardBody>
            <TaskSummary summary={taskSummaryResult.data?.data} isLoading={taskSummaryResult.isLoading} />
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
