<?php

declare(strict_types=1);

namespace Drupal\leaflet_edit\Service;

use Drupal\Core\Session\AccountInterface;

/**
 * Checks Leaflet Edit permissions for the current user.
 */
class PermissionChecker {

  /**
   * Constructs a PermissionChecker object.
   *
   * @param \Drupal\Core\Session\AccountInterface $currentUser
   *   The current user.
   */
  public function __construct(protected AccountInterface $currentUser) {}

  /**
   * Checks whether the current user has any of the given permissions.
   *
   * @param string[] $permissions
   *   An array of permission machine names.
   *
   * @return bool
   *   TRUE if the user has at least one of the permissions.
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
