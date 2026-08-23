<?php

namespace App\Policies;

use App\Models\Contact;
use App\Models\User;

class ContactPolicy
{
    /**
     * Determine whether the user can view any contacts.
     */
    public function viewAny(User $user): bool
    {
        return $user->can('contacts.view');
    }

    /**
     * Determine whether the user can view the given contact.
     */
    public function view(User $user, Contact $contact): bool
    {
        return $user->can('contacts.view');
    }

    /**
     * Determine whether the user can create contacts.
     */
    public function create(User $user): bool
    {
        return $user->can('contacts.create');
    }

    /**
     * Determine whether the user can update the given contact.
     */
    public function update(User $user, Contact $contact): bool
    {
        return $user->can('contacts.update');
    }

    /**
     * Determine whether the user can delete the given contact.
     */
    public function delete(User $user, Contact $contact): bool
    {
        return $user->can('contacts.delete');
    }
}
