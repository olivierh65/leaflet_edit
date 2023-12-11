<?php

namespace Drupal\leaflet_edit\Plugin\Field\FieldWidget;

use Drupal\file\Plugin\Field\FieldWidget\FileWidget;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Component\Utility\NestedArray;

/**
 * Provides the field widget for Symbol field.
 *
 * @FieldWidget(
 *   id = "geojsonfile_widget",
 *   label = @Translation("geojson File widget"),
 *   description = @Translation("An File field with a text field for a description"),
 *   field_types = {
 *     "geojsonfile_field"
 *   }
 * )
 */
class GeojsonFileWidget extends FileWidget {

  /**
   * {@inheritdoc}
   */
  public function formElement(FieldItemListInterface $items, $delta, array $element, array &$form, FormStateInterface $form_state) {
    // The formElement method returns the form for a single field widget (Used to render the form in the Admin Interface of Drupal)
    // We need to add our new field to this

    // Get the parents form elements
    $element = parent::formElement($items, $delta, $element, $form, $form_state);

    // Get the field settings
    $field_settings = $this->getFieldSettings();

    if ($form_state->getTriggeringElement() !== null) {
      if ($form_state->getTriggeringElement()['#type']) {
        $field_element = NestedArray::getValue($form_state->getValues(), array_slice($form_state->getTriggeringElement()['#parents'], 0, 3), $input_exists);
      } else {
        $field_element = NestedArray::getValue($form_state->getValues(), array_slice($form_state->getTriggeringElement()['#parents'], 0, 3), $input_exists);
      }
      $num_names = $field_element['mapping']['nb_attribut'] ?? 1;
      if (!$num_names) {
        $num_names = 1;
      }


      // $num_names=$element['#default_value']['mapping']['attribut']['count'] ?? count($element['#default_value']['mapping']['attribut']) ?? 1;
      if (isset($element['#default_value']['fids']) && $element[0]['#delta'] == $delta) {
        $file_selected = (count($element['#default_value']['fids']) > 0);
      }
    } else {
      $num_names = 1;
      if (isset($element['#default_value']['fids'])) {
        $file_selected = count($element['#default_value']['fids']) > 0;
      }
    }

    $a=$items->first()->getValue('mapping');
    if (isset($a['mapping']['nb_attribut'])) {
      $num_names=$a['mapping']['nb_attribut'] ?? 1;
    }
    else {
      $num_names = 1;
    }

    $c=$form_state->getValue($element['#field_name'])[$delta];
    $num_names=$c['mapping']['nb_attribut'] ?? 1;

    if(isset($field_element['nb_attribut'])) {
      $num_names=$field_element['nb_attribut'];
    }
    else {
      $num_names = 1;
    }
    // Add the field setting for the description field to the array, so that the process function can access it to see if it is enabled
    // $element['#field_description'] = $field_settings['field_description'];

    $element['style'] = [
      '#title' => 'Global style',
      '#type' => 'details',
      '#open' => false,
      // hide until a file is selected
      //'#access' => $file_selected ?? false,
      '#weight' => 19,
    ];

    $element['style']['leaflet_style'] = [
      '#title' => 'Test leaflet_style',
      '#type' => 'leaflet_style',
      '#weight' => 1,
      /* '#process' => [
            [get_class($this), 'setValues']
          ], */
    ];

    $element['mapping'] = [
      '#title' => 'Attribute style',
      '#type' => 'details',
      '#open' => false,
      '#prefix' => '<div id="names-fieldset-wrapper' . $delta . '">',
      '#suffix' => '</div>',
      // hide until a file is selected
      //'#access' => $file_selected ?? false,
      '#weight' => 20,
    ];

    // $num_names = ($element['mapping']['attribut']['count']) ?? 1;
    // Gather the number of names in the form already.

    for ($i = 0; $i < $num_names; $i++) {
      $element['mapping']['attribut'][$i] = [
        '#title' => 'Attribute ' . $i,
        '#type' => 'details',
        '#open' => false,
        '#weight' => $i,
      ];

      $element['mapping']['attribut'][$i]['leaflet_style_mapping'] = array(
        '#title' => 'Style Mapping',
        '#type' => 'leaflet_style_mapping',
        '#weight' => 1,
      );
    }
    $element['mapping']['attribut']['count'] = $i;
    $element['mapping']['nb_attribut'] = $i;

    $element['mapping']['actions'] = [
      '#type' => 'actions',
    ];
    $class = get_class($this);
    $element['mapping']['actions']['add_name' . $delta] = [
      '#type' => 'submit',
      '#value' => $this->t('Add one more'),
      '#submit' => [$class . '::addOne'],
      '#ajax' => [
        'callback' => $class . '::addmoreCallback',
        'wrapper' => 'names-fieldset-wrapper' . $delta,
      ],
    ];
    // If there is more than one name, add the remove button.
    if ($num_names > 1) {
      $element['mapping']['actions']['remove_name' . $delta] = [
        '#type' => 'submit',
        '#value' => $this->t('Remove one'),
        '#submit' => [$class . '::removeCallback'],
        '#ajax' => [
          'callback' => $class . '::addmoreCallback',
          'wrapper' => 'names-fieldset-wrapper' . $delta,
        ],
      ];
    }

    // Return the updated widget
    return $element;
  }

  /* public static function setValues($element, FormStateInterface $form_state, $form) {
      $a=$element;

    } */

  /**
   * {@inheritdoc}
   */
  public static function process($element, FormStateInterface $form_state, $form) {

    $item = $element['#value'];

    /* $element['leaflet_style'] = array (
          '#title' => 'Test leaflet_style',
          '#type' => 'leaflet_style',
          '#weight' => 20,
        ); */

    // Return the processed image as per Parents method
    return parent::process($element, $form_state, $form);
  }
  /* public function massageFormValues(array $values, array $form, FormStateInterface $form_state) {
      return $values;
    } */

  /**
   * Callback for both ajax-enabled buttons.
   *
   * Selects and returns the fieldset with the names in it.
   */
  public static function addmoreCallback(array &$form, FormStateInterface $form_state) {
    // return $form['mapping'];
    $input_exists = FALSE;
    $field_element = NestedArray::getValue($form, array_slice($form_state->getTriggeringElement()['#parents'], 0, -2), $input_exists);
    return $form['field_test_geojsonfile']['widget'][0]['mapping'];
    // return $field_element;
  }

  /**
   * Submit handler for the "add-one-more" button.
   *
   * Increments the max counter and causes a rebuild.
   */
  public static function addOne(array &$form, FormStateInterface $form_state) {
    $name_field = $form_state->get('num_names');
    $input_exists = FALSE;
    $field_element = NestedArray::getValue($form_state->getValues(), array_slice($form_state->getTriggeringElement()['#parents'], 0, 3), $input_exists);
    $name_field = $field_element['attribut']['count'] ?? 1;
    if ($name_field == 0) {
      $name_field = 1;
    }
    $name_field=count($field_element['attribut']);
    $add_button = $name_field + 1;
    $form_state->set('num_names', $add_button);

    $c = array_slice($form_state->getTriggeringElement()['#parents'], 0, 3);
    array_push($c, 'nb_attribut');
    NestedArray::setValue($form_state->GetValues(), $c, $add_button);

/*     $field_element['attribut']['count'] = $add_button;
    $c = array_slice($form_state->getTriggeringElement()['#parents'], 0, -2);
    array_push($c, 'attribut', 'count');
    NestedArray::setValue($form_state->getValues(), $c, $add_button);

    $c = array_slice($form_state->getTriggeringElement()['#parents'], 0, -2);
    array_push($c, 'nb_attribut');
    NestedArray::setValue($form_state->getValues(), $c, $add_button);


    $field=NestedArray::getValue($form, array_slice($form_state->getTriggeringElement()['#array_parents'], 0, 3));
    if (isset($field['#default_value']['mapping']['nb_attribut'])) {
      $name_field=$field['#default_value']['mapping']['nb_attribut'];
    }
    else {
      $name_field=1;
    }
    $add_button = $name_field + 1;
    $c = array_slice($form_state->getTriggeringElement()['#array_parents'], 0, -2);
    array_push($c, 'attribut', 'count');
    NestedArray::setValue($form, $c, $add_button);

    $c = array_slice($form_state->getTriggeringElement()['#array_parents'], 0, -2);
    array_push($c, 'nb_attribut');
    NestedArray::setValue($form, $c, $add_button);
    // Since our buildForm() method relies on the value of 'num_names' to
    // generate 'name' form elements, we have to tell the form to rebuild. If we
    // don't do this, the form builder will not call buildForm(). */
    $form_state->setRebuild();
  }

  /**
   * Submit handler for the "remove one" button.
   *
   * Decrements the max counter and causes a form rebuild.
   */
  public static function removeCallback(array &$form, FormStateInterface $form_state) {
    $name_field = $form_state->get('num_names');
    if ($name_field > 1) {
      $remove_button = $name_field - 1;
      $form_state->set('num_names', $remove_button);
    }
    // Since our buildForm() method relies on the value of 'num_names' to
    // generate 'name' form elements, we have to tell the form to rebuild. If we
    // don't do this, the form builder will not call buildForm().
    $form_state->setRebuild();
  }
}
