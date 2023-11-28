<?php

namespace Drupal\leaflet_edit\Plugin\Field\FieldType;

use Drupal\Component\Utility\Random;
use Drupal\Core\Entity\EntityInterface;
use Drupal\Core\Field\FieldDefinitionInterface;
use Drupal\Core\Field\FieldStorageDefinitionInterface;
use Drupal\Core\File\Exception\FileException;
use Drupal\Core\File\FileSystemInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\StreamWrapper\StreamWrapperInterface;
use Drupal\Core\StringTranslation\TranslatableMarkup;
use Drupal\Core\TypedData\DataDefinition;
use Drupal\file\Entity\File;
use Drupal\file\Plugin\Field\FieldType\FileItem;
use Symfony\Component\Mime\MimeTypeGuesserInterface;
use Drupal\file\Plugin\Field\FieldFormatter;

/**
 * Plugin implementation of the 'Geojson' field type.
 *
 * @FieldType(
 *   id = "geojsonfile_field",
 *   label = @Translation("Geojson File"),
 *   description = @Translation("This field stores Geojson file and style."),
 *   category = @Translation("Reference"),
 *   default_widget = "geojsonfile_widget",
 *   default_formatter = "geojsonfile_formatter",
 *   list_class = "\Drupal\file\Plugin\Field\FieldType\FileFieldItemList",
 *   constraints = {"ReferenceAccess" = {}, "FileValidation" = {}},
 * )
 */
class GeoJsonFile extends FileItem {

  /**
* {@inheritdoc}
*/
public static function defaultStorageSettings() {
  $settings=parent::defaultStorageSettings();

  $settings['stroke'] = TRUE;
  $settings['color'] = '#F00FE8';
  $settings['weight'] = 2;
  $settings['opacity'] =  1;
  $settings['linecap'] = 'round';
  $settings['linejoin'] = 'round';
  $settings['dasharray'] = NULL;
  $settings['dashoffset'] =  0;
  $settings['fill'] = FALSE;
  $settings['fill_color'] = '#C7A8A8';
  $settings['fill_opacity'] =  0.2;
  $settings['fillrule'] = 'evenodd';
  return $settings;
  /* $def=[
    'color' => '#CC00AA',
    'fill_color' => '#BB00AA',
  ] + parent::defaultStorageSettings();
  return $def; */
}

  /**
   * {@inheritdoc}
   */
  public static function defaultFieldSettings() {
    // Set a default value for the field setting we are going to add to toggle whether the description field shows
    // These are used to determine what field settings are saved

    // Get the parent field settings
    $settings = parent::defaultFieldSettings();

    // Add our setting to show/hide the description field
    $settings['description_field'] = TRUE;

    $settings['file_extensions'] = 'geojson,gpx';

    $settings['stroke'] = TRUE;
  $settings['color'] = '#F00FE8';
  $settings['weight'] = 2;
  $settings['opacity'] =  1;
  $settings['linecap'] = 'round';
  $settings['linejoin'] = 'round';
  $settings['dasharray'] = NULL;
  $settings['dashoffset'] =  0;
  $settings['fill'] = FALSE;
  $settings['fill_color'] = '#C7A8A8';
  $settings['fill_opacity'] =  0.2;
  $settings['fillrule'] = 'evenodd';


    // unset($settings['description_field']);
    return $settings;
  }

    /**
   * {@inheritdoc}
   */
  public static function propertyDefinitions(FieldStorageDefinitionInterface $field_definition) {
    $properties = parent::propertyDefinitions($field_definition);


    /* unset($properties['display']);
    unset($properties['description']);

    $properties['alt'] = DataDefinition::create('string')
      ->setLabel(new TranslatableMarkup('Alternative text'))
      ->setDescription(new TranslatableMarkup("Alternative image text, for the image's 'alt' attribute."));

    $properties['title'] = DataDefinition::create('string')
      ->setLabel(new TranslatableMarkup('Title'))
      ->setDescription(new TranslatableMarkup("Image title text, for the image's 'title' attribute."));

    $properties['width'] = DataDefinition::create('integer')
      ->setLabel(new TranslatableMarkup('Width'))
      ->setDescription(new TranslatableMarkup('The width of the image in pixels.'));

    $properties['height'] = DataDefinition::create('integer')
      ->setLabel(new TranslatableMarkup('Height'))
      ->setDescription(new TranslatableMarkup('The height of the image in pixels.')); */

    $properties['stroke'] = DataDefinition::create('boolean')->setLabel('stroke');
    $properties['color'] = DataDefinition::create('string')->setLabel('color');
    $properties['weight'] = DataDefinition::create('integer')->setLabel('weight');
    $properties['opacity'] = DataDefinition::create('float')->setLabel('opacity');
    $properties['linecap'] = DataDefinition::create('string')->setLabel('linecap');
    $properties['linejoin'] = DataDefinition::create('string')->setLabel('linejoin');
    $properties['dasharray'] = DataDefinition::create('string')->setLabel('dasharray');
    $properties['dashoffset'] = DataDefinition::create('string')->setLabel('dashoffset');
    $properties['fill'] = DataDefinition::create('boolean')->setLabel('fill');
    $properties['fill_color'] = DataDefinition::create('string')->setLabel('fill_color');
    $properties['fill_opacity'] = DataDefinition::create('float')->setLabel('fill_opacity');
    $properties['fillrule'] = DataDefinition::create('string')->setLabel('fillrule');
    return $properties;
  }

  /**
   * {@inheritdoc}
   */
  public static function schema(FieldStorageDefinitionInterface $field_definition) {
    $schema= [
      'columns' => [
        'target_id' => [
          'description' => 'The ID of the file entity.',
          'type' => 'int',
          'unsigned' => TRUE,
        ],
        'description' => [
          'description' => 'A description of the file.',
          'type' => 'text',
        ],
        'stroke' => [
          'description' => 'stroke',
          'type' => 'int',
          'default' => 1,
          'size' => 'tiny',
        ],
        'color' => [
          'description' => 'color',
          'type' => 'varchar',
          'length' => 8,
        ],
        'weight' => [
          'description' => 'weight.',
          'type' => 'int',
          'unsigned' => TRUE,
        ],
        'opacity' => [
          'description' => 'opacity.',
          'type' => 'numeric',
        ],
        'linecap' => [
          'description' => 'linecap',
          'type' => 'varchar',
          'length' => 8,
          'not null' => FALSE,
        ],
        'linejoin' => [
          'description' => 'linejoin',
          'type' => 'varchar',
          'length' => 12,
        ],
        'dasharray' => [
          'description' => 'dasharray',
          'type' => 'varchar',
          'length' => 64,
        ],
        'dashoffset' => [
          'description' => 'dashoffset',
          'type' => 'varchar',
          'length' => 64,
        ],
        'fill' => [
          'description' => 'fill',
          'type' => 'int',
          'default' => 0,
          'size' => 'tiny',
        ],
        'fill_color' => [
          'description' => 'fill_color',
          'type' => 'varchar',
          'length' => 8,
          'default' => '#C7A8A8'
        ],
        'fill_opacity' => [
          'description' => 'fill_opacity.',
          'type' => 'numeric',
          'default' => 0.2,
        ],
        'fillrule' => [
          'description' => 'fillrule',
          'type' => 'varchar',
          'length' => 8,
          'default' => 'evenodd'
        ],
        'style_serialized' => [
          'type' => 'text',
          'size' => 'normal', // tiny | small | normal | medium | big
          'description' => 'store style as serialized string.',
        ],
        'Mapping' => [
            'type' => 'text',
            'size' => 'normal', // tiny | small | normal | medium | big
            'description' => 'store styls maps.',
        ],
      ],
      /* 'indexes' => [
        'target_id' => ['target_id'],
      ],
      'foreign keys' => [
        'target_id' => [
          'table' => 'file_managed',
          'columns' => ['target_id' => 'fid'],
        ],
      ], */
    ] + parent::schema($field_definition);
    return $schema;

  }

  /**
   * {@inheritdoc}
   */
  public function fieldSettingsForm(array $form, FormStateInterface $form_state) {
    // Get base form from FileItem.
    $element = parent::fieldSettingsForm($form, $form_state);

    // Get the current settings
    $settings = $this->getSettings();

    $element['description_field']['#default_value'] = TRUE;

        // Add the render array for our new field
        $element['leaflet_style'] = array (
          '#title' => 'Test leaflet_style',
          '#type' => 'leaflet_style',
          '#weight' => 20,
        );

        $element['leaflet_style_mapping'] = array (
          '#title' => 'Style Mapping',
          '#type' => 'leaflet_style_mapping',
          '#weight' => 21,
        );

    return $element;
  }

  public function preSave() {
    foreach ($this->values['leaflet_style']['Style'] as $key => $value) {
      $this->values[$key] = $value;
  }
  $this->values['Mapping'] = serialize($this->values['leaflet_style_mapping']['Mapping']);
    return parent::preSave();
  }

  public function submitForm(array&$form, FormStateInterface $form_state){
    parent::submitForm($form, $form_state);
  }

}

