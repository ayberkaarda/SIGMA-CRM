// Firmalar modülü tipleri — backend sözleşmesiyle birebir eşleşir (bkz. görev tanımı).
// Not: `contacts` modülüyle paralel bir şerit tarafından geliştiriliyor; bilinçli olarak
// buradan bağımsız, kendi tip tanımlarımız tutulur (import edilmez).

export type Tag = {
  id: number
  name: string
  color: string
}

export type UserOption = {
  id: number
  name: string
}

export type CustomFieldDef = {
  id: number
  key: string
  label: string
  type: string
  options?: string[]
}

export type Company = {
  id: number
  name: string
  email: string | null
  phone: string | null
  website: string | null
  industry: string | null
  address: string | null
  city: string | null
  country: string | null
  employee_count: number | null
  annual_revenue: number | null
  notes: string | null
  owner: { id: number; name: string } | null
  tags: Tag[]
  custom_fields: Record<string, string>
  contacts_count: number
  deals_count: number
  primary_contact: { id: number; full_name: string; email: string | null } | null
  created_at: string
  updated_at: string
}

export type CompaniesQuery = {
  page?: number
  per_page?: number
  sort?: string
  q?: string
  industry?: string
  owner_id?: number
  city?: string
  country?: string
  tag_id?: number
  from?: string
  to?: string
}

export type CompanyPayload = {
  name: string
  email?: string | null
  phone?: string | null
  website?: string | null
  industry?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  employee_count?: number | null
  annual_revenue?: number | null
  notes?: string | null
  owner_id?: number | null
  tag_ids?: number[]
  custom_fields?: Record<string, string>
}

// Firmaya bağlı kişiler mini tablosu için — `GET /api/contacts?filter[company_id]=`.
export type ContactSummary = {
  id: number
  first_name: string
  last_name: string
  full_name: string
  email: string | null
  phone: string | null
  position: string | null
  is_primary: boolean
}
