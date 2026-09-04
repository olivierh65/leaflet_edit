<?php

declare(strict_types=1);

namespace Drupal\leaflet_edit\Plugin\rest\resource;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Session\AccountProxyInterface;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\file\Entity\File;
use Drupal\node\NodeInterface;
use Drupal\rest\Attribute\RestResource;
use Drupal\rest\Plugin\ResourceBase;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Serves GeoJSON files attached to map nodes.
 */
#[RestResource(
  id: 'transfert_geojson',
  label: new TranslatableMarkup('Transfer GeoJSON'),
  uri_paths: [
    'canonical' => '/leaflet_edit/geojson/{vid}/{fid}/{eid}',
  ],
)]
class TransfertGeojson extends ResourceBase {

  /**
   * Constructs a TransfertGeojson object.
   */
  public function __construct(
    array $configuration,
    $plugin_id,
    $plugin_definition,
    array $serializer_formats,
    LoggerInterface $logger,
    protected AccountProxyInterface $currentUser,
    protected EntityTypeManagerInterface $entityTypeManager,
  ) {
    parent::__construct($configuration, $plugin_id, $plugin_definition, $serializer_formats, $logger);
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition): static {
    return new static(
      $configuration,
      $plugin_id,
      $plugin_definition,
      $container->getParameter('serializer.formats'),
      $container->get('logger.factory')->get('leaflet_edit'),
      $container->get('current_user'),
      $container->get('entity_type.manager'),
    );
  }

  /**
   * Responds to GET requests.
   *
   * @param int $vid
   *   The node revision ID.
   * @param int|null $fid
   *   The file entity ID.
   * @param int|null $eid
   *   The node entity ID.
   *
   * @return \Symfony\Component\HttpFoundation\JsonResponse
   *   The HTTP response object.
   */
  public function get(int $vid, ?int $fid = NULL, ?int $eid = NULL): JsonResponse {
    if (!$this->currentUser->hasPermission('access content')) {
      throw new AccessDeniedHttpException();
    }

    $file = NULL;
    if ($fid) {
      $file = $this->entityTypeManager->getStorage('file')->load($fid);
    }
    elseif ($eid) {
      $node = $this->entityTypeManager->getStorage('node')->loadRevision($vid);
      if ($node instanceof NodeInterface && $node->id() === $eid && $node->hasField('field_leaflet_geojson_files')) {
        $file = $node->get('field_leaflet_geojson_files')->entity;
      }
    }
    if (!$file instanceof File) {
      throw new NotFoundHttpException('GeoJSON file not found.');
    }

    if ($eid) {
      $node = $this->entityTypeManager->getStorage('node')->load($eid);
      if ($node instanceof NodeInterface && !$node->access('view', $this->currentUser)) {
        throw new AccessDeniedHttpException();
      }
    }
    if (!$file->access('download', $this->currentUser)) {
      throw new AccessDeniedHttpException();
    }

    $contents = @file_get_contents($file->getFileUri());
    if (!is_string($contents) || $contents === '') {
      throw new NotFoundHttpException('GeoJSON file is empty or unreadable.');
    }
    if (json_decode($contents) === NULL && json_last_error() !== JSON_ERROR_NONE) {
      throw new NotFoundHttpException('GeoJSON file is invalid.');
    }

    $response = new JsonResponse($contents, 200, [], TRUE);
    $response->headers->set('X-Content-Type-Options', 'nosniff');
    return $response;
  }

}
