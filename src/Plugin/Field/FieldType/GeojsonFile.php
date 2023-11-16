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

    $settings['file_extensions'] = 'geojson';

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
        'description' => [
          'description' => 'A description of the file.',
          'type' => 'text',
        ],
      ],
      'indexes' => [
        'target_id' => ['target_id'],
      ],
      'foreign keys' => [
        'target_id' => [
          'table' => 'file_managed',
          'columns' => ['target_id' => 'fid'],
        ],
      ],
    ] + parent::schema($field_definition);
    return $schema;

    /* return [
      'columns' => [
        'target_id' => [
          'description' => 'The ID of the file entity.',
          'type' => 'int',
          'unsigned' => TRUE,
        ],
        'alt' => [
          'description' => "Alternative image text, for the image's 'alt' attribute.",
          'type' => 'varchar',
          'length' => 512,
        ],
        'title' => [
          'description' => "Image title text, for the image's 'title' attribute.",
          'type' => 'varchar',
          'length' => 1024,
        ],
        'width' => [
          'description' => 'The width of the image in pixels.',
          'type' => 'int',
          'unsigned' => TRUE,
        ],
        'height' => [
          'description' => 'The height of the image in pixels.',
          'type' => 'int',
          'unsigned' => TRUE,
        ],
      ],
      'indexes' => [
        'target_id' => ['target_id'],
      ],
      'foreign keys' => [
        'target_id' => [
          'table' => 'file_managed',
          'columns' => ['target_id' => 'fid'],
        ],
      ],
    ]; */
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
        $element['Style'] = [
          '#type' => 'details',
          '#title' => $this->t('Style'),
          '#open' => FALSE,
          '#weight' => 20,
        ];
        $element['Style']['stroke'] = [
          '#type' => 'checkbox',
          '#title' => $this->t('<em>Stroke</em> field'),
          '#default_value' => $settings['stroke'] ?? TRUE,
          '#description' => $this->t('Whether to draw stroke along the path. Set it to false to disable borders on polygons or circles.'),
          '#weight' => 1,
        ];
        $element['Style']['color'] = [
          '#type' => 'color',
          '#title' => $this->t('<em>Color</em> field'),
          '#default_value' => $settings['color'] ?? '#F00FE8',
          '#description' => $this->t('Stroke color.'),
          '#weight' => 2,
        ];
        $element['Style']['weight'] = [
          '#type' => 'number',
          '#title' => $this->t('<em>Weight</em> field'),
          '#default_value' => $settings['weight'] ?? 2,
          '#description' => $this->t('Stroke width in pixels.'),
          '#min' => 1,
          '#step' => 1,
          '#max' => 20,
          '#weight' => 3,
        ];
        $element['Style']['opacity'] = [
          '#type' => 'range',
          '#title' => $this->t('<em>Opacity</em> field'),
          '#default_value' => $settings['opacity'] ?? 1,
          '#description' => $this->t('Stroke opacity.'),
          '#min' => 0,
          '#max' => 1,
          '#step' => 0.1,
          '#weight' => 4,
        ];
        $element['Style']['linecap'] = [
          '#type' => 'select',
          '#title' => $this->t('<em>LineCap</em> field'),
          '#default_value' => $settings['linecap'] ?? 'round',
          '#description' => $this->t('A string that defines shape to be used at the end of the stroke.'),
          '#options' => [
            'butt' => 'Butt : indicates that the stroke for each subpath does not extend beyond its two endpoints.',
            'round' => 'Round : indicates that at the end of each subpath the stroke will be extended by a half circle with a diameter equal to the stroke width.',
            'square' => 'Square : indicates that at the end of each subpath the stroke will be extended by a rectangle with a width equal to half the width of the stroke and a height equal to the width of the stroke.',
          ],
          '#weight' => 5,
        ];
        $element['Style']['linejoin'] = [
          '#type' => 'select',
          '#title' => $this->t('<em>LineJoin</em> field'),
          '#default_value' => $settings['linejoin'] ?? 'round',
          '#description' => $this->t('A string that defines shape to be used at the corners of the stroke.'),
          '#options' => [
            'arcs' => 'Arcs : indicates that an arcs corner is to be used to join path segments.',
            'bevel' => 'Bevel : indicates that a bevelled corner is to be used to join path segments.',
            'miter' => 'Miter : indicates that a sharp corner is to be used to join path segments.',
            'miter-clip' => 'Miter-Clip : indicates that a sharp corner is to be used to join path segments.',
            'round' => 'Round : indicates that a round corner is to be used to join path segments.',
          ],
          '#weight' => 6,
        ];
        $element['Style']['dasharray'] = [
          '#type' => 'textfield',
          '#title' => $this->t('<em>dashArray</em> field'),
          '#default_value' => $settings['dasharray'] ?? NULL,
          '#description' => $this->t('A string that defines the stroke <a href="https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-linejoin>dash pattern</a>. Doesn\'t work on Canvas-powered layers in some old browsers.'),
          '#maxlength' => 64,
          '#pattern' => '([0-9]+)(,[0-9]+)*',
          '#weight' => 7,
        ];
        $element['Style']['dashoffset'] = [
          '#type' => 'textfield',
          '#title' => $this->t('<em>dashOffset</em> field'),
          '#default_value' => $settings['dashoffset'] ?? 0,
          '#description' => $this->t('A string that defines the <a href="https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-dashoffset">distance into the dash</a> pattern to start the dash.'),
          '#maxlength' => 64,
          '#pattern' => '([0-9]+)|([0-9]+%)',
          '#weight' => 8,
        ];
        $element['Style']['fill'] = [
          '#type' => 'checkbox',
          '#title' => $this->t('<em>Fill</em> field'),
          '#default_value' => $settings['fill'] ?? FALSE,
          '#description' => $this->t('Whether to fill the path with color. Set it to false to disable filling on polygons or circle'),
          '#weight' => 9,
        ];
        $element['Style']['fill_color'] = [
          '#type' => 'color',
          '#title' => $this->t('<em>Fill Color</em> field'),
          '#default_value' => $settings['fill_color'] ?? '#C7A8A8',
          '#description' => $this->t('Fill Color.'),
          '#weight' => 10,
        ];
        $element['Style']['fill_opacity'] = [
          '#type' => 'range',
          '#title' => $this->t('<em>Fill Opacity</em> field'),
          '#default_value' => $settings['fill_opacity'] ?? 0.2,
          '#description' => $this->t('Stroke opacity.'),
          '#min' => 0,
          '#max' => 1,
          '#step' => 0.1,
          '#weight' => 11,
        ];
        $element['Style']['fillrule'] = [
          '#type' => 'select',
          '#title' => $this->t('<em>Fill Rule</em> field'),
          '#default_value' => $settings['fillrule'] ?? 'evenodd',
          '#description' => $this->t('A string that defines <a href="https://developer.mozilla.org/docs/Web/SVG/Attribute/fill-rule">how the inside of a shape</a> is determined.'),
          '#options' => [
            'nonzero ' => 'Nonzero : determines the "insideness" of a point in the shape by drawing a ray from that point to infinity in any direction, and then examining the places where a segment of the shape crosses the ray',
            'evenodd' => 'Evenodd : determines the "insideness" of a point in the shape by drawing a ray from that point to infinity in any direction and counting the number of path segments from the given shape that the ray crosses.',
          ],
          '#weight' => 12,
        ];
    /* $settings = $this->getSettings();

    // Add maximum and minimum resolution settings.
    $max_resolution = explode('x', $settings['max_resolution']) + ['', ''];
    $element['max_resolution'] = [
      '#type' => 'item',
      '#title' => $this->t('Maximum image resolution'),
      '#element_validate' => [[static::class, 'validateResolution']],
      '#weight' => 4.1,
      '#description' => $this->t('The maximum allowed image size expressed as WIDTH×HEIGHT (e.g. 640×480). Leave blank for no restriction. If a larger image is uploaded, it will be resized to reflect the given width and height. Resizing images on upload will cause the loss of <a href="http://wikipedia.org/wiki/Exchangeable_image_file_format">EXIF data</a> in the image.'),
    ];
    $element['max_resolution']['x'] = [
      '#type' => 'number',
      '#title' => $this->t('Maximum width'),
      '#title_display' => 'invisible',
      '#default_value' => $max_resolution[0],
      '#min' => 1,
      '#field_suffix' => ' × ',
      '#prefix' => '<div class="form--inline clearfix">',
    ];
    $element['max_resolution']['y'] = [
      '#type' => 'number',
      '#title' => $this->t('Maximum height'),
      '#title_display' => 'invisible',
      '#default_value' => $max_resolution[1],
      '#min' => 1,
      '#field_suffix' => ' ' . $this->t('pixels'),
      '#suffix' => '</div>',
    ];

    $min_resolution = explode('x', $settings['min_resolution']) + ['', ''];
    $element['min_resolution'] = [
      '#type' => 'item',
      '#title' => $this->t('Minimum image resolution'),
      '#element_validate' => [[static::class, 'validateResolution']],
      '#weight' => 4.2,
      '#description' => $this->t('The minimum allowed image size expressed as WIDTH×HEIGHT (e.g. 640×480). Leave blank for no restriction. If a smaller image is uploaded, it will be rejected.'),
    ];
    $element['min_resolution']['x'] = [
      '#type' => 'number',
      '#title' => $this->t('Minimum width'),
      '#title_display' => 'invisible',
      '#default_value' => $min_resolution[0],
      '#min' => 1,
      '#field_suffix' => ' × ',
      '#prefix' => '<div class="form--inline clearfix">',
    ];
    $element['min_resolution']['y'] = [
      '#type' => 'number',
      '#title' => $this->t('Minimum height'),
      '#title_display' => 'invisible',
      '#default_value' => $min_resolution[1],
      '#min' => 1,
      '#field_suffix' => ' ' . $this->t('pixels'),
      '#suffix' => '</div>',
    ];

    // Remove the description option.
    unset($element['description_field']);

    // Add title and alt configuration options.
    $element['alt_field'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Enable <em>Alt</em> field'),
      '#default_value' => $settings['alt_field'],
      '#description' => $this->t('Short description of the image used by screen readers and displayed when the image is not loaded. Enabling this field is recommended.'),
      '#weight' => 9,
    ];
    $element['alt_field_required'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('<em>Alt</em> field required'),
      '#default_value' => $settings['alt_field_required'],
      '#description' => $this->t('Making this field required is recommended.'),
      '#weight' => 10,
      '#states' => [
        'visible' => [
          ':input[name="settings[alt_field]"]' => ['checked' => TRUE],
        ],
      ],
    ];
    $element['title_field'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Enable <em>Title</em> field'),
      '#default_value' => $settings['title_field'],
      '#description' => $this->t('The title attribute is used as a tooltip when the mouse hovers over the image. Enabling this field is not recommended as it can cause problems with screen readers.'),
      '#weight' => 11,
    ];
    $element['title_field_required'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('<em>Title</em> field required'),
      '#default_value' => $settings['title_field_required'],
      '#weight' => 12,
      '#states' => [
        'visible' => [
          ':input[name="settings[title_field]"]' => ['checked' => TRUE],
        ],
      ],
    ];

    // Add default_image element.
    // static::defaultImageForm($element, $settings);
    $element['default_image']['#description'] = $this->t("If no image is uploaded, this image will be shown on display and will override the field's default image.");
 */
    return $element;
  }
}

