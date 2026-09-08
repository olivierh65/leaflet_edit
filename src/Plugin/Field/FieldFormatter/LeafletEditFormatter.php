<?php

declare(strict_types=1);

namespace Drupal\leaflet_edit\Plugin\Field\FieldFormatter;

use Drupal\Component\Serialization\Json;
use Drupal\Component\Utility\Html;
use Drupal\Core\Entity\EntityFieldManagerInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
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
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Plugin implementation of the 'leaflet_edit_formatter' formatter.
 *
 * @FieldFormatter(
 *   id = "leaflet_edit_formatter",
 *   label = @Translation("Leaflet edit map formatter"),
 *   field_types = {
 *     "entity_reference"
 *   }
 * )
 */
class LeafletEditFormatter extends LeafletDefaultFormatter {

  /**
   * Field name of the per-node basemap override (see leaflet_edit_install).
   */
  public const BASEMAP_FIELD = 'field_leaflet_basemap';

  /**
   * Field name of the per-node tools override (explicit enabled set).
   *
   * Empty/missing field = inherit the content type display. See
   * resolveNodeOverrides().
   */
  public const TOOLS_FIELD = 'field_leaflet_tools';

  /**
   * Field names of the per-node control position overrides.
   */
  public const GEOMAN_POS_FIELD = 'field_leaflet_geoman_pos';
  public const LOCATE_POS_FIELD = 'field_leaflet_locate_pos';

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
    protected LoggerInterface $logger,
    protected EntityTypeManagerInterface $entityTypeManager,
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
      $container->get('logger.factory')->get('leaflet_edit'),
      $container->get('entity_type.manager'),
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
        // Opérations Turf disponibles (pour l'instant : simplify ;
        // concatenate viendra s'ajouter ici).
        'turf' => [
          'operations' => [
            'simplify' => 'simplify',
          ],
          'simplify' => [
            'tolerance' => 0.0001,
            'high_quality' => TRUE,
          ],
        ],
        'arrowheads' => [
          'frequency_mode' => 'endonly',
          'frequency_value' => '',
          'size' => '30px',
          'yawn' => 50,
          'fill' => TRUE,
        ],
        // Un interrupteur par outil JS. Les clés sont des identifiants
        // SANS point (interdit dans les clés de config Drupal) ; la
        // correspondance vers le suffixe de librairie
        // 'leaflet_edit/<suffix>' est définie dans toolLibraryMap().
        // 'core' (leaflet-edit) est toujours chargé, non configurable.
        // NOTE : 'styleeditor' n'est plus proposée ici : la librairie est
        // chargée en dur par LeafletEditService pour le menu métier
        // (usage programmatique : L.control.styleEditor() + enable(layer),
        // sans bouton carte). Voir ensureStyleEditor().
        'tools' => [
          'geoman' => TRUE,
          'locatecontrol' => TRUE,
          'panel_layers' => TRUE,
          'notifications' => TRUE,
          'fullscreen' => TRUE,
          'ajax' => TRUE,
          'contextmenu' => TRUE,
          'control_window' => TRUE,
          'cascadebuttons' => TRUE,
          'distance_markers' => TRUE,
          'geometryutil' => TRUE,
          'turf' => TRUE,
          'togeojson' => TRUE,
          'slider' => TRUE,
          'arrowheads' => TRUE,
          'feature_control' => FALSE,
          'doubleclick' => FALSE,
          'toolbar' => FALSE,
          'select2' => FALSE,
          'dialog' => FALSE,
          'togpx' => TRUE,
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
    $availableMaps = static::getLeafletMaps();
    $displayKey = trim((string) ($settings['leaflet_map'] ?? ''));
    $displayLabel = $availableMaps[$displayKey]
      ?? $this->t('Invalid key "@key", fallback used at render time', ['@key' => $displayKey]);
    $summary[] = $this->t('Leaflet Map: @map', ['@map' => $displayLabel]);
    $summary[] = $this->t('Node overrides (win when set): @fields', [
      '@fields' => implode(', ', [self::BASEMAP_FIELD, self::TOOLS_FIELD, self::GEOMAN_POS_FIELD, self::LOCATE_POS_FIELD]),
    ]);
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

    // Effective values (inherited from the Default display outside it),
    // so the summary always shows what will actually run on the map.
    [$effectiveModuleSettings] = $this->resolveModuleSettings($settings);
    if ($this->viewMode !== 'default') {
      $summary[] = $this->t('Geoman/Turf/Arrowheads/Tools: inherited from the Default display (per-mode values, if any, are ignored).');
    }
    // Missing keys = display predating these settings: show the effective
    // behavior (defaults), mirroring the JS fallbacks.
    $turf = $effectiveModuleSettings['turf'] ?? [];
    $turfOps = array_keys(array_filter($turf['operations'] ?? ['simplify' => 'simplify']));
    $summary[] = $this->t('Turf operations: @ops (simplify tolerance: @tolerance, high quality: @hq)', [
      '@ops' => $turfOps ? implode(', ', $turfOps) : $this->t('none'),
      '@tolerance' => $turf['simplify']['tolerance'] ?? 0.0001,
      '@hq' => !empty($turf['simplify']['high_quality'] ?? TRUE) ? $this->t('on') : $this->t('off'),
    ]);

    $arrowheads = $effectiveModuleSettings['arrowheads'] ?? [];
    $summary[] = $this->t('Arrowheads: @frequency, size @size, yawn @yawn, @fill', [
      '@frequency' => $this->describeArrowheadsFrequency($arrowheads),
      '@size' => $arrowheads['size'] ?? '30px',
      '@yawn' => $arrowheads['yawn'] ?? 50,
      '@fill' => !empty($arrowheads['fill'] ?? TRUE) ? $this->t('filled') : $this->t('not filled'),
    ]);

    $tools = $effectiveModuleSettings['tools'] ?? [];
    $enabledToolIds = array_keys(array_filter($tools));
    $libraryMap = self::toolLibraryMap();
    $enabledLabels = [];
    foreach ($enabledToolIds as $toolId) {
      // Ignore les clés legacy (ex. 'styleeditor' sauvegardé avant retrait).
      if (!isset($libraryMap[$toolId])) {
        continue;
      }
      $enabledLabels[] = $libraryMap[$toolId];
    }
    $summary[] = $enabledLabels
      ? $this->t('JS tools (@n): @list', [
        '@n' => count($enabledLabels),
        '@list' => implode(', ', $enabledLabels),
      ])
      : $this->t('No JS tools enabled');

    return $summary;
  }

  /**
   * Returns the arrowheads frequency mode options.
   *
   * @return array<string, string>
   *   Frequency modes mapped to human labels.
   */
  protected function getArrowheadsFrequencyOptions(): array {
    return [
      'endonly' => $this->t('Single arrow at the end (direction of travel)')->render(),
      'allvertices' => $this->t('One arrow on each vertex')->render(),
      'count' => $this->t('N arrows evenly distributed (uses the value below)')->render(),
      'distance' => $this->t('Arrows spaced by distance (uses the value below, e.g. 500m)')->render(),
    ];
  }

  /**
   * Describes the configured arrowheads frequency in one line.
   *
   * @param array $arrowheads
   *   The arrowheads settings.
   *
   * @return string
   *   Human-readable frequency description.
   */
  protected function describeArrowheadsFrequency(array $arrowheads): string {
    $mode = $arrowheads['frequency_mode'] ?? 'endonly';
    $value = trim((string) ($arrowheads['frequency_value'] ?? ''));
    if ($mode === 'count') {
      return ((int) $value > 0 ? (int) $value : $this->t('invalid count')->render()) . ' arrows';
    }
    if ($mode === 'distance') {
      return $value !== '' ? $this->t('every @value', ['@value' => $value])->render() : $this->t('invalid distance')->render();
    }
    return (string) $mode;
  }

  /**
   * Returns the Turf operations available in the UI.
   *
   * @return array<string, string>
   *   Operation machine names mapped to human labels. 'concatenate' is
   *   listed for roadmap visibility but not implemented yet (safely
   *   ignored at runtime).
   */
  protected function getTurfOperationOptions(): array {
    return [
      'simplify' => $this->t('Simplify (Douglas-Peucker)')->render(),
      'concatenate' => $this->t('Concatenate (coming soon)')->render(),
    ];
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

    // Single source of truth: Geoman/Turf/Arrowheads are configured once
    // on the Default display and inherited at render time (see
    // resolveModuleSettings()). Hide them on other view modes so nobody
    // edits values that would be ignored. Saved per-mode values, if any,
    // are preserved untouched in configuration.
    $moduleSettingsAccess = $this->viewMode === 'default';
    $element['leaflet_edit']['geoman'] = [
      '#type' => 'details',
      '#title' => $this->t('Geoman Settings'),
      '#description' => $this->t('Draw buttons only: all editing lives in the business bar.'),
      '#access' => $moduleSettingsAccess,
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

    $element['leaflet_edit']['turf'] = [
      '#type' => 'details',
      '#title' => $this->t('Turf Settings'),
      '#description' => $this->t('Parameters of the Turf.js geoprocessing operations.'),
      '#access' => $moduleSettingsAccess,
    ];
    $element['leaflet_edit']['turf']['operations'] = [
      '#type' => 'checkboxes',
      '#title' => $this->t('Enabled operations'),
      '#options' => $this->getTurfOperationOptions(),
      '#default_value' => array_keys(array_filter($leafletEdit['turf']['operations'] ?? ['simplify' => 'simplify'])),
    ];
    $element['leaflet_edit']['turf']['simplify'] = [
      '#type' => 'details',
      '#title' => $this->t('Simplify'),
      '#open' => TRUE,
    ];
    $element['leaflet_edit']['turf']['simplify']['tolerance'] = [
      '#type' => 'number',
      '#title' => $this->t('Tolerance (degrees)'),
      '#description' => $this->t('Simplification tolerance in degrees. Smaller preserves more detail (current value is a good default for hiking tracks).'),
      '#min' => 0,
      '#max' => 1,
      '#step' => 0.00001,
      '#default_value' => $leafletEdit['turf']['simplify']['tolerance'] ?? 0.0001,
    ];
    $element['leaflet_edit']['turf']['simplify']['high_quality'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('High quality (slower, better result)'),
      '#default_value' => !empty($leafletEdit['turf']['simplify']['high_quality'] ?? TRUE),
    ];

    $element['leaflet_edit']['arrowheads'] = [
      '#type' => 'details',
      '#title' => $this->t('Arrowheads Settings'),
      '#description' => $this->t('Direction arrows shown by the "Flèches de sens" tools menu entry (leaflet-arrowheads).'),
      '#access' => $moduleSettingsAccess,
    ];
    $element['leaflet_edit']['arrowheads']['frequency_mode'] = [
      '#type' => 'select',
      '#title' => $this->t('Arrow distribution'),
      '#options' => $this->getArrowheadsFrequencyOptions(),
      '#default_value' => $leafletEdit['arrowheads']['frequency_mode'] ?? 'endonly',
    ];
    $element['leaflet_edit']['arrowheads']['frequency_value'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Distribution value'),
      '#description' => $this->t('Only used by the modes above: arrow count (e.g. 20) or spacing distance (e.g. 500m or 50px).'),
      '#default_value' => $leafletEdit['arrowheads']['frequency_value'] ?? '',
    ];
    $element['leaflet_edit']['arrowheads']['size'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Arrow size'),
      '#description' => $this->t('Pixels (e.g. 30px, constant on screen), meters (e.g. 300m, scales with zoom) or percent of the segment (e.g. 15%).'),
      '#default_value' => $leafletEdit['arrowheads']['size'] ?? '30px',
      '#required' => TRUE,
    ];
    $element['leaflet_edit']['arrowheads']['yawn'] = [
      '#type' => 'number',
      '#title' => $this->t('Opening angle (degrees)'),
      '#description' => $this->t('Width of the arrowhead opening. Larger angle = wider arrow.'),
      '#min' => 10,
      '#max' => 120,
      '#step' => 1,
      '#default_value' => $leafletEdit['arrowheads']['yawn'] ?? 50,
    ];
    $element['leaflet_edit']['arrowheads']['fill'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Filled arrows'),
      '#default_value' => !empty($leafletEdit['arrowheads']['fill'] ?? TRUE),
    ];

    $element['leaflet_edit']['tools'] = [
      '#type' => 'checkboxes',
      '#title' => $this->t('JS tools'),
      '#description' => $this->t('Leaflet plugins loaded on the map. Unchecked tools are not loaded at all (lighter pages). The core (leaflet-edit) is always loaded. StyleEditor is always loaded for the business menu (programmatic use, no map button). Configured once on the Default display, inherited by other view modes.'),
      '#options' => $this->getToolOptions(),
      // Comme Geoman/Turf/Arrowheads : source unique = display Default du
      // content type (héritage via resolveModuleSettings). Masqué hors
      // Default pour ne pas éditer des valeurs ignorées.
      '#access' => $moduleSettingsAccess,
      // Filtre les clés legacy (ex. 'styleeditor') absentes des options.
      '#default_value' => array_values(array_intersect(array_keys(array_filter($leafletEdit['tools'] ?? $this->defaultTools())), array_keys($this->getToolOptions()))),
    ];

    return $element;
  }

  /**
   * Maps tool IDs (config-safe, no dots) to library suffixes.
   *
   * @return array<string, string>
   *   Tool ID mapped to 'leaflet_edit/<suffix>' suffix.
   */
  public static function toolLibraryMap(): array {
    // NOTE : 'styleeditor' volontairement absent : librairie chargée en dur
    // par LeafletEditService (menu métier, sans bouton carte).
    return [
      'geoman' => 'leaflet-geoman',
      'locatecontrol' => 'leaflet-locatecontrol',
      'panel_layers' => 'leaflet-panel-layers',
      'notifications' => 'leaflet-notifications',
      'fullscreen' => 'leaflet-fullscreen',
      'ajax' => 'leaflet.ajax',
      'contextmenu' => 'leaflet-contextmenu',
      'control_window' => 'leaflet.control-window',
      'cascadebuttons' => 'leaflet.cascadebuttons',
      'distance_markers' => 'leaflet-distance-markers',
      'geometryutil' => 'leaflet.GeometryUtil',
      'turf' => 'leaflet.turf',
      'togeojson' => 'leaflet.togeojson',
      'slider' => 'leaflet-slider',
      'arrowheads' => 'leaflet-arrowheads',
      'feature_control' => 'leaflet-feature-control',
      'doubleclick' => 'leaflet-doubleclick-drupal',
      'toolbar' => 'leaflet-toolbar',
      'select2' => 'leaflet.select2',
      'dialog' => 'leaflet.Dialog',
      'togpx' => 'togpx',
    ];
  }

  /**
   * Returns the selectable JS tool options.
   *
   * Keys are config-safe IDs (no dots); see toolLibraryMap() for the
   * library suffix mapping.
   *
   * @return array<string, string>
   *   Tool machine names mapped to human labels.
   */
  protected function getToolOptions(): array {
    // NOTE : pas d'entrée 'styleeditor' : usage programmatique uniquement
    // via le menu métier (librairie toujours chargée, sans icône carte).
    return [
      'geoman' => $this->t('Geoman (draw / edit toolbar)')->render(),
      'locatecontrol' => $this->t('LocateControl (geolocation)')->render(),
      'panel_layers' => $this->t('PanelLayers (base maps + traces switcher)')->render(),
      'notifications' => $this->t('Notifications')->render(),
      'fullscreen' => $this->t('Fullscreen')->render(),
      'ajax' => $this->t('leaflet.ajax')->render(),
      'contextmenu' => $this->t('Contextmenu (right-click, desktop)')->render(),
      'control_window' => $this->t('Control.Window (modal dialogs)')->render(),
      'cascadebuttons' => $this->t('CascadeButtons (business bar)')->render(),
      'distance_markers' => $this->t('Distance markers')->render(),
      'geometryutil' => $this->t('GeometryUtil')->render(),
      'turf' => $this->t('Turf (simplify, cut, measure)')->render(),
      'togeojson' => $this->t('ToGeoJSON (GPX/KML parsing)')->render(),
      'slider' => $this->t('Slider (basemap opacity)')->render(),
      'arrowheads' => $this->t('Arrowheads (track direction)')->render(),
      'feature_control' => $this->t('FeatureControl (legacy)')->render(),
      'doubleclick' => $this->t('Doubleclick (legacy)')->render(),
      'toolbar' => $this->t('Toolbar (legacy, unmaintained)')->render(),
      'select2' => $this->t('Select2 (legacy)')->render(),
      'dialog' => $this->t('Dialog (legacy)')->render(),
      'togpx' => $this->t('ToGPX (client-side export)')->render(),
    ];
  }

  /**
   * Returns the default enabled tools.
   *
   * @return array<string, string>
   *   Enabled tool names keyed by tool name.
   */
  protected function defaultTools(): array {
    $defaults = [
      'geoman' => 'geoman',
      'locatecontrol' => 'locatecontrol',
      'panel_layers' => 'panel_layers',
      'notifications' => 'notifications',
      'fullscreen' => 'fullscreen',
      'ajax' => 'ajax',
      'contextmenu' => 'contextmenu',
      'control_window' => 'control_window',
      'cascadebuttons' => 'cascadebuttons',
      'distance_markers' => 'distance_markers',
      'geometryutil' => 'geometryutil',
      'turf' => 'turf',
      'togeojson' => 'togeojson',
      'slider' => 'slider',
      'arrowheads' => 'arrowheads',
      'togpx' => 'togpx',
    ];
    return $defaults;
  }

  /**
   * Resolves the basemap (fond de carte) key to render.
   *
   * Priority: per-node override field wins when set to a valid map key,
   * formatter (display / content type) setting otherwise, first available
   * map as last-resort fallback. Invalid keys are logged so a stale setting
   * (e.g. a map key removed from hook_leaflet_map_info) never fails
   * silently.
   *
   * @param array $settings
   *   The formatter settings.
   * @param \Drupal\Core\Entity\EntityInterface $entity
   *   The rendered entity (already translated).
   *
   * @return array{key: string, source: string}
   *   The map key and where it comes from: 'node', 'display' or 'fallback'.
   */
  protected function resolveBasemap(array $settings, $entity): array {
    $available = static::getLeafletMaps();

    $nodeKey = '';
    if ($entity->hasField(self::BASEMAP_FIELD) && !$entity->get(self::BASEMAP_FIELD)->isEmpty()) {
      $nodeKey = trim((string) $entity->get(self::BASEMAP_FIELD)->value);
    }
    if ($nodeKey !== '' && isset($available[$nodeKey])) {
      return ['key' => $nodeKey, 'source' => 'node'];
    }

    $displayKey = trim((string) ($settings['leaflet_map'] ?? ''));
    if ($displayKey !== '' && isset($available[$displayKey])) {
      if ($nodeKey !== '') {
        $this->logger->warning('Leaflet edit: node override "@node" is not a known map, display value "@display" used.', [
          '@node' => $nodeKey,
          '@display' => $displayKey,
        ]);
      }
      return ['key' => $displayKey, 'source' => 'display'];
    }

    $fallback = self::getDefaultSettings()['leaflet_map'] ?? '';
    if ($fallback === '' || !isset($available[$fallback])) {
      $fallback = (string) array_key_first($available);
    }
    $this->logger->warning('Leaflet edit: basemap keys invalid (node: "@node", display: "@display"), fallback to "@fallback".', [
      '@node' => $nodeKey,
      '@display' => $displayKey,
      '@fallback' => $fallback,
    ]);
    return ['key' => $fallback, 'source' => 'fallback'];
  }

  /**
   * Marker value meaning "no optional tool" in the per-node tools field.
   */
  private const TOOLS_NONE = '_none';

  /**
   * Valid control positions (same list as the display settings).
   *
   * @var string[]
   */
  private const VALID_POSITIONS = ['topleft', 'topright', 'bottomleft', 'bottomright'];

  /**
   * Applies per-node overrides onto the effective display settings.
   *
   * Priority (increasing): formatter defaults < content type display <
   * node fields. A node field only wins when it exists on the bundle AND
   * is non-empty; unknown values are ignored (and logged) so a stale
   * node value never breaks the map.
   * - TOOLS_FIELD: explicit enabled tool set (same IDs as the display
   *   'tools'). TOOLS_NONE alone means "no optional tool" (core +
   *   programmatic StyleEditor are always loaded anyway).
   * - GEOMAN_POS_FIELD / LOCATE_POS_FIELD: control position override.
   *
   * @param array $leafletEdit
   *   The effective leaflet_edit settings (formatter + display).
   * @param \Drupal\Core\Entity\EntityInterface $entity
   *   The rendered entity (already translated).
   *
   * @return array
   *   The settings with node overrides applied.
   */
  protected function resolveNodeOverrides(array $leafletEdit, $entity): array {
    if ($entity->hasField(self::TOOLS_FIELD) && !$entity->get(self::TOOLS_FIELD)->isEmpty()) {
      $values = [];
      foreach ($entity->get(self::TOOLS_FIELD) as $item) {
        $value = trim((string) ($item->value ?? ''));
        if ($value !== '') {
          $values[] = $value;
        }
      }
      if (in_array(self::TOOLS_NONE, $values, TRUE)) {
        $leafletEdit['tools'] = [];
      }
      else {
        $known = array_keys(self::toolLibraryMap());
        $ids = array_values(array_intersect($known, $values));
        if ($ids !== []) {
          $leafletEdit['tools'] = array_combine($ids, $ids);
        }
        elseif ($values !== []) {
          $this->logger->warning('Leaflet edit: node tools override holds only unknown IDs (@ids), display tools kept for @type @id.', [
            '@ids' => implode(', ', $values),
            '@type' => $entity->getEntityTypeId(),
            '@id' => $entity->id(),
          ]);
        }
      }
    }

    foreach ([self::GEOMAN_POS_FIELD => 'geoman', self::LOCATE_POS_FIELD => 'locatecontrol'] as $fieldName => $settingsKey) {
      if (!$entity->hasField($fieldName) || $entity->get($fieldName)->isEmpty()) {
        continue;
      }
      $position = trim((string) $entity->get($fieldName)->value);
      if (in_array($position, self::VALID_POSITIONS, TRUE)) {
        $leafletEdit[$settingsKey] = $leafletEdit[$settingsKey] ?? [];
        $leafletEdit[$settingsKey]['position'] = $position;
      }
      else {
        $this->logger->warning('Leaflet edit: node position override "@pos" is invalid for @key, display position kept for @type @id.', [
          '@pos' => $position,
          '@key' => $settingsKey,
          '@type' => $entity->getEntityTypeId(),
          '@id' => $entity->id(),
        ]);
      }
    }

    return $leafletEdit;
  }

  /**
   * Module settings inherited from the bundle default display.
   *
   * Geoman/Turf/Arrowheads/tools are behavior parameters, not per-view-mode
   * presentation: they ALWAYS come from the bundle default display (the
   * "content type" configuration). View modes are configured independently
   * in Drupal, so per-mode copies would silently diverge and content-type
   * changes would never reach node pages. Per-mode values, if any, are
   * ignored.
   *
   * @var string[]
   */
  private const INHERITED_KEYS = ['geoman', 'turf', 'arrowheads', 'tools'];

  /**
   * Resolves the module settings for the current render/summary.
   *
   * @param array $settings
   *   The formatter settings of the current view mode.
   * @param string|null $entityTypeId
   *   The rendered entity type (defaults to the field target type).
   * @param string|null $bundle
   *   The rendered bundle (defaults to the field target bundle).
   *
   * @return array{0: array, 1: string[]}
   *   The effective leaflet_edit settings and extra cache tags (the
   *   default display config, when inherited from).
   */
  protected function resolveModuleSettings(array $settings, ?string $entityTypeId = NULL, ?string $bundle = NULL): array {
    $leafletEdit = $settings['leaflet_edit'] ?? [];
    $entityTypeId = $entityTypeId ?? $this->fieldDefinition->getTargetEntityTypeId();
    $bundle = $bundle ?? (method_exists($this->fieldDefinition, 'getTargetBundle') ? $this->fieldDefinition->getTargetBundle() : NULL);
    if ($this->viewMode === 'default' || $entityTypeId !== 'node' || !$bundle) {
      return [$leafletEdit, []];
    }
    try {
      $defaultDisplay = $this->entityTypeManager
        ->getStorage('entity_view_display')
        ->load('node.' . $bundle . '.default');
      if (!$defaultDisplay) {
        return [$leafletEdit, []];
      }
      $component = $defaultDisplay->getComponent($this->fieldDefinition->getName());
      // Only inherit from the same formatter to avoid mixing configs.
      if (($component['type'] ?? '') !== $this->getPluginId() || !isset($component['settings']['leaflet_edit'])) {
        return [$leafletEdit, []];
      }
      $defaults = $component['settings']['leaflet_edit'];
      foreach (self::INHERITED_KEYS as $key) {
        if (isset($defaults[$key])) {
          $leafletEdit[$key] = $defaults[$key];
        }
      }
      return [$leafletEdit, $defaultDisplay->getCacheTags()];
    }
    catch (\Exception) {
      return [$leafletEdit, []];
    }
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
    // Hérite les réglages Geoman/Turf/Arrowheads de l'affichage default
    // du content type (source unique de vérité).
    [$leafletEditSettings, $inheritedTags] = $this->resolveModuleSettings($settings, $entity->getEntityTypeId(), $entity->bundle());
    $settings['leaflet_edit'] = $leafletEditSettings;

    $settings['leaflet_edit']['permissions'] = [
      'configure' => $this->currentUser->hasPermission('administer leaflet edit'),
      'edit' => $this->currentUser->hasPermission('edit leaflet tracks'),
      'add' => $this->currentUser->hasPermission('add leaflet tracks'),
      'save' => $this->currentUser->hasPermission('save leaflet tracks'),
      'exportGPX' => $this->currentUser->hasPermission('export leaflet tracks to gpx'),
      'importGPX' => $this->currentUser->hasPermission('import leaflet tracks from gpx'),
      'read' => $this->currentUser->hasPermission('view geofile traces'),
    ];

    // Priorité croissante des settings : formatter (defaultSettings) <
    // content type (display Default, hérité ci-dessus) < node (champs).
    // Seuls les champs présents ET remplis surchargent le display.
    $settings['leaflet_edit'] = $this->resolveNodeOverrides($settings['leaflet_edit'], $entity);

    // Basemap resolution: per-node override wins, display setting otherwise,
    // hard fallback to a valid map so a stale key never renders nothing.
    $basemap = $this->resolveBasemap($settings, $entity);
    $map = leaflet_map_get_info($basemap['key']);
    if (empty($map)) {
      $this->logger->warning('Leaflet edit: basemap "@key" (@source) has no definition, map not rendered for @type @id.', [
        '@key' => $basemap['key'],
        '@source' => $basemap['source'],
        '@type' => $entityType,
        '@id' => $entityId,
      ]);
      return [];
    }
    $map['id'] = Html::getUniqueId("leaflet_map_{$entityType}_{$bundle}_{$entityId}_{$field->getName()}");
    $map['geofield_cardinality'] = $this->fieldDefinition->getFieldStorageDefinition()->getCardinality();
    // Outils JS activés (config du formatter) -> transmis au service qui
    // attache uniquement les librairies correspondantes + exposés au JS
    // (init.drupal.js monte chaque outil sous condition). Les IDs de
    // config sont convertis en suffixes de librairie via toolLibraryMap().
    $enabledToolIds = array_keys(array_filter($settings['leaflet_edit']['tools'] ?? []));
    $libraryMap = self::toolLibraryMap();
    $enabledTools = [];
    foreach ($enabledToolIds as $toolId) {
      if (isset($libraryMap[$toolId])) {
        $enabledTools[] = $libraryMap[$toolId];
      }
    }
    $map['leaflet_edit_tools'] = $enabledTools;
    $settings['leaflet_edit']['tools_enabled'] = $enabledTools;
    $this->setAdditionalMapOptions($map, $settings);

    $features = [];
    $cacheTags = array_merge($entity->getCacheTags(), $inheritedTags);
    // Nouveau modèle : le field référence des entités geofile_trace par ID.
    // La géométrie est chargée via les endpoints bbox (latest revision par
    // défaut), JAMAIS via le pipeline features du module leaflet :
    // $features reste vide pour leafletRenderMap(), sinon
    // Drupal.Leaflet.create_geometry() reçoit un type inconnu ('trace')
    // et lève "The provided object is not a Layer".
    // On expose les métadonnées légères au JS métier via leaflet_edit.
    $traceMeta = [];
    foreach ($items as $item) {
      $tid = (int) ($item->target_id ?? 0);
      if ($tid <= 0) {
        continue;
      }
      $traceMeta[] = $tid;
      $cacheTags[] = 'geofile_trace:' . $tid;
    }

    if ($traceMeta === []) {
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
    // IDs des traces rattachées (métadonnées légères pour le JS métier ;
    // la géométrie arrive via les endpoints bbox).
    $build['#attached']['drupalSettings'][$build['#map_id']]['leaflet_edit']['trace_ids'] = $traceMeta;
    $build['#attached']['drupalSettings'][$build['#map_id']]['leaflet_edit']['nid'] = $entityId;
    // Resolved basemap, for debugging and for JS (panel "Cartes" label).
    $build['#attached']['drupalSettings'][$build['#map_id']]['leaflet_edit']['basemap'] = $basemap;
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
    // NOTE : le token CSRF est lié au chemin EXACT de la route appelée
    // (CsrfAccessCheck valide contre 'leaflet-edit/trace/{tid}'). Le JS
    // génère donc le token par URL complète via le endpoint csrf-token.
    $csrfToken = \Drupal::csrfToken();
    $build['#attached']['drupalSettings'][$build['#map_id']]['leaflet_edit']['endpoints'] = [
      'traces' => '/leaflet-edit/traces/' . $entityId,
      'background' => '/leaflet-edit/background/' . $entityId,
      'files' => '/leaflet-edit/files/' . $entityId,
      'fileTraces' => '/leaflet-edit/files/' . $entityId,
      'updateTrace' => '/leaflet-edit/trace',
      'saveTrace' => '/leaflet-edit/trace',
      'createTrace' => '/leaflet-edit/trace',
      'csrfTokenUrl' => '/leaflet-edit/csrf-token?path=',
      'exportGpx' => '/leaflet-edit/export-gpx?token=' . $csrfToken->get('leaflet-edit/export-gpx'),
      'exportGpxMerge' => '/leaflet-edit/export-gpx-merge?token=' . $csrfToken->get('leaflet-edit/export-gpx-merge'),
    ];
    // Map definitions depend on hook_leaflet_map_info() implementations and
    // on leaflet_more_maps custom maps config: bust render cache on change.
    $cacheTags[] = 'config:leaflet_more_maps.settings';
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
    // Draw buttons only. All editing (edit/move/cut/remove/rotate) lives
    // in the business bar (programmatic layer.pm calls), so the Geoman
    // edit block is intentionally not configurable anymore (forced off
    // in init.drupal.js, even for stale saved configs).
    return [
      'drawControls' => $this->t('Shows the draw block.')->render(),
      'drawMarker' => $this->t('Adds button to draw Markers.')->render(),
      'drawCircleMarker' => $this->t('Adds button to draw CircleMarkers.')->render(),
      'drawPolyline' => $this->t('Adds button to draw Line.')->render(),
      'drawRectangle' => $this->t('Adds button to draw Rectangle.')->render(),
      'drawPolygon' => $this->t('Adds button to draw Polygon.')->render(),
      'drawCircle' => $this->t('Adds button to draw Circle.')->render(),
      'drawText' => $this->t('Adds button to draw Text.')->render(),
      'oneBlock' => $this->t('All buttons will be displayed as one block.')->render(),
      'customControls' => $this->t('Shows the custom block.')->render(),
    ];
  }

}
