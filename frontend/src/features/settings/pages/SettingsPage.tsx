// Ayarlar sayfası — sekmeli kabuk. Sekme durumu URL'de tutulur (`/settings?tab=pipeline`) ki
// sayfa yenilemede kaybolmasın (bkz. görev tanımı).
//
// Tüm sekmeler `settings.manage` izni gerektirir — bu tek izin sayfa rotasında
// (`router.tsx` → `RequireAuth permission="settings.manage"`) zaten uygulanıyor, bu yüzden
// burada sekme bazlı ek bir yetki kontrolü YOK.
import { useSearchParams } from 'react-router-dom'
import { Card, CardBody, CardHeader, Tab, TabList, TabPanel, Tabs } from '../../../components/ui'
import { CompanyProfileTab } from '../components/CompanyProfileTab'
import { CustomFieldsTab } from '../components/CustomFieldsTab'
import { EmailTemplatesTab } from '../components/EmailTemplatesTab'
import { PermissionMatrixTab } from '../components/PermissionMatrixTab'
import { PipelineStagesTab } from '../components/PipelineStagesTab'

const TAB_VALUES = ['company', 'pipeline', 'custom-fields', 'email-templates', 'permissions'] as const
type TabValue = (typeof TAB_VALUES)[number]

const DEFAULT_TAB: TabValue = 'company'

function isTabValue(value: string | null): value is TabValue {
  return !!value && (TAB_VALUES as readonly string[]).includes(value)
}

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab: TabValue = isTabValue(searchParams.get('tab')) ? (searchParams.get('tab') as TabValue) : DEFAULT_TAB

  function handleTabChange(value: string) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('tab', value)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader title="Ayarlar" subtitle="Sistem genelindeki yapılandırmayı yönetin." />
        <CardBody>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabList className="mb-5 overflow-x-auto">
              <Tab value="company">Şirket Profili</Tab>
              <Tab value="pipeline">Pipeline Aşamaları</Tab>
              <Tab value="custom-fields">Özel Alanlar</Tab>
              <Tab value="email-templates">E-posta Şablonları</Tab>
              <Tab value="permissions">Rol / İzin Matrisi</Tab>
            </TabList>

            <TabPanel value="company">
              <CompanyProfileTab />
            </TabPanel>
            <TabPanel value="pipeline">
              <PipelineStagesTab />
            </TabPanel>
            <TabPanel value="custom-fields">
              <CustomFieldsTab />
            </TabPanel>
            <TabPanel value="email-templates">
              <EmailTemplatesTab />
            </TabPanel>
            <TabPanel value="permissions">
              <PermissionMatrixTab />
            </TabPanel>
          </Tabs>
        </CardBody>
      </Card>
    </div>
  )
}
