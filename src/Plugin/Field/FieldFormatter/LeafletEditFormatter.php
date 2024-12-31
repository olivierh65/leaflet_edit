<?php

namespace Drupal\leaflet_edit\Plugin\Field\FieldFormatter;

use Drupal\Core\Entity\EntityFieldManagerInterface;
use Drupal\Core\Field\FormatterBase;
use Drupal\leaflet\Plugin\Field\FieldFormatter\LeafletDefaultFormatter;
use Drupal\leaflet_edit\LeafletEditService;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Utility\Token;
use Drupal\core\Render\Renderer;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Component\Utility\Html;
use Drupal\Core\Utility\LinkGeneratorInterface;

/**
 * Plugin implementation of the 'leaflet_default' formatter.
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
   * LeafletEditFormatter constructor.
   *
   * @param $plugin_id
   * @param $plugin_definition
   * @param \Drupal\Core\Field\FieldDefinitionInterface $field_definition
   * @param array $settings
   * @param $label
   * @param $view_mode
   * @param array $third_party_settings
   * @param \Drupal\leaflet_edit\LeafletEditService $leaflet_service
   * @param \Drupal\Core\Entity\EntityFieldManagerInterface $entity_field_manager
   * @param \Drupal\Core\Utility\Token $token
   * @param \Drupal\core\Render\Renderer $renderer
   * @param \Drupal\Core\Extension\ModuleHandlerInterface $module_handler
   * @param \Drupal\Core\Utility\LinkGeneratorInterface $link_generator
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
    Renderer $renderer,
    ModuleHandlerInterface $module_handler,
    LinkGeneratorInterface $link_generator
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
      $link_generator
    );
    $this->defaultSettings = self::getDefaultSettings();
    $this->leafletService = $leaflet_service;
    $this->token = $token;
    $this->renderer = $renderer;
    $this->moduleHandler = $module_handler;
    $this->link = $link_generator;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
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
      $container->get('link_generator')
    );
  }

  /**
   * {@inheritdoc}
   */
  public static function defaultSettings() {
    /* return [
      'size' => 60,
      'placeholder' => '',
    ] + parent::defaultSettings(); */
    $default = [
      'leaflet_edit' => [
        'leaflet' => [
          'tolerance' => 10,
        ],
        'locatecontrol' => [
          'control' => true,
          'position' => 'bottomright',
        ],
        'geoman' => [
          'control' => true,
          'position' => 'topleft',
          'options' => [
            'drawMarker' => "drawMarker",
            'drawPolyline' => "drawPolyline",
            'drawCircleMarker' => 0,
            'drawRectangle' => 0,
            'drawPolygon' => 0,
            'drawCircle' => 0,
            'draxText' => 0,
            'editMode' => 0,
            'dragMode' => 0,
            'cutPolygon' => 0,
            'removalMode' => 0,
            'rotateMode' => 0,
            'oneBlock' => 0,
            'drawControls' => 'drawControls',
            'editControls' => 0,
            'customControls' => 'customControls',
          ],
        ],
      ],
    ] + parent::defaultSettings();

    return $default;
  }


  /**
   * {@inheritdoc}
   */
  public function settingsSummary() {
    $summary = [];

    $settings = $this->getSettings();
    $summary[] = $this->t('Leaflet Map: @map', ['@map' => $settings['leaflet_map']]);
    $summary[] = $this->t(
      'Map height: @height @height_unit',
      [
        '@height' => $settings['height'],
        '@height_unit' => $settings['height_unit'],
      ],
    );

    $leaflet = $settings['leaflet_edit']['leaflet'];
    if (!empty($leaflet)) {
      $summary[] = $this->t('Click tolerance: @tolerance', ['@tolerance' => $leaflet['tolerance']]);
    } else {
      $summary[] = $this->t('No click tolerance');
    }
    $locatecontrol = $settings['leaflet_edit']['locatecontrol'];
    if (!empty($locatecontrol)) {
      $summary[] = $this->t('Locate Control: @control', ['@control' => $locatecontrol['control'] ? 'on' : 'off']);
    } else {
      $summary[] = $this->t('No Locate Control');
    }
    // $summary[] = $this->t('Locate Control position: @position', ['@position' => $this->getSetting('locatecontrol')['position']]);

    $geoman = $settings['leaflet_edit']['geoman'];
    if (!empty($geoman)) {
      $summary[] = $this->t('Geoman Control: @control', ['@control' => $geoman['control'] ? 'on' : 'off']);
    } else {
      $summary[] = $this->t('No Geoman Control');
    }

    return $summary;
  }

  /**
   * {@inheritdoc}
   */
  public function settingsForm(array $form, FormStateInterface $form_state) {

    $settings = $this->getSettings();

    $form['#tree'] = TRUE;
    $element = FormatterBase::settingsForm($form, $form_state);


    // Generate the Leaflet Map General Settings.
    $this->generateMapGeneralSettings($element, $settings);
    unset($element['gesture_handling']);

    $map_position_options = $settings['map_position'];
    $element['map_position'] = $this->generateMapPositionElement($map_position_options);
    $element['map_position']['zoomControlPosition']['#access'] = FALSE;
    $element['map_position']['zoom']['#access'] = FALSE;
    $element['map_position']['zoomFiner']['#access'] = FALSE;
    $element['map_position']['minZoom']['#access'] = false;
    $element['map_position']['maxZoom']['#access'] = false;
    // Don't disable zoomControl, not tested in js
    $element['map_position']['minZoom']['#default_value'] = 2;
    $element['map_position']['maxZoom']['#default_value'] = 18;

    // Set Map Geometries Options Element.
    // $this->setMapPathOptionsElement($element, $settings);

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
      '#description' => $this->t('Click tolerance in pixels'),
      '#min' => 0,
      '#max' => 50,
      '#step' => 1,
      '#default_value' => $this->getSetting('leaflet_edit')['tolerance']  ?? 10,
    ];


    $element['leaflet_edit']['locatecontrol'] = [
      '#type' => 'details',
      '#title' => $this->t('LocateControl Settings'),
    ];
    $element['leaflet_edit']['locatecontrol']['control'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Enable LocateControl'),
      '#description' => $this->t('Add LocateControl'),
      '#default_value' => $this->getSetting('leaflet_edit')['locatecontrol']['control']  ?? true,
    ];
    $element['leaflet_edit']['locatecontrol']['position'] = [
      '#type' => 'select',
      '#title' => $this->t('Control position.'),
      '#options' => [
        'topleft' => 'Top left',
        'topright' => 'Top right',
        'bottomleft' => 'Bottom left',
        'bottomright' => 'Bottom right',
      ],
      '#default_value' => $this->getSetting('leaflet_edit')['locatecontrol']['position'] ?? 'bottomright',
    ];

    $element['leaflet_edit']['geoman'] = [
      '#type' => 'details',
      '#title' => $this->t('Geoman Settings'),
    ];
    $element['leaflet_edit']['geoman']['control'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Enable Geoman functionality'),
      '#description' => $this->t('Add Geoman'),
      '#default_value' => $this->getSetting('leaflet_edit')['geoman']['control'] ?? true,
    ];
    $element['leaflet_edit']['geoman']['position'] = [
      '#type' => 'select',
      '#title' => $this->t('Control position.'),
      '#options' => [
        'topleft' => 'Top left',
        'topright' => 'Top right',
        'bottomleft' => 'Bottom left',
        'bottomright' => 'Bottom right',
      ],
      '#default_value' => $this->getSetting('leaflet_edit')['geoman']['position'] ?? 'topleft',
    ];
    $element['leaflet_edit']['geoman']['options'] = [
      '#type' => 'details',
      '#title' => $this->t('Geoman Options'),
    ];
    $element['leaflet_edit']['geoman']['options'] = [
      '#type' => 'checkboxes',
      '#title' => $this->t('Options'),
      '#description' => $this->t('Geoman Options'),
      '#options' => [
        'drawControls' => 'Shows the draw block.',
        'drawMarker' => 'Adds button to draw Markers.',
        'drawCircleMarker' => 'Adds button to draw CircleMarkers.',
        'drawPolyline' => 'Adds button to draw Line.',
        'drawRectangle' => 'Adds button to draw Rectangle.',
        'drawPolygon' => 'Adds button to draw Polygon.',
        'drawCircle' => 'Adds button to draw Circle.',
        'drawText' => 'Adds button to draw Text.',
        'editControls' => 'Shows the edit block.',
        'editMode' => 'Adds button to toggle Edit Mode for all layers.',
        'dragMode' => 'Adds button to toggle Drag Mode for all layers.',
        'cutPolygon' => 'Adds button to cut a hole in a Polygon or Line.',
        'removalMode' => 'Adds a button to remove layers.',
        'rotateMode' => 'Adds a button to rotate layers.',
        'oneBlock' => 'All buttons will be displayed as one block',
        'customControls' => 'Shows the custom block.',
      ],
      '#default_value' => $this->getSetting('leaflet_edit')['geoman']['options'] ?? ['drawMarker', 'drawPolyline', 'drawControls', 'customControls'],
    ];

    return $element;
  }

  /**
   * {@inheritdoc}
   */
  public function viewElements(FieldItemListInterface $items, $langcode) {

    // $res1 = parent::viewElements($items, $langcode);

    /* @var \Drupal\node\NodeInterface $entity */
    $entity = $items->getEntity();
    // Take the entity translation, if existing.
    /* @var \Drupal\Core\TypedData\TranslatableInterface $entity */
    if ($entity->hasTranslation($langcode)) {
      $entity = $entity->getTranslation($langcode);
    }

    $entity_type = $entity->getEntityTypeId();
    $bundle = $entity->bundle();
    $entity_id = $entity->id();
    /* @var \Drupal\Core\Field\FieldDefinitionInterface $field */
    $field = $items->getFieldDefinition();

    $settings = $this->getSettings();

    $settings['leaflet_edit']['permissions']['configure'] = \Drupal::currentUser()->hasPermission('LeafletEditor Configure');
    $settings['leaflet_edit']['permissions']['edit'] = \Drupal::currentUser()->hasPermission('LeafletEditor Edit');
    $settings['leaflet_edit']['permissions']['add'] = \Drupal::currentUser()->hasPermission('LeafletEditor Add');
    $settings['leaflet_edit']['permissions']['save'] = \Drupal::currentUser()->hasPermission('LeafletEditor Save');
    $settings['leaflet_edit']['permissions']['exportGPX'] = \Drupal::currentUser()->hasPermission('LeafletEditor Export_GPX');
    $settings['leaflet_edit']['permissions']['importGPX'] = \Drupal::currentUser()->hasPermission('LeafletEditor Import_GPX');
    $settings['leaflet_edit']['permissions']['read'] = \Drupal::currentUser()->hasPermission('restful get get_geojson');

    // Always render the map, even if we do not have any data.
    $map = leaflet_map_get_info($settings['leaflet_map']);

    // Add a specific map id.
    $map['id'] = Html::getUniqueId("leaflet_map_{$entity_type}_{$bundle}_{$entity_id}_{$field->getName()}");

    // Get and set the Geofield cardinality.
    $map['geofield_cardinality'] = $this->fieldDefinition->getFieldStorageDefinition()->getCardinality();

    // Set Map additional map Settings.
    $this->setAdditionalMapOptions($map, $settings);

    $results = [];
    $features = [];
    // foreach ($items as $delta => $item) {
    for ($i = 0; $i < $items->count(); $i++) {
      $item = $items->get($i);
      if (!empty($item->file)) {
        $fid = $item->file[0];
      }
      else {
        $fid = 0;
      }
      if ($fid > 0) {
        $feature['type'] = 'url';
        $feature['url'] = $this->leafletService->leafletProcessGeofieldFileUrl($fid, $entity);
        $feature['id'] = $fid;
        $feature['entity'] = $entity_id;
        $feature['description'] = $item->description;
        $feature['title'] = $entity->getTitle();
        $style = [];

        $_filename = $this->leafletService->leafletProcessGeofieldFilename($fid);
        if ($_filename) {
          $feature['filename'] = $_filename['filename'];
          $feature['extension'] = $_filename['extension'];
        } else {
          $feature['filename'] = "";
          $feature['extension'] = "";
        }
        $feature['style'] = json_encode($item->style_global['style']);
        if (isset($item->mapping)) {
          $feature['mapping'] = json_encode($item->mapping);
        } else {
          $feature['mapping'] = null;
        }

        $features[] = $feature;
      }
    }

    $js_settings = [
      'map' => $map,
      'features' => $features,
    ];

    // Allow other modules to add/alter the map js settings.
    $this->moduleHandler->alter('leaflet_default_map_formatter', $js_settings, $items);

    $map_height = !empty($settings['height']) ? $settings['height'] . $settings['height_unit'] : '';

    if (!empty($features)) {
      $mapsettings = $this->leafletService->leafletRenderMap($js_settings['map'], $js_settings['features'], $map_height);
      $mapsettings['#attached']['drupalSettings']['leaflet_edit'] = $settings['leaflet_edit'];
      $results[] = $mapsettings;
    }

    return $results;
  }
}
