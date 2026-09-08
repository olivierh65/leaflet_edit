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
use Drupal\leaflet_edit\LeafletEditSettingsFormTrait;
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

  use LeafletEditSettingsFormTrait;

  /**
   * Field name of the per-node basemap override (see leaflet_edit_install).
   *
   * The INHERIT sentinel explicitly follows the content type setting.
   */
  public const BASEMAP_FIELD = 'field_leaflet_basemap';

  /**
   * Explicit "follow the content type" value for the per-node fields.
   *
   * Replaces the old implicit "empty = inherit": every field is required
   * and always holds an explicit value, so disabling an inherited option
   * is always expressible. Empty values on pre-existing nodes still
   * inherit dynamically (backward compatibility).
   */
  public const INHERIT = '_default';

  /**
   * Field name of the per-node tools override (explicit enabled set).
   *
   * New nodes start with an explicit snapshot of the content type tools
   * (see leaflet_edit_node_create()), so unchecking is possible. INHERIT
   * alone means dynamic inheritance. See resolveNodeOverrides().
   */
  public const TOOLS_FIELD = 'field_leaflet_tools';

  /**
   * Field names of the per-node control position overrides.
   */
  public const GEOMAN_POS_FIELD = 'field_leaflet_geoman_pos';
  public const LOCATE_POS_FIELD = 'field_leaflet_locate_pos';

  /**
   * Field name of the per-node Leaflet Edit preferences (JSON).
   *
   * Holds the 'leaflet_edit' settings sections (tolerance, controls,
   * Geoman, Turf, Arrowheads) as a JSON object, merged RECURSIVELY over
   * the display settings at render time (see resolveNodeOverrides()):
   * absent keys inherit, explicit values (including 0) win, so disabling
   * an inherited option is always expressible. Tools, control positions
   * and basemap keep their dedicated fields and are never stored here.
   * Empty field = inherit everything dynamically.
   */
  public const SETTINGS_FIELD = 'field_leaflet_settings';

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
          'contrast' => TRUE,
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
      '@fields' => implode(', ', [self::BASEMAP_FIELD, self::TOOLS_FIELD, self::GEOMAN_POS_FIELD, self::LOCATE_POS_FIELD, self::SETTINGS_FIELD]),
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
    $summary[] = $this->t('Arrowheads: @frequency, size @size, yawn @yawn, @fill, contrast @contrast', [
      '@frequency' => $this->describeArrowheadsFrequency($arrowheads),
      '@size' => $arrowheads['size'] ?? '30px',
      '@yawn' => $arrowheads['yawn'] ?? 50,
      '@fill' => !empty($arrowheads['fill'] ?? TRUE) ? $this->t('filled') : $this->t('not filled'),
      '@contrast' => !empty($arrowheads['contrast'] ?? TRUE) ? $this->t('on') : $this->t('off'),
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
    // Sections partagées avec le widget du champ field_leaflet_settings
    // (voir LeafletEditSettingsFormTrait) : structure et défauts
    // strictement identiques des deux côtés.
    $element['leaflet_edit']['leaflet'] = $this->buildLeafletSection($leafletEdit);
    $element['leaflet_edit']['locatecontrol'] = $this->buildLocateControlSection($leafletEdit);
    $element['leaflet_edit']['geoman'] = $this->buildGeomanSection($leafletEdit);
    $element['leaflet_edit']['turf'] = $this->buildTurfSection($leafletEdit);
    $element['leaflet_edit']['arrowheads'] = $this->buildArrowheadsSection($leafletEdit);
    $element['leaflet_edit']['tools'] = $this->buildToolsSection($leafletEdit);

    // Single source of truth: Geoman/Turf/Arrowheads/tools are configured
    // once on the Default display and inherited at render time (see
    // resolveModuleSettings()). Hide them on other view modes so nobody
    // edits values that would be ignored. Saved per-mode values, if any,
    // are preserved untouched in configuration.
    // Comme Geoman/Turf/Arrowheads : source unique = display Default du
    // content type (héritage via resolveModuleSettings). Masqué hors
    // Default pour ne pas éditer des valeurs ignorées.
    $moduleSettingsAccess = $this->viewMode === 'default';
    $element['leaflet_edit']['geoman']['#access'] = $moduleSettingsAccess;
    $element['leaflet_edit']['turf']['#access'] = $moduleSettingsAccess;
    $element['leaflet_edit']['arrowheads']['#access'] = $moduleSettingsAccess;
    $element['leaflet_edit']['tools']['#access'] = $moduleSettingsAccess;

    return $element;
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
      if ($nodeKey === self::INHERIT) {
        $nodeKey = '';
      }
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
   * node settings field (SETTINGS_FIELD, recursive merge) < dedicated
   * node fields (basemap, tools, positions). A node field only wins when
   * it exists on the bundle AND holds a concrete value (INHERIT or empty
   * fields fall back to the display dynamically; new nodes carry a
   * snapshot of the display settings, so they are explicit by default);
   * unknown values are ignored (and logged) so a stale node value never
   * breaks the map.
   * - TOOLS_FIELD: explicit enabled tool set (same IDs as the display
   *   'tools'). TOOLS_NONE alone means "no optional tool", INHERIT means
   *   "follow the content type" (both are exclusive, enforced at form
   *   validation; core + programmatic StyleEditor are always loaded
   *   anyway).
   * - GEOMAN_POS_FIELD / LOCATE_POS_FIELD: control position override
   *   (INHERIT follows the content type).
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
    // Per-map preferences field (JSON): merged RECURSIVELY over the
    // display settings (absent keys inherit, explicit values win —
    // including 0 which disables an inherited option). Tools, positions
    // and basemap keep their dedicated fields below (always applied
    // after, preserving existing maps behavior).
    if ($entity->hasField(self::SETTINGS_FIELD) && !$entity->get(self::SETTINGS_FIELD)->isEmpty()) {
      $raw = trim((string) ($entity->get(self::SETTINGS_FIELD)->value ?? ''));
      if ($raw !== '') {
        $decoded = json_decode($raw, TRUE);
        if (is_array($decoded) && $decoded !== []) {
          $leafletEdit = array_replace_recursive($leafletEdit, $decoded);
        }
      }
    }
    if ($entity->hasField(self::TOOLS_FIELD) && !$entity->get(self::TOOLS_FIELD)->isEmpty()) {
      $values = [];
      foreach ($entity->get(self::TOOLS_FIELD) as $item) {
        $value = trim((string) ($item->value ?? ''));
        if ($value !== '' && $value !== self::INHERIT) {
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
        // No concrete values (INHERIT alone or empty): display tools kept.
      }
    }

    foreach ([self::GEOMAN_POS_FIELD => 'geoman', self::LOCATE_POS_FIELD => 'locatecontrol'] as $fieldName => $settingsKey) {
      if (!$entity->hasField($fieldName) || $entity->get($fieldName)->isEmpty()) {
        continue;
      }
      $position = trim((string) $entity->get($fieldName)->value);
      if ($position === self::INHERIT) {
        continue;
      }
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

}
