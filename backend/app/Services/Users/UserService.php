<?php

namespace App\Services\Users;

use App\Events\UserDeactivated;
use App\Models\User;
use App\Repositories\UserRepository;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class UserService
{
    public function __construct(protected UserRepository $users) {}

    /**
     * @param  array<string, mixed>  $filters  'per_page' anahtarı dahil edilebilir.
     */
    public function list(array $filters): LengthAwarePaginator
    {
        $perPage = (int) ($filters['per_page'] ?? 15);
        unset($filters['per_page']);

        return $this->users->paginate($filters, $perPage);
    }

    /**
     * @param  array<string, mixed>  $data  'role' anahtarı içerebilir.
     */
    public function create(array $data): User
    {
        return DB::transaction(function () use ($data) {
            $role = $data['role'] ?? null;
            unset($data['role']);

            // Kapalı devre erişim modeli: geçici şifreyle giriş yapıp değiştirmek zorunda.
            $data['must_change_password'] = true;

            $user = $this->users->create($data);

            if ($role) {
                $user->syncRoles([$role]);
            }

            return $user->load('roles');
        });
    }

    /**
     * @param  array<string, mixed>  $data  'role' anahtarı içerebilir.
     */
    public function update(User $user, array $data): User
    {
        return DB::transaction(function () use ($user, $data) {
            $role = array_key_exists('role', $data) ? $data['role'] : null;
            unset($data['role']);

            if (! empty($data)) {
                $this->users->update($user, $data);
            }

            if ($role !== null) {
                // Rol değişimi yalnızca users.manage_roles iznine sahip aktörler içindir.
                Gate::authorize('manageRoles', $user);

                $user->syncRoles([$role]);
            }

            return $user->load('roles');
        });
    }

    public function toggleActive(User $user, bool $isActive): User
    {
        return DB::transaction(function () use ($user, $isActive) {
            $user->is_active = $isActive;
            $user->save();

            if (! $isActive) {
                // "Beni hatırla" çerezini geçersiz kıl.
                $user->setRememberToken(Str::random(60));
                $user->save();

                event(new UserDeactivated($user->id));
            }

            return $user->load('roles');
        });
    }

    public function resetPassword(User $user, string $password): User
    {
        return DB::transaction(function () use ($user, $password) {
            // Düz metin ata; model cast'i ('password' => 'hashed') otomatik hash'ler.
            $user->password = $password;
            $user->must_change_password = true;
            $user->setRememberToken(Str::random(60));
            $user->save();

            return $user->load('roles');
        });
    }

    public function delete(User $user): void
    {
        DB::transaction(function () use ($user) {
            $user->setRememberToken(Str::random(60));
            $user->save();

            $this->users->delete($user);
        });
    }
}
