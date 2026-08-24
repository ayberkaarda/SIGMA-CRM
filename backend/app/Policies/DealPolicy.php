<?php

namespace App\Policies;

use App\Models\Deal;
use App\Models\User;

class DealPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('deals.view');
    }

    public function view(User $user, Deal $deal): bool
    {
        return $user->can('deals.view');
    }

    public function create(User $user): bool
    {
        return $user->can('deals.create');
    }

    public function update(User $user, Deal $deal): bool
    {
        return $user->can('deals.update');
    }

    /**
     * Kazanılmış (`won`) veya kaybedilmiş (`lost`) bir deal silinemez —
     * kapanmış iş kaydı analitiğin parçasıdır, soft delete olsa bile
     * raporlardan düşer.
     *
     * 403 (izin reddi ile aynı kanal) tercih edildi, 422 değil: proje
     * genelinde "durumu nedeniyle silinemez" kuralı zaten LeadPolicy::delete()
     * içinde aynı desenle uygulanıyor (dönüştürülmüş lead silinemez -> false
     * -> Gate::authorize AuthorizationException fırlatır -> 403). Yetki
     * kararını tek yerde (Policy) toplamak, "kim silebilir" ile "hangi kayıt
     * silinebilir" mantığını Controller/Service katmanına bölünmüş ayrı bir
     * 422 kuralına dağıtmaktan daha tutarlıdır.
     */
    public function delete(User $user, Deal $deal): bool
    {
        if (! $user->can('deals.delete')) {
            return false;
        }

        return ! in_array($deal->status, ['won', 'lost'], true);
    }

    /**
     * `PATCH /api/deals/{deal}/move` — controller'ı A şeridinin
     * (DealMoveController), ama yetki kararı burada, tek DealPolicy'de.
     */
    public function move(User $user, Deal $deal): bool
    {
        return $user->can('deals.move');
    }

    public function assign(User $user, Deal $deal): bool
    {
        return $user->can('deals.assign');
    }
}
