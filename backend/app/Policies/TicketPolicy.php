<?php

namespace App\Policies;

use App\Models\Ticket;
use App\Models\User;

class TicketPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('tickets.view');
    }

    public function view(User $user, Ticket $ticket): bool
    {
        return $user->can('tickets.view');
    }

    public function create(User $user): bool
    {
        return $user->can('tickets.create');
    }

    public function update(User $user, Ticket $ticket): bool
    {
        return $user->can('tickets.update');
    }

    /**
     * =========================================================================
     * ÇÖZÜLMÜŞ VEYA KAPANMIŞ BİR TICKET SİLİNEMEZ
     * =========================================================================
     *
     * `resolved` ve `closed` bir ticket'ın SLA SONUCU YAZILMIŞ hâlidir:
     * `resolved_at` ile `sla_due_at` karşılaştırması Faz 11'in "SLA uyum
     * oranı", "ortalama çözüm süresi" ve "kullanıcı performansı" raporlarının
     * TEK girdisidir. Böyle bir kaydı silmek — soft delete olsa bile, çünkü
     * her sorgu varsayılan olarak `deleted_at IS NULL` süzer — geçmiş bir
     * dönemin uyum yüzdesini GERİYE DÖNÜK ve sessizce değiştirir. Bir ihlali
     * ortadan kaldırmanın en kolay yolu "ticket'ı sil" olmamalıdır.
     *
     * Bu, docs/SLA-DESIGN.md §4'ün `closed` durumunu terminal yapan
     * gerekçesinin (kapanmış dönem raporları geriye dönük değişmez kalmalı)
     * silme tarafındaki karşılığıdır: durum makinesi kapanmış bir ticket'ı
     * yeniden açtırmıyorsa, silme ucu da onu yok ettirmemelidir.
     *
     * Hâlâ AÇIK olan (`open` / `in_progress` / `pending`) ticket'lar
     * silinebilir: yanlışlıkla açılmış, mükerrer ya da test amaçlı kayıtlar
     * bunlardır ve henüz hiçbir raporun girdisi değildirler.
     *
     * 403 tercih edildi (422 değil), Faz 6/7'deki iki emsalle aynı desen:
     * LeadPolicy::delete() dönüştürülmüş lead'i, DealPolicy::delete()
     * kazanılmış/kaybedilmiş deal'i aynı şekilde reddeder. "Kim silebilir" ile
     * "hangi kayıt silinebilir" kararını tek yerde (Policy) toplamak, ikinci
     * kuralı Service katmanına ayrı bir 422 olarak dağıtmaktan tutarlıdır.
     */
    public function delete(User $user, Ticket $ticket): bool
    {
        if (! $user->can('tickets.delete')) {
            return false;
        }

        return ! in_array($ticket->status, ['resolved', 'closed'], true);
    }

    public function assign(User $user, Ticket $ticket): bool
    {
        return $user->can('tickets.assign');
    }
}
