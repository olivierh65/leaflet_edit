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
        $element['#field_description'] = $field_settings['field_description'];

        // Add the render array for our new field
        $element['Style'] = [
            '#type' => 'details',
            '#title' => $this->t('Style'),
            '#weight' => 20,
          ];
        $element['Style']['color'] = [
            '#type' => 'color',
            '#title' => $this->t('<em>Color</em> field'),
            '#default_value' => $field_settings['color'] ?? '',
            '#description' => $this->t('Color.'),
            '#weight' => 8,
        ];
        $element['Style']['fill_color'] = [
            '#type' => 'color',
            '#title' => $this->t('<em>Fill Color widget</em> field'),
            '#default_value' => $field_settings['fill_color'] ?? '',
            '#description' => $this->t('Fill Color widget.'),
            '#weight' => 8,
        ];
        // Return the updated widget
        return $element;

    }

     /**
     * {@inheritdoc}
     */
    public static function process($element, FormStateInterface $form_state, $form) {

        $item = $element['#value'];
        $item['fids'] = $element['fids']['#value'];

        $element['track_name'] = [
            '#type' => 'textfield',
            '#title' => t('Track name'),
            '#weight' => 19,
          ];
        $element['track_file'] = [
            '#type' => 'file',
            '#title' => t('Track file'),
            '#weight' => 19,
          ];
        // Add the render array for our new field
        $element['Style'] = [
            '#type' => 'details',
            '#title' => t('Style'),
            '#weight' => 20,
          ];
        $element['Style']['color'] = [
            '#type' => 'color',
            '#title' => t('<em>Color process </em> field'),
            '#default_value' => isset($item['Style']['color']) ? $item['Style']['color'] : '',
            '#description' => t('Color.'),
            '#weight' => 8,
        ];
        $element['Style']['fill_color'] = [
            '#type' => 'color',
            '#title' => t('<em>Fill Color process </em> field'),
            '#default_value' => isset($item['Style']['fill_color']) ? $item['Style']['fill_color'] : '',
            '#description' => t('Fill Color.'),
            '#weight' => 8,
        ];

        $element['description'] = array(
            '#title' => t('Description'),
            '#type' => 'textfield',
            '#default_value' => isset($item['description']) ? $item['description'] : '',
            '#description' => t('A description of the track.'),
            // #access renders to page only under certain conditions
            // $item[fids] (Does it have an image specified)
            // $element[#field_description] (is the #field_description setting set to 1?)
            '#access' => (bool) $item['fids'] && $element['#field_description'],
            '#maxlength' => '512',
            '#weight' => '-10',
        );

        // Return the processed image as per Parents method
        return parent::process($element, $form_state, $form);

    }

}
