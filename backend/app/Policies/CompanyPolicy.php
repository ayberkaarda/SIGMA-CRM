<?php

namespace App\Policies;

use App\Models\Company;
use App\Models\User;

class CompanyPolicy
{
    /**
     * Determine whether the user can view any companies.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('companies.view');
    }

    /**
     * Determine whether the user can view the given company.
     */
    public function view(User $user, Company $company): bool
    {
        return $user->can('companies.view');
    }

    /**
     * Determine whether the user can create companies.
     */
    public function create(User $user): bool
    {
        return $user->can('companies.create');
    }

    /**
     * Determine whether the user can update the given company.
     */
    public function update(User $user, Company $company): bool
    {
        return $user->can('companies.update');
    }

    /**
     * Determine whether the user can delete the given company.
     */
    public function delete(User $user, Company $company): bool
    {
        return $user->can('companies.delete');
    }
}
