// Kategori seçenekleri — backend `tickets.category` serbest bir string kolonudur (enum/whitelist
// YOK, bkz. `StoreTicketRequest`/`IndexTicketRequest`: `['sometimes','nullable','string','max:255']`).
// Burada listelenen değerler `DemoDataSeeder::seedTickets()`teki gerçek demo verisiyle BİREBİR
// aynıdır — form ve liste filtresi tutarlı bir sözlük sunsun diye curated bir set olarak
// tutulur; sunucu bunun dışında bir değeri REDDETMEZ, bu yüzden serbest metin girişini
// KISITLAMAZ (bkz. `TicketFormModal`'daki `Select` + "Diğer" davranışı).
export const TICKET_CATEGORIES = ['Teknik Destek', 'Faturalandırma', 'Ürün Bilgisi', 'Şikayet', 'Kurulum', 'Eğitim Talebi'] as const

export const TICKET_CATEGORY_OPTIONS = TICKET_CATEGORIES.map((value) => ({ value, label: value }))
