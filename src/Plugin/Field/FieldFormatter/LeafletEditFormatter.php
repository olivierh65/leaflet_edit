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
 *   label = @Translation("Leaflet edit map"),
 *   field_types = {
 *     "file",
 *     "geojsonfile_field"
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
    parent::__construct($plugin_id, $plugin_definition, $field_definition, $settings, $label,
                        $view_mode, $third_party_settings, $leaflet_service, $entity_field_manager, $token, $renderer,
                        $module_handler, $link_generator);
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
  public function settingsForm(array $form, FormStateInterface $form_state) {

    $settings = $this->getSettings();
    $form['#tree'] = TRUE;
    $elements = FormatterBase::settingsForm($form, $form_state);

    // Generate the Leaflet Map General Settings.
    $this->generateMapGeneralSettings($elements, $settings);

    // Generate the Leaflet Map Position Form Element.
    $map_position_options = $settings['map_position'];
    $elements['map_position'] = $this->generateMapPositionElement($map_position_options);

    // Set Map Geometries Options Element.
    $this->setMapPathOptionsElement($elements, $settings);

    return $elements;
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
      $item=$items->get($i);
      if (!empty($item->target_id)) {
        $feature['type'] = 'url';
        $feature['url'] = $this->leafletService->leafletProcessGeofieldFileUrl($item->target_id, $entity);
        $feature['id'] = $item->target_id;
        $feature['entity'] = $entity_id;
        $feature['description'] = $item->description;
        $feature['title'] = $entity->get('title')->getString('value');
        $style = [];
        if (! empty($entity->get('field_leaflet_edit_couleur')->getString('color'))) {
          $style['color'] = $entity->get('field_leaflet_edit_couleur')->getString('color');
        }
        if (! empty($entity->get('field_leaflet_edit_epaisseur')->getString('epaisseur'))) {
          $style['weight'] = $entity->get('field_leaflet_edit_epaisseur')->getString('epaisseur');
        }
        if (! empty($entity->get('field_leaflet_edit_opacite')->getString('opacite'))) {
          $style['opacity'] = $entity->get('field_leaflet_edit_opacite')->getString('opacite');
        }
        $feature['style'] = json_encode($style);

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
      $results[] = $this->leafletService->leafletRenderMap($js_settings['map'], $js_settings['features'], $map_height);
    }

    return $results;
  }

}
