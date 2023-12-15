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

    $item_name = $items->getDataDefinition()->getName();

    /* $input_exists = false;
    $attribut=$form_state->getValue([$element['#field_name'],$delta,'mapping','attribut'], $input_exists);

    if(isset($element['#default_value']['mappings']) && $attribut === false) {
      // $element['#default_value']['mapping']=unserialize($element['#default_value']['mappings']);
      $input_exists = false;
      $nb_attribut=$form_state->getValue([$element['#field_name'],$delta,'mapping','_nb_attribut'],$input_exists);
      // $form_state->setValue([$element['#field_name'],$delta,'mapping'], unserialize($element['#default_value']['mappings']));
      $element['#default_value']['mapping']=unserialize($element['#default_value']['mappings']);
      unset($element['#default_value']['mappings']);
      if ($nb_attribut) {
        // restaore orevius value
        $form_state->setValue([$element['#field_name'],$delta,'mapping','_nb_attribut'], $nb_attribut);
      }
    }
    // $num_names = $form_state->getValue([$element['#field_name'],$delta,'mapping','_nb_attribut']) ?? 1;
    // $form_state->setValue([$element['#field_name'],$delta,'mapping','_nb_attribut'], $num_names);
    $num_names = $form_state->getValue([$element['#field_name'],$delta,'mapping','_nb_attribut'],$input_exists);
    // $num_names=$element['#default_value']['mapping']['_nb_attribut'];
    $input_exists = false;
    $style=$form_state->getValue([$element['#field_name'],$delta,'style'], $input_exists);
    if(isset($element['#default_value']['styles']) && $style === false) {
      // $element['#default_value']['style']=unserialize($element['#default_value']['styles']);
      // $form_state->setValue([$element['#field_name'],$delta,'style'], unserialize($element['#default_value']['styles']));
      $element['#default_value']['style']=unserialize($element['#default_value']['styles']);
      unset($element['#default_value']['styles']);
    }
 */
    $num_names = $form_state->getValue([$element['#field_name'], $delta, 'mapping', '_nb_attribut']) ?? 1;
    if (!$num_names && isset($element['#default_value']['mappings'])) {
      $num_names = unserialize($element['#default_value']['mappings'])['_nb_attribut'] ?? 1;
      $form_state->setValue([$element['#field_name'], $delta, 'mapping', '_nb_attribut'], $num_names);
    } else if (!$num_names) {
      $num_names = 1;
      $form_state->setValue([$element['#field_name'], $delta, 'mapping', '_nb_attribut'], $num_names);
    }

    /* if(isset($element['#default_value']['mappings'])) {
  $num_names=unserialize($element['#default_value']['mappings'])['_nb_attribut'] ?? 1;
  $element['#default_value']['mapping']=unserialize($element['#default_value']['mappings']);
  $element['#default_value']['style']=unserialize($element['#default_value']['styles']);

} */


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
      '#value_callback' => [$this, 'styleUnserialize'],
    ];

    $element['mapping'] = [
      '#title' => 'Attribute style',
      '#type' => 'details',
      '#open' => false,
      '#prefix' => '<div id="mapping-fieldset-wrapper' . $delta . '">',
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
        '#description' => 'Mapping ' . $delta . ':' . $i,
        '#cardinality' => 10,
        '#weight' => 1,
        '#value_callback' => [$this, 'mappingUnserialize'],
      );
    }
    $element['mapping']['_nb_attribut'] = [
      '#type' => 'value',
      '#description' => 'number of attributs for delta ' . $delta,
      '#value' => $i,
    ];
    // save number of attributs mapping
    $form_state->setValue([$element['#field_name'], $element['#delta'], 'mapping', '_nb_attribut'], $i);

    $element['mapping']['actions'] = [
      '#type' => 'actions',
    ];
    $class = get_class($this);
    # $element['mapping']['actions']['add_name' . $delta] = [
    $element['mapping']['actions']['add_name'] = [
      '#type' => 'submit',
      '#value' => $this->t('Add one more'),
      '#submit' => [[$this, 'addOne']],
      '#description' => 'Add ' . $delta,
      '#name' => 'add_' . $delta,
      '#ajax' => [
        'callback' => $class . '::addmoreCallback',
        'wrapper' => 'mapping-fieldset-wrapper' . $delta,
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
          'wrapper' => 'mapping-fieldset-wrapper' . $delta,
        ],
      ];
    }

    // Return the updated widget
    return $element;
  }


  /**
   * Callback for both ajax-enabled buttons.
   *
   * Selects and returns the fieldset with the names in it.
   */
  public static function addmoreCallback(array &$form, FormStateInterface $form_state, Request $request) {
    // return $form['mapping'];
    $input_exists = FALSE;
    $field_element = NestedArray::getValue($form, array_slice($form_state->getTriggeringElement()['#array_parents'], 0, 4), $input_exists);
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
    $parent = array_slice($form_state->getTriggeringElement()['#parents'], 0, 3);
    $nb_attribut_array = $parent;
    $nb_attribut_array[] = '_nb_attribut';

    $name_field = $form_state->getValue($nb_attribut_array) ?? 1;

    // $name_field = count($field_element['attribut']);
    $add_button = $name_field + 1;
    $form_state->setValue($nb_attribut_array, $add_button);

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
    $parent = array_slice($form_state->getTriggeringElement()['#parents'], 0, 3);
    $nb_attribut_array = $parent;
    $nb_attribut_array[] = '_nb_attribut';

    $name_field = $form_state->getValue($nb_attribut_array) ?? 1;

    if ($name_field > 1) {
      $remove_button = $name_field - 1;
      $form_state->setValue($nb_attribut_array, $remove_button);
    }
    // Since our buildForm() method relies on the value of 'num_names' to
    // generate 'name' form elements, we have to tell the form to rebuild. If we
    // don't do this, the form builder will not call buildForm().
    $form_state->setRebuild();
  }

  public function massageFormValues(array $values, array $form, FormStateInterface $form_state) {

    $v = parent::massageFormValues($values, $form, $form_state);

    foreach ($v as $key => $value) {
      if (isset($value['style'])) {
        $v[$key]['styles'] = serialize($value['style']);
        // foreach ($value['style']['leaflet_style'] as $param_key => $param_value) {
        //   $v[$key][$param_key]=$param_value;
        // }
        // unset($values[$key]['style']);

      }
      if (isset($value['mapping'])) {
        $v[$key]['mappings'] = serialize($value['mapping']);
        // unset($values[$key]['mapping']);
      }
    }

    return $v;
    //return parent::massageFormValues($values, $form, $form_state);
  }

  /**
   * Form API callback: Processes a file_generic field element.
   *
   * Expands the file_generic type to include the description and display
   * fields.
   *
   * This method is assigned as a #process callback in formElement() method.
   */
  /* public static function process($element, FormStateInterface $form_state, $form) {
    $item = $element['#value'];
    $item['fids'] = $element['fids']['#value'];

  } */

  public static function mappingUnserialize($element, $input, $form_state) {
    $a = $element;
    if ($input) {
      return $input;
    }

    $a = $element;
    $data = array_slice($element['#parents'], 0, 2);

    $data[] = 'mappings';
    $a = unserialize($form_state->getValue($data));
    return $a['attribut'][array_slice($element['#parents'], 4, 1)[0]]['leaflet_style_mapping'];
  }

  public static function styleUnserialize($element, $input, $form_state) {
    if ($input) {
      return $input;
    }

    $a = $element;
    $data = array_slice($element['#parents'], 0, 2);

    $data[] = 'styles';
    $a = unserialize($form_state->getValue($data));
    return $a['leaflet_style'];
  }

  /**
   * Retrieves processing information about the element from $form_state.
   *
   * This method is static so that it can be used in static Form API callbacks.
   *
   * @param array $parents
   *   The array of #parents where the element lives in the form.
   * @param string $element_name
   *   The field name.
   * @param \Drupal\Core\Form\FormStateInterface $form_state
   *   The form state.
   *
   * @return array
   *   An array with the following key/value pairs:
   *   - items_count: The number of sub-elements to display for the element.
   *
   * @see \Drupal\Core\Field\WidgetBase::getWidgetState()
   */
  public static function getElementState(array $parents, string $element_name, FormStateInterface $form_state): ?array {
    $a = NestedArray::getValue($form_state->getStorage(), static::getElementStateParents($parents, $element_name));
    return $a;
  }



  /**
   * Stores processing information about the element in $form_state.
   *
   * This method is static so that it can be used in static Form API #callbacks.
   *
   * @param array $parents
   *   The array of #parents where the element lives in the form.
   * @param string $element_name
   *   The element name.
   * @param \Drupal\Core\Form\FormStateInterface $form_state
   *   The form state.
   * @param array $field_state
   *   The array of data to store. See getElementState() for the structure and
   *   content of the array.
   *
   * @see \Drupal\Core\Field\WidgetBase::setWidgetState()
   */
  public static function setElementState(array $parents, string $element_name, FormStateInterface $form_state, array $field_state): void {
    NestedArray::setValue($form_state->getStorage(), static::getElementStateParents($parents, $element_name), $field_state);
  }

  /**
   * Returns the location of processing information within $form_state.
   *
   * @param array $parents
   *   The array of #parents where the element lives in the form.
   * @param string $element_name
   *   The element name.
   *
   * @return array
   *   The location of processing information within $form_state.
   *
   * @see \Drupal\Core\Field\WidgetBase::getWidgetStateParents()
   */
  protected static function getElementStateParents(array $parents, string $element_name): array {
    // phpcs:disable
    // Element processing data is placed at
    // $form_state->get(['multivalue_form_element_storage', '#parents', ...$parents..., '#elements', $element_name]),
    // to avoid clashes between field names and $parents parts.
    // phpcs:enable
    return array_merge(
      ['multivalue_form_element_storage', '#parents'],
      $parents,
      ['#elements', $element_name],
    );
  }
}
