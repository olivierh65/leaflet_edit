<?php

declare(strict_types=1);

namespace Drupal\leaflet_edit\Service;

use Drupal\Core\Cache\CacheBackendInterface;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Session\AccountInterface;
use Drupal\Core\StreamWrapper\StreamWrapperManagerInterface;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\Core\Url;
use Drupal\Core\Utility\LinkGeneratorInterface;
use Drupal\file\Entity\File;
use Drupal\geofield\GeoPHP\GeoPHPInterface;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\leaflet\LeafletService;
use Drupal\node\NodeInterface;
use Symfony\Component\HttpFoundation\RequestStack;
use Drupal\Core\File\FileUrlGeneratorInterface;

/**
 * Provides Leaflet map rendering with edit capabilities.
 */
class LeafletEditService extends LeafletService {

  use StringTranslationTrait;

  /**
   * Constructs a LeafletEditService object.
   */
  public function __construct(
    AccountInterface $current_user,
    GeoPHPInterface $geophp_wrapper,
    ModuleHandlerInterface $module_handler,
    LinkGeneratorInterface $link_generator,
    StreamWrapperManagerInterface $stream_wrapper_manager,
    RequestStack $request_stack,
    CacheBackendInterface $cache,
    FileUrlGeneratorInterface $file_url_generator,
    protected EntityTypeManagerInterface $entityTypeManager,
    protected ConfigFactoryInterface $configFactory,
  ) {
    parent::__construct(
      $current_user,
      $geophp_wrapper,
      $module_handler,
      $link_generator,
      $stream_wrapper_manager,
      $request_stack,
      $cache,
      $file_url_generator,
    );
  }

  /**
   * {@inheritdoc}
   */
  public function leafletRenderMap(array $map, array $features = [], $height = '400px'): array {
    $inlineFeatures = [];
    $urlFeatures = [];
    foreach ($features as $feature) {
      if (($feature['type'] ?? '') === 'url') {
        $urlFeatures[] = $feature;
      }
      else {
        $inlineFeatures[] = $feature;
      }
    }

    $build = parent::leafletRenderMap($map, $inlineFeatures, $height);
    $attachedLibraries = $build['#attached']['library'] ?? [];
    $settings = $build['#attached']['drupalSettings'] ?? [];

    $attachedLibraries[] = 'leaflet_edit/leaflet-geoman';
    $attachedLibraries[] = 'leaflet_edit/leaflet-locatecontrol';
    $attachedLibraries[] = 'leaflet_edit/leaflet-styleeditor';
    $attachedLibraries[] = 'leaflet_edit/leaflet-panel-layers';
    $attachedLibraries[] = 'leaflet_edit/leaflet-notifications';
    $attachedLibraries[] = 'leaflet_edit/leaflet-toolbar';
    $attachedLibraries[] = 'leaflet_edit/leaflet-fullscreen';
    $attachedLibraries[] = 'leaflet_edit/leaflet-edit';
    $attachedLibraries[] = 'leaflet_edit/leaflet.ajax';
    $attachedLibraries[] = 'leaflet_edit/leaflet-contextmenu';
    $attachedLibraries[] = 'leaflet_edit/leaflet.select2';
    $attachedLibraries[] = 'leaflet_edit/leaflet.Dialog';
    $attachedLibraries[] = 'leaflet_edit/leaflet.control-window';
    $attachedLibraries[] = 'leaflet_edit/leaflet-distance-markers';
    $attachedLibraries[] = 'leaflet_edit/leaflet.GeometryUtil';
    $attachedLibraries[] = 'leaflet_edit/leaflet.togeojson';
    $attachedLibraries[] = 'leaflet_edit/leaflet-slider';
    $attachedLibraries[] = 'jquery_ui_dialog/dialog';
    $attachedLibraries[] = 'jquery_ui_selectmenu/selectmenu';

    $mapId = $build['#map_id'];
    // Keep per-map settings namespaced by map ID to support several maps
    // on the same page.
    $settings[$mapId] = [
      'mapid' => $mapId,
      'map' => $map,
      'features_url' => array_values($urlFeatures),
    ];

    return [
      '#theme' => $build['#theme'],
      '#map_id' => $mapId,
      '#height' => $height,
      '#map' => $map,
      '#attached' => [
        'library' => array_values(array_unique($attachedLibraries)),
        'drupalSettings' => $settings,
      ],
      '#cache' => [
        'contexts' => ['user.permissions'],
      ],
    ];
  }

  /**
   * Returns the REST URL serving a GeoJSON file for a node revision.
   *
   * @param int $fid
   *   The file entity ID.
   * @param \Drupal\node\NodeInterface $entity
   *   The host node entity.
   *
   * @return string
   *   The relative REST URL, or an empty string if the file is missing.
   */
  public function leafletProcessGeofieldFileUrl(int $fid, NodeInterface $entity): string {
    $file = $this->entityTypeManager->getStorage('file')->load($fid);
    if (!$file instanceof File) {
      return '';
    }
    return Url::fromUri(
      'internal:/leaflet_edit/geojson/' . $entity->getRevisionId() . '/' . $fid . '/' . $entity->id(),
      ['query' => ['_format' => 'json']]
    )->toString();
  }

  /**
   * Returns the file name parts for a file entity.
   *
   * @param int $fid
   *   The file entity ID.
   *
   * @return array|null
   *   The pathinfo() parts, or NULL if the file is missing.
   */
  public function leafletProcessGeofieldFilename(int $fid): ?array {
    $file = $this->entityTypeManager->getStorage('file')->load($fid);
    if (!$file instanceof File) {
      return NULL;
    }
    return pathinfo($file->getFilename());
  }

}
