<?php

declare(strict_types=1);

namespace Drupal\leaflet_edit\Plugin\Field\FieldWidget;

use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Field\Attribute\FieldWidget;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Core\Field\WidgetBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\leaflet_edit\LeafletEditSettingsFormTrait;
use Drupal\leaflet_edit\Plugin\Field\FieldFormatter\LeafletEditFormatter;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Edits the per-map Leaflet Edit preferences.
 *
 * Renders the exact same sections as the content type display settings
 * (see LeafletEditSettingsFormTrait), minus the tools section and the
 * control position selects, which keep their dedicated fields
 * (field_leaflet_tools, field_leaflet_geoman_pos,
 * field_leaflet_locate_pos). Values are stored as a JSON object; on
 * save, only the rendered sections are stored (round-trip stable).
 * An empty field inherits everything from the content type.
 */
#[FieldWidget(
  id: 'leaflet_edit_settings_widget',
  label: new TranslatableMarkup('Leaflet Edit settings'),
  description: new TranslatableMarkup('Same preferences as the content type display settings, minus tools and positions (dedicated fields).'),
  field_types: ['leaflet_edit_settings'],
)]
class LeafletEditSettingsWidget extends WidgetBase {

  use LeafletEditSettingsFormTrait;

  public function __construct(
    $plugin_id,
    $plugin_definition,
    FieldDefinitionInterface $field_definition,
    array $settings,
    array $third_party_settings,
    protected EntityTypeManagerInterface $entityTypeManager,
  ) {
    parent::__construct($plugin_id, $plugin_definition, $field_definition, $settings, $third_party_settings);
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
      $configuration['third_party_settings'],
      $container->get('entity_type.manager'),
    );
  }

  /**
   * {@inheritdoc}
   */
  public function formElement(FieldItemListInterface $items, $delta, array $element, array &$form, FormStateInterface $form_state): array {
    $stored = [];
    $raw = isset($items[$delta]) ? trim((string) ($items[$delta]->value ?? '')) : '';
    if ($raw !== '') {
      $decoded = json_decode($raw, TRUE);
      if (is_array($decoded)) {
        $stored = $decoded;
      }
    }
    // Effective values first (formatter defaults < content type display
    // < stored node values), mirroring the render-time resolution, so
    // the form always shows what will actually run on the map.
    $defaults = LeafletEditFormatter::defaultSettings()['leaflet_edit'] ?? [];
    $merged = array_replace_recursive($defaults, $this->getDisplayLeafletEditSettings(), $stored);

    $element += [
      '#type' => 'container',
      '#tree' => TRUE,
      '#attributes' => ['class' => ['leaflet-edit-settings-widget']],
    ];
    $element['leaflet'] = $this->buildLeafletSection($merged);
    $element['locatecontrol'] = $this->buildLocateControlSection($merged);
    $element['geoman'] = $this->buildGeomanSection($merged);
    $element['turf'] = $this->buildTurfSection($merged);
    $element['arrowheads'] = $this->buildArrowheadsSection($merged);
    // Positions keep their dedicated select fields: never rendered nor
    // stored here (round-trip stable by construction).
    unset($element['locatecontrol']['position'], $element['geoman']['position']);
    return $element;
  }

  /**
   * {@inheritdoc}
   */
  public function massageFormValues(array $values, array $form, FormStateInterface $form_state): array {
    $values = array_values($values);
    $first = reset($values);
    if (!is_array($first) || $first === []) {
      return [];
    }
    // Only the rendered sections (same keys as the content type form,
    // minus tools and positions).
    $allowed = ['leaflet', 'locatecontrol', 'geoman', 'turf', 'arrowheads'];
    $sections = array_intersect_key($first, array_flip($allowed));
    if ($sections === []) {
      return [];
    }
    $json = json_encode($sections, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === FALSE || $json === '') {
      return [];
    }
    return [['value' => $json]];
  }

  /**
   * Reads the 'leaflet_edit' settings of the bundle Default display.
   *
   * Looks up the first leaflet_edit_formatter component on the bundle
   * default view display (normally field_geofile_traces).
   *
   * @return array
   *   The display settings, or an empty array when unavailable.
   */
  protected function getDisplayLeafletEditSettings(): array {
    try {
      $entityTypeId = $this->fieldDefinition->getTargetEntityTypeId();
      $bundle = method_exists($this->fieldDefinition, 'getTargetBundle') ? $this->fieldDefinition->getTargetBundle() : NULL;
      if ($entityTypeId !== 'node' || !$bundle) {
        return [];
      }
      $display = $this->entityTypeManager
        ->getStorage('entity_view_display')
        ->load('node.' . $bundle . '.default');
      if (!$display) {
        return [];
      }
      foreach ($display->getComponents() as $component) {
        if (($component['type'] ?? '') === 'leaflet_edit_formatter' && isset($component['settings']['leaflet_edit']) && is_array($component['settings']['leaflet_edit'])) {
          return $component['settings']['leaflet_edit'];
        }
      }
    }
    catch (\Exception) {
    }
    return [];
  }

}
