// Uygulama kenar çubuğu — CRM modül navigasyonu.
// Menü kalıbı Figma template'inin bilgi mimarisinden DEĞİL, `PRODUCT-BRIEF.md`'deki
// modül listesinden gelir (bkz. docs/DESIGN-SYSTEM.md §8 — IA uyuşmazlığı kararı).
//
// FAZ 2 NOTU: Yalnızca "/" (Dashboard) ve "/users" gerçek bir route'a bağlı. Listedeki diğer
// linkler ileriki fazlarda eklenecek sayfalara işaret eder; şu an tıklanınca 404'e düşmeleri
// beklenen bir durumdur — route'lar bağlandıkça bu linkler otomatik çalışır hale gelecektir.
import type { ComponentType } from 'react'
import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  Building2,
  CheckSquare,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Package,
  ScrollText,
  Settings,
  Target,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { usePermission } from '../../features/auth/hooks/usePermission'

type NavItem = {
  label: string
  to: string
  permission: string
  icon: ComponentType<{ className?: string }>
  end?: boolean
}

type NavSection = {
  title: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'ANA',
    items: [{ label: 'Dashboard', to: '/', permission: 'dashboard.view', icon: LayoutDashboard, end: true }],
  },
  {
    title: 'SATIŞ',
    items: [
      { label: 'Müşteri Adayları', to: '/leads', permission: 'leads.view', icon: UserPlus },
      { label: 'Kişiler', to: '/contacts', permission: 'contacts.view', icon: Users },
      { label: 'Firmalar', to: '/companies', permission: 'companies.view', icon: Building2 },
      { label: 'Fırsatlar', to: '/deals', permission: 'deals.view', icon: Target },
      { label: 'Teklifler', to: '/quotes', permission: 'quotes.view', icon: FileText },
      { label: 'Ürünler', to: '/products', permission: 'products.view', icon: Package },
    ],
  },
  {
    title: 'ÇALIŞMA',
    items: [
      { label: 'Görevler', to: '/tasks', permission: 'tasks.view', icon: CheckSquare },
      { label: 'Destek Talepleri', to: '/tickets', permission: 'tickets.view', icon: LifeBuoy },
      { label: 'Sohbet', to: '/chat', permission: 'chat.use', icon: MessageSquare },
    ],
  },
  {
    title: 'ANALİZ',
    items: [{ label: 'Raporlar', to: '/reports', permission: 'reports.view', icon: BarChart3 }],
  },
  {
    title: 'YÖNETİM',
    items: [
      { label: 'Kullanıcılar', to: '/users', permission: 'users.view', icon: UserCog },
      { label: 'Loglar', to: '/logs', permission: 'logs.view', icon: ScrollText },
      { label: 'Ayarlar', to: '/settings', permission: 'settings.manage', icon: Settings },
    ],
  },
]

type SidebarProps = {
  collapsed: boolean
  mobileOpen: boolean
  onCloseMobile: () => void
}

export function Sidebar({ collapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const { can } = usePermission()

  // Her item izin kontrollüdür; bir bölümün tüm item'ları gizliyse bölüm başlığı da gizlenir.
  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => can(item.permission)),
  })).filter((section) => section.items.length > 0)

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onCloseMobile} aria-hidden="true" />
      )}

      <aside
        aria-label="Ana navigasyon"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col overflow-hidden border-r border-border-subtle bg-surface-1',
          'transition-[width,transform] duration-200 ease-in-out motion-reduce:transition-none',
          // Masaüstünde akışa dahil sabit panel; mobilde off-canvas overlay.
          'lg:static lg:z-auto lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed ? 'lg:w-16' : 'lg:w-60'
        )}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border-subtle px-4">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-fg">
            S
          </div>
          <span className={cn('truncate text-base font-semibold text-fg', collapsed && 'lg:hidden')}>
            SIGMA-CRM
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          {visibleSections.map((section) => (
            <div key={section.title} className="mb-5 last:mb-0">
              <p
                className={cn(
                  'mb-2 px-2.5 text-xs font-medium uppercase tracking-wide text-fg-muted',
                  collapsed && 'lg:hidden'
                )}
              >
                {section.title}
              </p>
              <ul className="flex flex-col gap-1">
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onCloseMobile}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 rounded-md px-2.5 py-2 text-base',
                          'transition-colors duration-150 motion-reduce:transition-none',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-1',
                          collapsed && 'lg:justify-center',
                          isActive ? 'bg-primary-tint text-primary' : 'text-fg-secondary hover:bg-surface-2'
                        )
                      }
                    >
                      <item.icon className="size-5 shrink-0" aria-hidden="true" />
                      <span className={cn('truncate', collapsed && 'lg:hidden')}>{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
