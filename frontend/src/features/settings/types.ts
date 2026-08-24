// Ayarlar modülü paylaşılan tipleri — backend'in GERÇEK yanıt şekillerine göre (94/94 backend
// testi yeşil, koordinatörün ikinci tur düzeltmesiyle) hizalandı.
//
// 2. TUR DÜZELTME NOTU: İlk taslak backend henüz yazılmadan yapılan varsayımlara dayanıyordu.
// Üç yerde sapma vardı:
// 1. `Setting.value` ham `string | null` DEĞİL — `type`'a göre sunucuda zaten cast edilmiş
//    gerçek değer (`string | number | boolean | unknown[] | Record<string,unknown> | null`).
// 2. İzin matrisinde `matrix: Record<number,string[]>` diye bir alan HİÇ YOK — her rol kendi
//    `permissions: string[]` dizisini taşıyor, gruplama `permission.group` değil `modules[]`.
// 3. Hata zarfındaki `code` / `open_deals_count` / `available_stages` hem `errors` içinde HEM
//    kökte geliyor (bkz. `api.ts` → `readErrorBody`).
//
// ÖNEMLİ (pipeline aşamaları): `is_won` / `is_lost` aşamalar SİSTEM aşamalarıdır — silinemez
// ve pasifleştirilemez (backend 422 `STAGE_IS_SYSTEM` döner). Diğer hiçbir aşama da silinemez,
// yalnızca pasifleştirilebilir; bu yüzden burada bir "delete" ucu/payload'ı YOK.
//
// ÖNEMLİ (özel alanlar): `key` ve `entity_type` oluşturulduktan sonra FARKLI bir değerle
// değiştirilemez (backend 422 döner) — aynı değerle yeniden göndermek serbest, ama istemci bu
// iki alanı düzenleme gövdesine hiç DAHİL ETMİYOR (bkz. `CustomFieldUpdatePayload`).
//
// ÖNEMLİ (e-posta şablonları): `DELETE /api/settings/email-templates/{id}` GERÇEK silmedir
// (204) — özel alanların/aşamaların aksine burada "pasifleştirme" semantiği YOK. Şablonun
// kendi `is_active` alanı ayrı bir kavramdır, `PATCH` ile açılıp kapatılır.
//
// ÖNEMLİ (izin matrisi): `is_editable: false` olan bir rol (Super Admin dahil, ama ONA ÖZEL
// değil — ileride başka korumalı bir rol çıkarsa da bu bayrak çalışır) `Gate::before` ile TÜM
// izinlere sahip kabul edilir. Böyle bir rolün `permissions` dizisi BOŞ gelebilir; bu
// KASITLIDIR — arayüz bu rolü her zaman "tüm izinler işaretli" + salt-okunur gösterir.

// ---------------------------------------------------------------------------
// Genel ayarlar
// ---------------------------------------------------------------------------

export type SettingType = 'string' | 'integer' | 'boolean' | 'json'

/** `value`, `type`'a göre sunucuda zaten cast edilmiş gerçek değerdir — istemci tarafında
 *  `JSON.parse` / `Number()` ile YENİDEN yorumlanmaz. `json` tipi için `value` gerçek bir
 *  nesne/dizi olarak gelir (ham JSON metni değil). */
export type SettingValue = string | number | boolean | unknown[] | Record<string, unknown> | null

export type Setting = {
  key: string
  value: SettingValue
  type: SettingType
  group: string
  is_public: boolean
  description: string | null
}

export type SettingsResponse = {
  data: Setting[]
  meta: { groups: string[] }
}

// ---------------------------------------------------------------------------
// Pipeline aşamaları
// ---------------------------------------------------------------------------

export type PipelineStage = {
  id: number
  name: string
  slug: string
  position: number
  probability: number
  color: string | null
  is_won: boolean
  is_lost: boolean
  is_active: boolean
  /** Aşamadaki fırsat sayısı — pasifleştirmeden önce kullanıcıya bağlam vermek için listede
   *  rozet olarak gösterilir. */
  deals_count: number
}

/** Aşama güncelleme gövdesi. `move_to_stage_id` yalnızca 422 `STAGE_HAS_OPEN_DEALS`
 *  sonrası ikinci çağrıda, `is_active:false` ile birlikte gönderilir (bkz. `DeactivateStageModal`). */
export type PipelineStagePayload = {
  name?: string
  probability?: number
  color?: string | null
  is_active?: boolean
  move_to_stage_id?: number
}

/** Oluşturma gövdesi — `position` / `is_active` GÖNDERİLMEZ (backend 422 döner): yeni aşama
 *  otomatik sona eklenir ve her zaman aktif başlar. */
export type PipelineStageCreatePayload = {
  name: string
  probability: number
  color?: string | null
}

/** `pipeline_stages.color` / `tags.color` ile aynı sabit token sözlüğü — bkz.
 *  `components/shared/tokenBadgeVariant.ts`. Serbest hex girişi YOK. */
export const STAGE_COLOR_TOKENS = ['primary', 'success', 'danger', 'warning', 'neutral', 'info'] as const
export type StageColorToken = (typeof STAGE_COLOR_TOKENS)[number]

/** `PATCH /api/settings/pipeline-stages/{id}` 422 gövdesi — açık fırsatı olan bir aşamayı
 *  pasifleştirme denemesi. */
export type StageHasOpenDealsPayload = {
  open_deals_count: number
  available_stages: { id: number; name: string }[]
}

// ---------------------------------------------------------------------------
// Özel alanlar
// ---------------------------------------------------------------------------

export type CustomFieldType = 'text' | 'textarea' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean'

export type CustomField = {
  id: number
  entity_type: string
  name: string
  key: string
  type: CustomFieldType
  options: string[] | null
  is_required: boolean
  position: number
  is_active: boolean
}

/** Sunucu otorite: geçerli `entity_type` / `type` değerleri ve hangi tiplerin seçenek listesi
 *  gerektirdiği (`option_types`, ör. `['select','multiselect']`) BURADAN gelir — istemci
 *  tarafında sabit bir liste tutulmaz (`GET /api/settings/custom-fields` → `meta`). */
export type CustomFieldsMeta = {
  entity_types: string[]
  types: string[]
  option_types: string[]
}

export type CustomFieldsResponse = {
  data: CustomField[]
  meta: CustomFieldsMeta
}

export type CustomFieldCreatePayload = {
  entity_type: string
  name: string
  key: string
  type: CustomFieldType
  options?: string[] | null
  is_required?: boolean
}

/** Düzenlemede `entity_type` ve `key` GÖNDERİLMEZ — ikisi de yalnızca FARKLI bir değerle
 *  gönderilirse 422 döner, bu yüzden istemci bu iki alanı hiç dahil etmiyor. */
export type CustomFieldUpdatePayload = {
  name?: string
  type?: CustomFieldType
  options?: string[] | null
  is_required?: boolean
  is_active?: boolean
}

// ---------------------------------------------------------------------------
// E-posta şablonları
// ---------------------------------------------------------------------------

export type EmailTemplate = {
  id: number
  key: string
  name: string
  subject: string
  body_html: string
  variables: string[] | null
  is_active: boolean
}

/** `variables` GÖNDERİLMEZSE sunucu `body_html` içindeki `{{değişken}}` yer tutucularından
 *  otomatik türetir — bu yüzden formda hiç değişken eklenmemişse istemci bu anahtarı payload'a
 *  hiç KOYMAZ (bkz. `EmailTemplateFormModal`). */
export type EmailTemplatePayload = {
  key?: string
  name?: string
  subject?: string
  body_html?: string
  variables?: string[]
  is_active?: boolean
}

// ---------------------------------------------------------------------------
// Rol / izin matrisi
// ---------------------------------------------------------------------------

export type PermissionMatrixPermission = { name: string; module: string; action: string }

export type PermissionMatrixModule = { key: string; permissions: string[] }

export type PermissionMatrixRole = {
  id: number
  name: string
  is_super_admin: boolean
  /** `false` ise rol salt-okunurdur. Super Admin bunun tipik bir örneğidir ama arayüz ONA ÖZEL
   *  DEĞİL, genel olarak bu bayrağa göre davranır. Böyle bir rolün `permissions` dizisi BOŞ
   *  gelebilir (`Gate::before` ile zaten tüm izinlere sahip) — arayüz bu rolü her zaman "tüm
   *  izinler işaretli" gösterir, boş diziye bakıp boş GÖSTERMEZ. */
  is_editable: boolean
  users_count: number
  permissions: string[]
}

export type PermissionMatrix = {
  permissions: PermissionMatrixPermission[]
  modules: PermissionMatrixModule[]
  roles: PermissionMatrixRole[]
}

/** `PATCH /api/settings/roles/{roleId}/permissions` yanıtı (`RoleResource`) — tüm matris
 *  DEĞİL, yalnızca güncellenen tek rol döner. */
export type RoleUpdateResult = {
  id: number
  name: string
  permissions: string[]
}
