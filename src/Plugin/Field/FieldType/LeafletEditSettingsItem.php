<?php

declare(strict_types=1);

namespace Drupal\leaflet_edit\Plugin\Field\FieldType;

use Drupal\Core\Field\Attribute\FieldType;
use Drupal\Core\Field\FieldItemBase;
use Drupal\Core\Field\FieldStorageDefinitionInterface;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\Core\TypedData\DataDefinition;

/**
 * Stores per-map Leaflet Edit preferences as a JSON object.
 *
 * Single 'value' text column holding the 'leaflet_edit' settings sections
 * (click tolerance, controls, Geoman, Turf, Arrowheads) that override the
 * content type display at render time. Tools, control positions and
 * basemap keep their dedicated fields and are never stored here. An empty
 * value means "inherit everything from the content type".
 */
#[FieldType(
  id: 'leaflet_edit_settings',
  label: new TranslatableMarkup('Leaflet Edit settings'),
  description: new TranslatableMarkup('Serialized Leaflet Edit map preferences (per-map override of the content type settings).'),
  default_widget: 'leaflet_edit_settings_widget',
)]
class LeafletEditSettingsItem extends FieldItemBase {

  /**
   * {@inheritdoc}
   */
  public static function propertyDefinitions(FieldStorageDefinitionInterface $field_definition): array {
    $properties['value'] = DataDefinition::create('string')
      ->setLabel(new TranslatableMarkup('Settings (JSON)'))
      ->setRequired(FALSE);
    return $properties;
  }

  /**
   * {@inheritdoc}
   */
  public static function schema(FieldStorageDefinitionInterface $field_definition): array {
    return [
      'columns' => [
        'value' => [
          'type' => 'text',
          'size' => 'big',
          'not null' => FALSE,
        ],
      ],
      'indexes' => [],
    ];
  }

  /**
   * {@inheritdoc}
   */
  public static function mainPropertyName(): ?string {
    return 'value';
  }

  /**
   * {@inheritdoc}
   */
  public function isEmpty(): bool {
    $value = $this->get('value')->getValue();
    if ($value === NULL) {
      return TRUE;
    }
    $value = trim((string) $value);
    return $value === '' || $value === '{}' || $value === '[]';
  }

}
