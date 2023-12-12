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

    $field_element = NestedArray::getValue($form_state->getValues(), $element['#parents'], $input_exists);
    if (!$input_exists) {
      return;
    }

    if (isset($field_element)) {
      $item = $field_element;
    } else {
      $item = [];
    }

    /* if (isset($field_element['#value']['fids']) && count($field_element['#value']['fids'])===0) {
      // Don't display Style until a file is selected
      return $element;
    } */


      $element['Attribute'] = [
        '#type' => 'textfield',
        '#title' => t('Attribute'),
        '#default_value' => $item['Attribute'] ?? NULL,
        '#description' => t('Parameter '),
        '#maxlength' => 64,
        '#weight' => 1,
      ];
      $element['Style'] = [
        '#type' => 'leaflet_style',
        '#title' => t('Style Mapping'),
        '#weight' => 2,
      ];

    return $element;
  }
}
