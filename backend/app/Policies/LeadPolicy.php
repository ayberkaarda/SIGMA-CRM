<?php

namespace App\Policies;

use App\Models\Lead;
use App\Models\User;

class LeadPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->can('leads.view');
    }

    public function view(User $user, Lead $lead): bool
    {
        return $user->can('leads.view');
    }

    public function create(User $user): bool
    {
        return $user->can('leads.create');
    }

    /**
     * Dönüşmüş bir lead güncellenemez — dönüşüm izi bozulmasın.
     */
    public function update(User $user, Lead $lead): bool
    {
        if (! $user->can('leads.update')) {
            return false;
        }

        return $lead->status !== 'converted';
    }

    /**
     * Dönüşmüş bir lead silinemez — dönüşüm izi bozulmasın.
     */
    public function delete(User $user, Lead $lead): bool
    {
        if (! $user->can('leads.delete')) {
            return false;
        }

        return $lead->status !== 'converted';
    }

    public function convert(User $user, Lead $lead): bool
    {
        return $user->can('leads.convert');
    }

    public function assign(User $user, Lead $lead): bool
    {
        return $user->can('leads.assign');
    }

    public function import(User $user): bool
    {
        return $user->can('leads.import');
    }
}
