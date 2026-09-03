<?php

namespace Drupal\leaflet_edit\Plugin\rest\resource;

use Drupal\rest\ModifiedResourceResponse;
use Drupal\rest\Plugin\ResourceBase;
use Drupal\rest\ResourceResponse;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpFoundation\JsonResponse;
use Drupal\file\Entity\File;

/**
 * Provides a resource to get view modes by entity and bundle.
 *
 * @RestResource(
 *   id = "transfert_geojson",
 *   label = @Translation("Transfert geojson"),
 *   uri_paths = {
 *     "canonical" = "/leaflet_edit/geojson/{vid}/{fid?}/{eid?}",
 *     "https://www.drupal.org/link-relations/edit" = "/leaflet/geojson/{vid}/{fid?}/{eid?}"
 *   }
 * )
 */
class TransfertGeojson extends ResourceBase {

  /**
   * A current user instance.
   *
   * @var \Drupal\Core\Session\AccountProxyInterface
   */
  protected $currentUser;

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    $instance = parent::create($container, $configuration, $plugin_id, $plugin_definition);
    $instance->logger = $container->get('logger.factory')->get('leaflet_edit');
    $instance->currentUser = $container->get('current_user');
    return $instance;
  }

    /**
     * Responds to GET requests.
     *
     * @param string $payload
     *
     * @return \Drupal\rest\ResourceResponse
     *   The HTTP response object.
     *
     * @throws \Symfony\Component\HttpKernel\Exception\HttpException
     *   Throws exception expected.
     */
    public function get($vid, $fid, $eid) {

        // You must to implement the logic of your REST Resource here.
        // Use current user after pass authentication to validate access.
        if (!$this->currentUser->hasPermission('access content')) {
            throw new AccessDeniedHttpException();
        }

        if ($fid) {
          $file = File::load($fid);
        }
        else {
          $entity =\Drupal::entityTypeManager()->getStorage('node')->loadRevision($vid);
          $file = $entity->get('field_leaflet_edit_trace')->entity;
        }
        if ($file) {
          $cont = file_get_contents($file->getFileUri());
          $resp = new JsonResponse($cont, 200, [], true);
          return $resp;
        }

        return new ResourceResponse("", 200);
    }

      /**
   * Handles PUT requests.
   *
   * @param mixed $data
   *   The data received in the PUT request.
   *
   * @return \Symfony\Component\HttpFoundation\JsonResponse
   */
  public function put($vid, $fid, $eid, $data) {
    // Logique pour mettre à jour des données.
    if (! $vid) {
      return new JsonResponse(['error' => 'Missing ID'], 400);
    }

    // Simuler une mise à jour réussie.
    return new JsonResponse(['message' => 'Data updated successfully'], 200);
  }

}
