<?php

namespace App\Policies;

use App\Models\Activity;
use App\Models\User;

class ActivityPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('activities.view');
    }

    public function view(User $user, Activity $activity): bool
    {
        return $user->can('activities.view');
    }

    public function create(User $user): bool
    {
        return $user->can('activities.create');
    }

    public function update(User $user, Activity $activity): bool
    {
        return $user->can('activities.update');
    }

    /**
     * KARAR: bir aktiviteyi yalnızca (a) onu OLUŞTURAN kişi, ya da (b)
     * `activities.delete` iznine sahip bir yönetici silebilir.
     *
     * GEREKÇE: bir aktivite (çağrı/toplantı/e-posta/not) geçmiş bir
     * ETKİLEŞİMİN kaydıdır — bir deal/lead gibi "yaşayan" bir varlık değil,
     * ne olduğunun izidir. Başka bir temsilcinin müşteriyle yaptığı
     * görüşmenin notunu silebilmek, o etkileşimin hiç olmamış gibi
     * görünmesine yol açar ve ekip geçmişini bozar — bu yüzden varsayılan
     * olarak yalnızca KAYDI YAZAN kişi kendi hatasını (yanlış girilen bir
     * not, yinelenen bir kayıt) düzeltebilir. `activities.delete` izni,
     * bunun ÜSTÜNE, bir yöneticinin (ör. ayrılan bir çalışanın kayıtlarını
     * temizlerken) BAŞKASININ aktivitesini de silebilmesini sağlar — iki
     * yol da açık, ama biri KİMLİĞE (creator), diğeri İZNE dayanıyor ve
     * ikisi birbirinin YERİNE değil TAMAMLAYICISI.
     *
     * Creator kontrolü `activities.delete` iznine SAHİP OLMAYI şart
     * KOŞMAZ: `activities.create` iznine sahip her kullanıcı zaten kendi
     * yazdığı notu silebilmelidir (aksi halde yanlış girilen bir kayıt,
     * yöneticiye gidilmeden düzeltilemez bir hal alır).
     */
    public function delete(User $user, Activity $activity): bool
    {
        if ($user->can('activities.delete')) {
            return true;
        }

        return $activity->user_id !== null && $activity->user_id === $user->id;
    }
}
