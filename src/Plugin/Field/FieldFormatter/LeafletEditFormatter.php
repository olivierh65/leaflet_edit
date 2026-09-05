<?php

declare(strict_types=1);

namespace Drupal\leaflet_edit\Plugin\Field\FieldFormatter;

use Drupal\Component\Serialization\Json;
use Drupal\Component\Utility\Html;
use Drupal\Core\Entity\EntityFieldManagerInterface;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\FormatterBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Render\RendererInterface;
use Drupal\Core\Session\AccountProxyInterface;
use Drupal\Core\Url;
use Drupal\Core\Utility\LinkGeneratorInterface;
use Drupal\Core\Utility\Token;
use Drupal\leaflet\Plugin\Field\FieldFormatter\LeafletDefaultFormatter;
use Drupal\leaflet_edit\Service\LeafletEditService;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Plugin implementation of the 'leaflet_edit_formatter' formatter.
 *
 * @FieldFormatter(
 *   id = "leaflet_edit_formatter",
 *   label = @Translation("Leaflet edit map formatter"),
 *   field_types = {
 *     "geojsonfile"
 *   }
 * )
 */
class LeafletEditFormatter extends LeafletDefaultFormatter {

  /**
   * Constructs a LeafletEditFormatter object.
   */
  public function __construct(
    $plugin_id,
    $plugin_definition,
    FieldDefinitionInterface $field_definition,
    array $settings,
    $label,
    $view_mode,
    array $third_party_settings,
    LeafletEditService $leaflet_service,
    EntityFieldManagerInterface $entity_field_manager,
    Token $token,
    RendererInterface $renderer,
    ModuleHandlerInterface $module_handler,
    LinkGeneratorInterface $link_generator,
    protected AccountProxyInterface $currentUser,
  ) {
    parent::__construct(
      $plugin_id,
      $plugin_definition,
      $field_definition,
      $settings,
      $label,
      $view_mode,
      $third_party_settings,
      $leaflet_service,
      $entity_field_manager,
      $token,
      $renderer,
      $module_handler,
      $link_generator,
    );
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition): static {
    return new static(
      $plugin_id,
      $plugin_definition,
      $configuration['field_definition'],
      $configuration['settings'],
      $configuration['label'],
      $configuration['view_mode'],
      $configuration['third_party_settings'],
      $container->get('leaflet_edit.service'),
      $container->get('entity_field.manager'),
      $container->get('token'),
      $container->get('renderer'),
      $container->get('module_handler'),
      $container->get('link_generator'),
      $container->get('current_user'),
    );
  }

  /**
   * {@inheritdoc}
   */
  public static function defaultSettings(): array {
    return [
      'leaflet_edit' => [
        'leaflet' => [
          'tolerance' => 10,
        ],
        'locatecontrol' => [
          'control' => TRUE,
          'position' => 'bottomright',
        ],
        'geoman' => [
          'control' => TRUE,
          'position' => 'topleft',
          'options' => [
            'drawMarker' => 'drawMarker',
            'drawPolyline' => 'drawPolyline',
            'drawControls' => 'drawControls',
            'customControls' => 'customControls',
          ],
        ],
      ],
    ] + parent::defaultSettings();
  }

  /**
   * {@inheritdoc}
   */
  public function settingsSummary(): array {
    $summary = [];
    $settings = $this->getSettings();
    $summary[] = $this->t('Leaflet Map: @map', ['@map' => $settings['leaflet_map'] ?? '']);
    $summary[] = $this->t('Map height: @height @height_unit', [
      '@height' => $settings['height'] ?? '',
      '@height_unit' => $settings['height_unit'] ?? '',
    ]);

    $leaflet = $settings['leaflet_edit']['leaflet'] ?? [];
    $summary[] = !empty($leaflet)
      ? $this->t('Click tolerance: @tolerance', ['@tolerance' => $leaflet['tolerance'] ?? 10])
      : $this->t('No click tolerance');

    $locatecontrol = $settings['leaflet_edit']['locatecontrol'] ?? [];
    $summary[] = !empty($locatecontrol)
      ? $this->t('Locate Control: @control', ['@control' => !empty($locatecontrol['control']) ? 'on' : 'off'])
      : $this->t('No Locate Control');

    $geoman = $settings['leaflet_edit']['geoman'] ?? [];
    $summary[] = !empty($geoman)
      ? $this->t('Geoman Control: @control', ['@control' => !empty($geoman['control']) ? 'on' : 'off'])
      : $this->t('No Geoman Control');

    return $summary;
  }

  /**
   * {@inheritdoc}
   */
  public function settingsForm(array $form, FormStateInterface $form_state): array {
    $settings = $this->getSettings();
    $leafletEdit = $settings['leaflet_edit'] ?? [];

    $form['#tree'] = TRUE;
    $element = FormatterBase::settingsForm($form, $form_state);

    $this->generateMapGeneralSettings($element, $settings);
    unset($element['gesture_handling']);

    $mapPositionOptions = $settings['map_position'] ?? [];
    $element['map_position'] = $this->generateMapPositionElement($mapPositionOptions);
    $element['map_position']['zoomControlPosition']['#access'] = FALSE;
    $element['map_position']['zoom']['#access'] = FALSE;
    $element['map_position']['zoomFiner']['#access'] = FALSE;
    $element['map_position']['minZoom']['#access'] = FALSE;
    $element['map_position']['maxZoom']['#access'] = FALSE;
    $element['map_position']['minZoom']['#default_value'] = 2;
    $element['map_position']['maxZoom']['#default_value'] = 18;

    $element['leaflet_edit'] = [
      '#type' => 'details',
      '#title' => $this->t('Leaflet Edit Settings'),
    ];
    $element['leaflet_edit']['leaflet'] = [
      '#type' => 'details',
      '#title' => $this->t('Leaflet Settings'),
    ];
    $element['leaflet_edit']['leaflet']['tolerance'] = [
      '#type' => 'number',
      '#title' => $this->t('Click tolerance'),
      '#description' => $this->t('Click tolerance in pixels.'),
      '#min' => 0,
      '#max' => 50,
      '#step' => 1,
      '#default_value' => $leafletEdit['leaflet']['tolerance'] ?? 10,
    ];

    $element['leaflet_edit']['locatecontrol'] = [
      '#type' => 'details',
      '#title' => $this->t('LocateControl Settings'),
    ];
    $element['leaflet_edit']['locatecontrol']['control'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Enable LocateControl'),
      '#description' => $this->t('Add LocateControl.'),
      '#default_value' => $leafletEdit['locatecontrol']['control'] ?? TRUE,
    ];
    $element['leaflet_edit']['locatecontrol']['position'] = [
      '#type' => 'select',
      '#title' => $this->t('Control position.'),
      '#options' => $this->getControlPositions(),
      '#default_value' => $leafletEdit['locatecontrol']['position'] ?? 'bottomright',
    ];

    $element['leaflet_edit']['geoman'] = [
      '#type' => 'details',
      '#title' => $this->t('Geoman Settings'),
    ];
    $element['leaflet_edit']['geoman']['control'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Enable Geoman functionality'),
      '#description' => $this->t('Add Geoman.'),
      '#default_value' => $leafletEdit['geoman']['control'] ?? TRUE,
    ];
    $element['leaflet_edit']['geoman']['position'] = [
      '#type' => 'select',
      '#title' => $this->t('Control position.'),
      '#options' => $this->getControlPositions(),
      '#default_value' => $leafletEdit['geoman']['position'] ?? 'topleft',
    ];
    $element['leaflet_edit']['geoman']['options'] = [
      '#type' => 'checkboxes',
      '#title' => $this->t('Options'),
      '#description' => $this->t('Geoman Options.'),
      '#options' => $this->getGeomanOptions(),
      '#default_value' => $leafletEdit['geoman']['options'] ?? ['drawMarker', 'drawPolyline', 'drawControls', 'customControls'],
    ];

    return $element;
  }

  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode): array {
    $entity = $items->getEntity();
    if ($entity->hasTranslation($langcode)) {
      $entity = $entity->getTranslation($langcode);
    }

    $entityType = $entity->getEntityTypeId();
    $bundle = $entity->bundle();
    $entityId = $entity->id();
    $field = $items->getFieldDefinition();
    $settings = $this->getSettings();

    $settings['leaflet_edit']['permissions'] = [
      'configure' => $this->currentUser->hasPermission('administer leaflet edit'),
      'edit' => $this->currentUser->hasPermission('edit leaflet tracks'),
      'add' => $this->currentUser->hasPermission('add leaflet tracks'),
      'save' => $this->currentUser->hasPermission('save leaflet tracks'),
      'exportGPX' => $this->currentUser->hasPermission('export leaflet tracks to gpx'),
      'importGPX' => $this->currentUser->hasPermission('import leaflet tracks from gpx'),
      'read' => $this->currentUser->hasPermission('restful get transfert_geojson'),
    ];

    $map = leaflet_map_get_info($settings['leaflet_map'] ?? '');
    if (empty($map)) {
      return [];
    }
    $map['id'] = Html::getUniqueId("leaflet_map_{$entityType}_{$bundle}_{$entityId}_{$field->getName()}");
    $map['geofield_cardinality'] = $this->fieldDefinition->getFieldStorageDefinition()->getCardinality();
    $this->setAdditionalMapOptions($map, $settings);

    $features = [];
    $cacheTags = $entity->getCacheTags();
    foreach ($items as $item) {
      // La colonne 'file' est un tableau de fids (ex: [5275]).
      $fileValues = $item->get('file')->getValue();
      $fids = is_array($fileValues) ? $fileValues : [$fileValues];
      $fid = (int) reset($fids);
      if ($fid <= 0) {
        continue;
      }
      $feature = [
        'type' => 'url',
        'url' => $this->leafletService->leafletProcessGeofieldFileUrl($fid, $entity),
        'id' => $fid,
        'entity' => $entityId,
        // Titre : colonne 'nom' du field type geojsonfile, fallback description.
        'description' => (string) ($item->get('nom')->getValue() ?? $item->get('description')->getValue() ?? ''),
        'title' => $entity->label(),
        'overlay' => (int) ($item->get('overlay')->getValue() ?? 0),
      ];
      $filename = $this->leafletService->leafletProcessGeofieldFilename($fid);
      $feature['filename'] = $filename['filename'] ?? '';
      $feature['extension'] = $filename['extension'] ?? '';
      $style = $item->get('style')->getValue();
      $feature['style'] = is_string($style) ? $style : Json::encode($style ?? []);
      $mapping = $item->get('mapping')->getValue();
      $feature['mapping'] = $mapping ? (is_string($mapping) ? $mapping : Json::encode($mapping)) : NULL;
      $features[] = $feature;

      $file = $item->get('file')->getValue();
      if ($file) {
        $cacheTags[] = 'file:' . $fid;
      }
    }

    if ($features === []) {
      return [];
    }

    $jsSettings = [
      'map' => $map,
      'features' => $features,
    ];
    $this->moduleHandler->alter('leaflet_default_map_formatter', $jsSettings, $items);

    $mapHeight = !empty($settings['height']) ? $settings['height'] . ($settings['height_unit'] ?? 'px') : '';
    $build = $this->leafletService->leafletRenderMap($jsSettings['map'], $jsSettings['features'], $mapHeight);
    $build['#attached']['drupalSettings'][$build['#map_id']]['leaflet_edit'] = $settings['leaflet_edit'];
    // Expose POST endpoints to the map JS. Chaque URL embarque son token
    // CSRF car la validation _csrf_token est faite par chemin de route.
    // Note: on NE passe PAS par Url::toString() ici. En contexte de rendu
    // HTML, RouteProcessorCsrf remplace le token par un placeholder
    // (Crypt::hashBase64($path)) + #lazy_builder, et ce placeholder n'est
    // jamais résolu à l'intérieur de drupalSettings -> le JS reçoit un
    // hash invalide -> 403 'csrf_token invalid' systématique. On génère
    // donc le vrai token via le service csrf_token et on concatène
    // manuellement sur le chemin de la route (sans toString()).
    // Le token est lié à la session : le rendu varie par session.
    $csrfToken = \Drupal::csrfToken();
    $build['#attached']['drupalSettings'][$build['#map_id']]['leaflet_edit']['endpoints'] = [
      'save' => '/leaflet-edit/save?token=' . $csrfToken->get('leaflet-edit/save'),
      'exportGpx' => '/leaflet-edit/export-gpx?token=' . $csrfToken->get('leaflet-edit/export-gpx'),
      'exportGpxMerge' => '/leaflet-edit/export-gpx-merge?token=' . $csrfToken->get('leaflet-edit/export-gpx-merge'),
    ];
    $build['#cache'] = [
      'tags' => array_unique($cacheTags),
      'contexts' => ['user.permissions', 'languages', 'session'],
    ];

    return [$build];
  }

  /**
   * Returns the control position options.
   *
   * @return array<string, string>
   *   The position options.
   */
  protected function getControlPositions(): array {
    return [
      'topleft' => $this->t('Top left')->render(),
      'topright' => $this->t('Top right')->render(),
      'bottomleft' => $this->t('Bottom left')->render(),
      'bottomright' => $this->t('Bottom right')->render(),
    ];
  }

  /**
   * Returns the Geoman options.
   *
   * @return array<string, string>
   *   The Geoman options.
   */
  protected function getGeomanOptions(): array {
    return [
      'drawControls' => $this->t('Shows the draw block.')->render(),
      'drawMarker' => $this->t('Adds button to draw Markers.')->render(),
      'drawCircleMarker' => $this->t('Adds button to draw CircleMarkers.')->render(),
      'drawPolyline' => $this->t('Adds button to draw Line.')->render(),
      'drawRectangle' => $this->t('Adds button to draw Rectangle.')->render(),
      'drawPolygon' => $this->t('Adds button to draw Polygon.')->render(),
      'drawCircle' => $this->t('Adds button to draw Circle.')->render(),
      'drawText' => $this->t('Adds button to draw Text.')->render(),
      'editControls' => $this->t('Shows the edit block.')->render(),
      'editMode' => $this->t('Adds button to toggle Edit Mode for all layers.')->render(),
      'dragMode' => $this->t('Adds button to toggle Drag Mode for all layers.')->render(),
      'cutPolygon' => $this->t('Adds button to cut a hole in a Polygon or Line.')->render(),
      'removalMode' => $this->t('Adds a button to remove layers.')->render(),
      'rotateMode' => $this->t('Adds a button to rotate layers.')->render(),
      'oneBlock' => $this->t('All buttons will be displayed as one block.')->render(),
      'customControls' => $this->t('Shows the custom block.')->render(),
    ];
  }

}
