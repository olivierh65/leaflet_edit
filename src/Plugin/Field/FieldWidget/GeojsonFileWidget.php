<?php

namespace Drupal\leaflet_edit\Plugin\Field\FieldWidget;

use Drupal\file\Plugin\Field\FieldWidget\FileWidget;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Field\FieldItemListInterface;
use Drupal\Component\Utility\NestedArray;
use GuzzleHttp\Psr7\Request as Psr7Request;
use Symfony\Component\HttpFoundation\Request;

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

    $item_name=$items->getDataDefinition()->getName();

    $field=$form_state->getValue($element['#field_name'])[$element['#delta']];
    if ($field) {
      $num_names=$field['mapping']['nb_attribut'] ?? 1;
    }
    else {
      $num_names = 1;
    }

    $num_names = $form_state->get([$element['#field_name'],$delta,'mapping','nb_attribut']) ?? 1;

    $input_exists = false;
    /* if ($form_state->getTriggeringElement()) {
      $field_element = NestedArray::getValue($form_state->getValues(), array_slice($form_state->getTriggeringElement()['#parents'], 0, 3), $input_exists);
    }
    if (is_array($field_element) && isset($field_element['nb_attribut'])) {
      $num_names = $field_element['nb_attribut'];
    } else {
      $num_names = 1;
    } */
    // Add the field setting for the description field to the array, so that the process function can access it to see if it is enabled
    // $element['#field_description'] = $field_settings['field_description'];

    if(isset($element['#default_value']['mappings'])) {
      $element['#default_value']['mapping']=unserialize($element['#default_value']['mappings']);
      $form_state->setValue([$element['#field_name'],$delta,'mapping'], unserialize($element['#default_value']['mappings']));
    }
    if(isset($element['#default_value']['styles'])) {
      $element['#default_value']['style']=unserialize($element['#default_value']['styles']);
      $form_state->setValue([$element['#field_name'],$delta,'style'], unserialize($element['#default_value']['styles']));
    }
    $element['style'] = [
      '#title' => 'Global style',
      '#type' => 'details',
      '#open' => false,
      // hide until a file is selected
      //'#access' => $file_selected ?? false,
      '#weight' => 199,
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
      '#weight' => 200,
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

    // save number of attributs mapping
    $form_state->setValue([$element['#field_name'],$element['#delta'],'mapping','nb_attribut'], $i);

    $element['mapping']['actions'] = [
      '#type' => 'actions',
    ];
    $class = get_class($this);
    # $element['mapping']['actions']['add_name' . $delta] = [
      $element['mapping']['actions']['add_name'] = [
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
      # $element['mapping']['actions']['remove_name' . $delta] = [
        $element['mapping']['actions']['remove_name'] = [
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
  public static function addmoreCallback(array &$form, FormStateInterface $form_state, Request $request) {
    // return $form['mapping'];
    $input_exists = FALSE;
    $field_element = NestedArray::getValue($form, array_slice($form_state->getTriggeringElement()['#array_parents'], 0, 4), $input_exists);
    //$field_element = NestedArray::getValue($form, array_slice($form_state->getTriggeringElement()['#array_parents'], 0, 3), $input_exists);
    // return $form['field_test_geojsonfile']['widget'][0]['mapping'];
    return $field_element;
  }

  /**
   * Submit handler for the "add-one-more" button.
   *
   * Increments the max counter and causes a rebuild.
   */
  public static function addOne(array &$form, FormStateInterface $form_state) {

    $input_exists = FALSE;
    // Use getTriggeringElement() to determine delta
    $parent=array_slice($form_state->getTriggeringElement()['#parents'], 0, 3);
    $nb_attribut_array=$parent;
    $nb_attribut_array[]='nb_attribut';

    $name_field = $form_state->get($nb_attribut_array) ?? 1;

    // $name_field = count($field_element['attribut']);
    $add_button = $name_field + 1;
    $form_state->set($nb_attribut_array, $add_button);

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

  public function massageFormValues(array $values, array $form, FormStateInterface $form_state) {
    foreach ($values as $key => $value) {
      if (empty($value['my_first_value'])) {
        unset($values[$key]['my_first_value']);
      }
      if (empty($value['my_other_value'])) {
        unset($values[$key]['my_other_value']);
      }
    }
    foreach ($values as $key => $value) {
      if (isset($value['style'])) {
        $values[$key]['styles'] = serialize($value['style']);
        unset($values[$key]['style']);

      }
      if (isset($value['mapping'])) {
        $values[$key]['mappings'] = serialize($value['mapping']);
        unset($values[$key]['mapping']);
      }
    }

    return parent::massageFormValues($values, $form, $form_state);
  }
}
