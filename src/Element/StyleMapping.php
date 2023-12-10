<?php

namespace Drupal\leaflet_edit\Element;

use Drupal\Core\Render\Element;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Component\Utility\NestedArray;
use Drupal\Core\Render\Element\FormElement;

/**
 *
 * @FormElement("leaflet_style_mapping")
 */
class StyleMapping extends FormElement {

  public function getInfo() {

    $class = get_class($this);
    return [
      '#input' => TRUE,
      '#process' => [
        [$class, 'processStyleMapping'],
      ],
    ];
  }

  public static function processStyleMapping(&$element, FormStateInterface $form_state, &$complete_form) {

    $input_exists = FALSE;
    $config = \Drupal::config('leaflet_edit.settings');

    $field_element = NestedArray::getValue($complete_form, array_slice($element['#array_parents'], 0, -1),$input_exists);
    if (!$input_exists) {
      return;
    }

    if (isset($field_element['#value']['Mapping'])) {
      $maps = unserialize($field_element['#value']['Mapping']);
      if (!$maps) {
        # If can't be deserialized, generate empty mappings
        $maps = ['map1' => ""];
        for ($i = 2; $i <= ($config->get('nb_mapping') ?? 2); $i++) {
          $maps['map' . $i] = "";
        }
      } else if (count($maps) > $config->get('nb_mapping')) {
        // array_splice($maps, $config->get('nb_mapping') - count($maps));
      }
    } else {
      $maps = ['map1' => ""];
      for ($i = 2; $i <= ($element['#value']['Mapping']['NbMap'] ?? $config->get('nb_mapping') ?? 2); $i++) {
        $maps['map' . $i] = "";
      }
    }

    if (isset($field_element['#value']['fids']) && count($field_element['#value']['fids'])===0) {
      // Don't display Style until a file is selected
      return $element;
    }


      $element['Attribute'] = [
        '#type' => 'textfield',
        '#title' => t('Map ' . $i),
        '#default_value' => $item['Attribute'] ?? NULL,
        '#description' => t('Parameter ' . $i),
        '#maxlength' => 64,
        '#weight' => 1,
      ];
      $element['Style'] = [
        '#type' => 'leaflet_style',
        '#title' => t('Style Mapping'),

      ];

    return $element;
  }
}
