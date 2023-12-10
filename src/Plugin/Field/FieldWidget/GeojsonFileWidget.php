<?php

namespace Drupal\leaflet_edit\Plugin\Field\FieldWidget;

use Drupal\file\Plugin\Field\FieldWidget\FileWidget;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Field\FieldItemListInterface;

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

        // Add the field setting for the description field to the array, so that the process function can access it to see if it is enabled
        // $element['#field_description'] = $field_settings['field_description'];

        $element['trackfile'] = array (
          '#title' => 'Track File',
          '#type' => 'managed_file',
          '#weight' => 19,
        );

        $element['leaflet_style'] = array (
          '#title' => 'Test leaflet_style',
          '#type' => 'leaflet_style',
          '#weight' => 20,
          /* '#process' => [
            [get_class($this), 'setValues']
          ], */
        );

        $element['leaflet_style_mapping'] = array (
          '#title' => 'Style Mapping',
          '#type' => 'leaflet_style_mapping',
          '#weight' => 21,
        );
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
  public function addmoreCallback(array &$form, FormStateInterface $form_state) {
    return $form['names_fieldset'];
  }

  /**
   * Submit handler for the "add-one-more" button.
   *
   * Increments the max counter and causes a rebuild.
   */
  public function addOne(array &$form, FormStateInterface $form_state) {
    $name_field = $form_state->get('num_names');
    $add_button = $name_field + 1;
    $form_state->set('num_names', $add_button);
    // Since our buildForm() method relies on the value of 'num_names' to
    // generate 'name' form elements, we have to tell the form to rebuild. If we
    // don't do this, the form builder will not call buildForm().
    $form_state->setRebuild();
  }

  /**
   * Submit handler for the "remove one" button.
   *
   * Decrements the max counter and causes a form rebuild.
   */
  public function removeCallback(array &$form, FormStateInterface $form_state) {
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
