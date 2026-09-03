<?php

namespace Drupal\leaflet_edit\Service;
use Drupal\Core\Session\AccountProxyInterface;

class PermissionChecker {

  protected AccountProxyInterface $currentUser;

  public function __construct(AccountProxyInterface $current_user) {
    $this->currentUser = $current_user;
  }

  /**
   * Vérifie si l'utilisateur actuel a l'une des permissions spécifiées.
   *
   * @param array $permissions
   *   Tableau de permissions.
   *
   * @return bool
   *   TRUE si l'utilisateur a l'une des permissions, FALSE sinon.
   */
  public function hasAnyPermission(array $permissions): bool {
    foreach ($permissions as $permission) {
      if ($this->currentUser->hasPermission($permission)) {
        return TRUE;
      }
    }
    return FALSE;
  }
}