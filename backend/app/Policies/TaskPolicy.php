<?php

namespace App\Policies;

use App\Models\Task;
use App\Models\User;

class TaskPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('tasks.view');
    }

    public function view(User $user, Task $task): bool
    {
        return $user->can('tasks.view');
    }

    public function create(User $user): bool
    {
        return $user->can('tasks.create');
    }

    public function update(User $user, Task $task): bool
    {
        return $user->can('tasks.update');
    }

    public function delete(User $user, Task $task): bool
    {
        return $user->can('tasks.delete');
    }

    public function assign(User $user, Task $task): bool
    {
        return $user->can('tasks.assign');
    }

    /**
     * KARAR: kendine atanmamış bir görevi tamamlamak için `tasks.update`
     * yeterlidir — yalnızca atanan kişi (assignee) DEĞİL.
     *
     * GEREKÇE: "kim tamamlayabilir" bir SAHİPLİK sorusu değil, bir YETKİ
     * sorusudur. Bir yönetici veya takım lideri, ekip üyesinin unuttuğu/
     * yarım bıraktığı bir görevi kapatabilmelidir (ör. izne çıkan bir
     * temsilcinin görevini devralan kişi, ya da haftalık temizlik yapan bir
     * yönetici). Bunu yalnızca `assigned_to === $user->id` ile kısıtlamak,
     * `tasks.update` iznine sahip birinin görevin BAŞLIĞINI, VADESİNİ,
     * ÖNCELİĞİNİ değiştirebilip durumunu tamamlayamaması gibi tutarsız bir
     * ayrıcalık matrisi yaratırdı — tamamlama zaten `update`'in bir alt
     * kümesi (status+completed_at güncellemesi), bu yüzden aynı izinle
     * korunuyor. `tasks.assign` (görevi BAŞKASINA devretme) ayrı bir izin
     * olarak kalmaya devam ediyor; bu, "görevi tamamlama" ile "görevi
     * başkasına verme" arasındaki ayrımı korur.
     */
    public function complete(User $user, Task $task): bool
    {
        return $user->can('tasks.update');
    }
}
