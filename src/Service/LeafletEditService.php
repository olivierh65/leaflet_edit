<?php

declare(strict_types=1);

namespace Drupal\leaflet_edit\Service;

use Drupal\Core\Cache\CacheBackendInterface;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Session\AccountInterface;
use Drupal\Core\StreamWrapper\StreamWrapperManagerInterface;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\Core\Utility\LinkGeneratorInterface;
use Drupal\geofield\GeoPHP\GeoPHPInterface;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\leaflet\LeafletService;
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
    // Nouveau modèle : les features sont des métadonnées légères (traces
    // geofile) ; la géométrie est chargée via les endpoints bbox.
    // Tout est passé en inline au parent (plus de distinction url/inline).
    $build = parent::leafletRenderMap($map, $features, $height);
    $attachedLibraries = $build['#attached']['library'] ?? [];
    $settings = $build['#attached']['drupalSettings'] ?? [];

    // Outils JS configurables : la liste des outils activés arrive via
    // $map['leaflet_edit_tools'] (posée par le formatter depuis ses
    // settings 'tools'). Chaque clé correspond au suffixe de librairie
    // 'leaflet_edit/<clé>' déclaré dans leaflet_edit.libraries.yml.
    // 'leaflet-edit' (socle : init/menu/util/edit + CSS) est toujours chargé.
    // 'leaflet-styleeditor' est TOUJOURS chargé aussi (usage programmatique
    // du menu métier : L.control.styleEditor() + enable(layer), sans bouton
    // carte) : il n'est donc plus dans la liste configurable.
    $enabledTools = $map['leaflet_edit_tools'] ?? NULL;
    $allTools = [
      'leaflet-geoman',
      'leaflet-locatecontrol',
      'leaflet-panel-layers',
      'leaflet-notifications',
      'leaflet-fullscreen',
      'leaflet.ajax',
      'leaflet-contextmenu',
      'leaflet.control-window',
      'leaflet.cascadebuttons',
      'leaflet-distance-markers',
      'leaflet.GeometryUtil',
      'leaflet.turf',
      'leaflet.togeojson',
      'leaflet-slider',
      'leaflet-arrowheads',
      'leaflet-feature-control',
      'leaflet-doubleclick-drupal',
      'leaflet-toolbar',
      'leaflet.select2',
      'leaflet.Dialog',
      'togpx',
    ];
    if (!is_array($enabledTools) || $enabledTools === []) {
      // Pas de sélection transmise (ancien appel ou display configuré
      // avant l'ajout du réglage 'tools') : tout sauf les outils
      // historiquement désactivés par défaut.
      $enabledTools = array_diff($allTools, [
        'leaflet-feature-control',
        'leaflet-doubleclick-drupal',
        'leaflet-toolbar',
        'leaflet.select2',
        'leaflet.Dialog',
      ]);
    }
    $attachedLibraries[] = 'leaflet_edit/leaflet-edit';
    // StyleEditor : chargement systématique pour le menu métier
    // (programmatique, sans icône carte). Voir ensureStyleEditor().
    $attachedLibraries[] = 'leaflet_edit/leaflet-styleeditor';
    foreach ($allTools as $tool) {
      if (in_array($tool, $enabledTools, TRUE)) {
        $attachedLibraries[] = 'leaflet_edit/' . $tool;
      }
    }

    $mapId = $build['#map_id'];
    // Keep per-map settings namespaced by map ID to support several maps
    // on the same page. Plus de features_url : le JS charge via bbox.
    $settings[$mapId] = [
      'mapid' => $mapId,
      'map' => $map,
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

}
