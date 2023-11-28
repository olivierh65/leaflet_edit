<?php

namespace Drupal\leaflet_edit\Element;

use Drupal\Core\Render\Element;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Component\Utility\NestedArray;

/**
 *
 * @FormElement("leaflet_style_mapping")
 */
class StyleMapping extends Element\FormElement {

  public function getInfo() {

    $class = get_class($this);
    return [
      '#input' => TRUE,
      /* '#element_validate' => [
        [$class, 'validateStyle'],
      ], */
      '#process' => [
        [$class, 'processStyle'],
      ],
      /* '#tree' => FALSE, */
    ];
  }

  public static function processStyle(&$element, FormStateInterface $form_state, &$complete_form) {

    $input_exists = FALSE;
    $values = NestedArray::getValue($form_state->getValues(), $element['#parents'], $input_exists);
    $config = \Drupal::config('leaflet_edit.settings');

    if (isset($values['Mapping'][0]['Style'])) {
      $item=$values['Mapping'][0]['Style'];
    }
    if (!$input_exists) {
      return;
    }

    $field_element = NestedArray::getValue($complete_form, array_slice($element['#array_parents'], 0, -1));
    if (isset ($field_element['#value']['Mapping'])) {
      $maps=unserialize($field_element['#value']['Mapping']);
      if (! $maps) {
        # If can't be deserialized, generate empty mappings
        $maps=['map1' => ""];
        for ($i=2; $i <= ($config->get('nb_mapping') ?? 2); $i++) {
          $maps['map' . $i] = "";
        }
      }
      else if (count($maps) > $config->get('nb_mapping')) {
        array_splice($maps, $config->get('nb_mapping')-count($maps));
      }
    }
    else {
      $maps=['map1' => ""];
      for ($i=2; $i <= ($config->get('nb_mapping') ?? 2); $i++) {
        $maps['map' . $i] = "";
      }
    }

    // Add the render array for our new field
/*     $element['Mapping'] = [
      '#type' => 'details',
      '#title' => t('Mapping'),
      '#open' => FALSE,
      '#weight' => 20,
    ];

    $i=1;
    foreach ($maps as $idx => $item) {
      $element['Mapping'][$idx] = [
        '#type' => 'details',
        '#title' => t('Mapping ' . $i),
        '#open' => FALSE,
        '#weight' => $i,
        '#tree' => TRUE,
      ];
      $element['Mapping'][$idx]['Attribute'] = [
        '#type' => 'textfield',
        '#title' => t('Map ' . $i),
        '#default_value' => isset($item[$idx]['attr']) ? $item[$idx]['attr'] : NULL,
        '#description' => t('Parameter '. $i),
        '#maxlength' => 64,
        '#weight' => 1,
      ];
      $element['Mapping'][$idx]['Style'] = [
        '#type' => 'leaflet_style',
        '#title' => t('Mapping Style'),
        '#open' => TRUE,
        '#description' => t('Style for this attribute'),
        '#weight' => 2,
      ];
      $i++;
    } */

    /* $element['Mapping'] = [
      '#type' => 'multivalue',
      '#title' => t('Mapping'),
      '#required' => FALSE,
      '#open' => FALSE,
        'Attribut' => [
          '#type' => 'textfield',
          '#title' => t('Attribut'),
          '#required' => FALSE,
          '#maxlength' => 64,
        ],
        'Style' => [
          '#type' => 'details',
            '#title' => t('Style Mapping'),
            '#open' => FALSE,
            'Color' => [
              '#type' => 'color',
              '#title' => t('<em>Color</em> field'),
              '#default_value' => isset($item['Color']) ? $item['Color'] : '#F00FE8',
              '#description' => t('Stroke color.'),
              '#weight' => 2,
            ],
            'Weight' => [
              '#type' => 'number',
              '#title' => t('<em>Weight</em> field'),
              '#default_value' => isset($item['Weight']) ? $item['Weight'] : 2,
              '#description' => t('Stroke width in pixels.'),
              '#min' => 1,
              '#step' => 1,
              '#max' => 20,
            ],
          ],
    ]; */

    $element['Mapping'] = [
      '#type' => 'details',
      '#title' => t('Mapping'),
      '#open' => FALSE,
      '#weight' => 20,
    ];

    $i=1;
    foreach ($maps as $idx => $item) {
      $element['Mapping'][$idx] = [
        '#type' => 'details',
        '#title' => t('Mapping ' . $i),
        '#open' => FALSE,
        '#weight' => $i,
        '#tree' => TRUE,
      ];
      $element['Mapping'][$idx]['Attribute'] = [
        '#type' => 'textfield',
        '#title' => t('Map ' . $i),
        '#default_value' => $item['Attribute'] ?? NULL,
        '#description' => t('Parameter '. $i),
        '#maxlength' => 64,
        '#weight' => 1,
      ];
      $element['Mapping'][$idx]['Style'] = [
        '#type' => 'details',
          '#title' => t('Style Mapping'),
          '#open' => FALSE,
          '#weight' => 2,
          'Stroke' => [
            '#type' => 'checkbox',
            '#title' => t('<em>Stroke</em> field'),
            '#default_value' => $item['Style']['Stroke'] ?? TRUE,
            '#description' => t('Whether to draw stroke along the path. Set it to false to disable borders on polygons or circles.'),
            '#weight' => 1,
          ],
          'Color' => [
            '#type' => 'color',
            '#title' => t('<em>Color</em> field'),
            '#default_value' => $item['Style']['Color'] ?? '#F00FE8',
            '#description' => t('Stroke color.'),
            '#weight' => 2,
          ],
          'Weight' => [
            '#type' => 'number',
            '#title' => t('<em>Weight</em> field'),
            '#default_value' => $item['Style']['Weight'] ?? 2,
            '#description' => t('Stroke width in pixels.'),
            '#min' => 1,
            '#step' => 1,
            '#max' => 20,
            '#weight' => 3,
          ],
          'Opacity' => [
            '#type' => 'range',
            '#title' => t('<em>Opacity</em> field'),
            '#default_value' => $item['Style']['Opacity'] ?? 1,
            '#description' => t('Stroke opacity.'),
            '#min' => 0,
            '#max' => 1,
            '#step' => 0.1,
            '#weight' => 4,
          ],
          'Dasharray' => [
            '#type' => 'textfield',
            '#title' => t('<em>dashArray</em> field'),
            '#default_value' => $item['Style']['Dasharray'] ?? NULL,
            '#description' => t('A string that defines the stroke <a href="https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-linejoin>dash pattern</a>. Doesn\'t work on Canvas-powered layers in some old browsers.'),
            '#maxlength' => 64,
            '#pattern' => '([0-9]+)(,[0-9]+)*',
            '#weight' => 5,
          ],
          'Dashoffset' => [
            '#type' => 'textfield',
            '#title' => t('<em>dashOffset</em> field'),
            '#default_value' => $item['Style']['Dashoffset'] ?? 0,
            '#description' => t('A string that defines the <a href="https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-dashoffset">distance into the dash</a> pattern to start the dash.'),
            '#maxlength' => 64,
            '#pattern' => '([0-9]+)|([0-9]+%)',
            '#weight' => 6,
          ],
          'Fill' => [
            '#type' => 'checkbox',
            '#title' => t('<em>Fill</em> field'),
            '#default_value' => $item['Style']['Fill'] ?? FALSE,
            '#description' => t('Whether to fill the path with color. Set it to false to disable filling on polygons or circle'),
            '#weight' => 6,
          ],
          'Fill_color' => [
            '#type' => 'color',
            '#title' => t('<em>Fill Color</em> field'),
            '#default_value' => $item['Style']['Fill_color'] ?? '#C7A8A8',
            '#description' => t('Fill Color.'),
            '#weight' => 7,
          ],
          'Fill_opacity' => [
            '#type' => 'range',
            '#title' => t('<em>Fill Opacity</em> field'),
            '#default_value' => $item['Style']['Fill_opacity'] ?? 0.2,
            '#description' => t('Stroke opacity.'),
            '#min' => 0,
            '#max' => 1,
            '#step' => 0.1,
            '#weight' => 8,
          ],
          'Fillrule' => [
            '#type' => 'select',
            '#title' => t('<em>Fill Rule</em> field'),
            '#default_value' => $item['Style']['Fillrule'] ?? 'evenodd',
            '#description' => t('A string that defines <a href="https://developer.mozilla.org/docs/Web/SVG/Attribute/fill-rule">how the inside of a shape</a> is determined.'),
            '#options' => [
              'nonzero ' => 'Nonzero : determines the "insideness" of a point in the shape by drawing a ray from that point to infinity in any direction, and then examining the places where a segment of the shape crosses the ray',
              'evenodd' => 'Evenodd : determines the "insideness" of a point in the shape by drawing a ray from that point to infinity in any direction and counting the number of path segments from the given shape that the ray crosses.',
            ],
            '#weight' => 9,
          ],
      ];
      $i++;
    }

  return $element;
}

  public static function validateStyle(&$element, FormStateInterface $form_state, &$complete_form) {

  }

  public function getPluginDefinition() {
    return parent::getPluginDefinition();
  }
}
